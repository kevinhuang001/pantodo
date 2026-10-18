use chrono::{DateTime, SecondsFormat, Utc};
use serde::Serialize;
use serde_json::{json, Value};
use std::{fs, io::Write, path::PathBuf};
use uuid::Uuid;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub workspace: Option<Value>,
    pub generation: u64,
}

/// The native process owns lifecycle cutoffs. A cutoff invalidates queued renderer writes.
pub struct WorkspaceStore {
    path: PathBuf,
    snapshot: Snapshot,
}

fn millis(value: &Value) -> Option<i64> {
    value
        .as_str()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.timestamp_millis())
}

fn end_timer(workspace: &mut Value, end_ms: i64) -> bool {
    let Some(timer) = workspace.get("timer").filter(|v| v.is_object()).cloned() else {
        return false;
    };
    if let Some(start) = millis(&timer["startedAt"]) {
        let end = end_ms.max(start);
        if end > start {
            let stamp = DateTime::<Utc>::from_timestamp_millis(end)
                .unwrap()
                .to_rfc3339_opts(SecondsFormat::Millis, true);
            let record = json!({
                "id": Uuid::new_v4().to_string(), "taskId": timer["taskId"],
                "occurrenceKey": timer["occurrenceKey"],
                "startedAt": timer["startedAt"], "endedAt": stamp,
                "source": "timer", "note": "", "createdAt": stamp, "updatedAt": stamp, "deletedAt": null
            });
            workspace["timeEntries"]
                .as_array_mut()
                .expect("validated workspace")
                .push(record);
        }
    }
    workspace["timer"] = Value::Null;
    true
}

impl WorkspaceStore {
    pub fn open(path: PathBuf) -> Result<Self, String> {
        let workspace = if path.exists() {
            let data = fs::read(&path).map_err(|e| e.to_string())?;
            let value: Value =
                serde_json::from_slice(&data).map_err(|e| format!("Cannot read workspace: {e}"))?;
            validate(&value)?;
            Some(value)
        } else {
            None
        };
        let mut store = Self {
            path,
            snapshot: Snapshot {
                workspace,
                generation: 0,
            },
        };
        // A process restart never resumes a timer or counts time after the last native heartbeat.
        store.cutoff(Utc::now().timestamp_millis(), true)?;
        Ok(store)
    }

    pub fn snapshot(&self) -> Snapshot {
        self.snapshot.clone()
    }

    fn persist(&self, value: &Value) -> Result<(), String> {
        let parent = self
            .path
            .parent()
            .ok_or("Workspace has no parent directory")?;
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        let mut file = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
        serde_json::to_writer(file.as_file_mut(), value).map_err(|e| e.to_string())?;
        file.flush().map_err(|e| e.to_string())?;
        file.as_file().sync_all().map_err(|e| e.to_string())?;
        file.persist(&self.path).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn save(&mut self, mut workspace: Value, generation: u64) -> Result<Snapshot, String> {
        if generation != self.snapshot.generation {
            return Ok(self.snapshot());
        }
        validate(&workspace)?;
        if let Some(current) = &self.snapshot.workspace {
            let old = &current["timer"];
            let next = &mut workspace["timer"];
            if next.is_object()
                && old.is_object()
                && next["startedAt"] == old["startedAt"]
                && next["taskId"] == old["taskId"]
                && millis(&old["lastHeartbeatAt"]) > millis(&next["lastHeartbeatAt"])
            {
                next["lastHeartbeatAt"] = old["lastHeartbeatAt"].clone();
            }
        }
        self.persist(&workspace)?;
        self.snapshot.workspace = Some(workspace);
        Ok(self.snapshot())
    }

    pub fn cutoff(&mut self, now_ms: i64, last_heartbeat: bool) -> Result<bool, String> {
        let Some(mut next) = self.snapshot.workspace.clone() else {
            return Ok(false);
        };
        let end = if last_heartbeat {
            millis(&next["timer"]["lastHeartbeatAt"]).unwrap_or(now_ms)
        } else {
            now_ms
        };
        if !end_timer(&mut next, end) {
            return Ok(false);
        }
        self.persist(&next)?;
        self.snapshot.workspace = Some(next);
        self.snapshot.generation += 1;
        Ok(true)
    }

    pub fn heartbeat(&mut self, now_ms: i64) -> Result<bool, String> {
        let Some(mut next) = self.snapshot.workspace.clone() else {
            return Ok(false);
        };
        if !next["timer"]["startedAt"].is_string() {
            return Ok(false);
        }
        // Fallback if a host does not deliver its suspend notification.
        if millis(&next["timer"]["lastHeartbeatAt"]).is_some_and(|last| now_ms - last > 30_000) {
            return self.cutoff(now_ms, true);
        }
        next["timer"]["lastHeartbeatAt"] = json!(DateTime::<Utc>::from_timestamp_millis(now_ms)
            .unwrap()
            .to_rfc3339_opts(SecondsFormat::Millis, true));
        self.persist(&next)?;
        self.snapshot.workspace = Some(next);
        Ok(false)
    }
}

fn validate(value: &Value) -> Result<(), String> {
    for key in ["tasks", "projects", "tags", "views", "timeEntries"] {
        if !value[key].is_array() {
            return Err(format!("Invalid workspace field: {key}"));
        }
    }
    if !value["settings"].is_object() || !value["taskTags"].is_object() {
        return Err("Invalid workspace settings".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn sample() -> Value {
        json!({"tasks":[],"projects":[],"tags":[],"views":[],"settings":{},"taskTags":{},"timeEntries":[],
            "timer":{"taskId":"a","startedAt":"2026-10-19T10:00:00.000Z","lastHeartbeatAt":"2026-10-19T10:00:05.000Z"}})
    }
    fn at(s: &str) -> i64 {
        DateTime::parse_from_rfc3339(s).unwrap().timestamp_millis()
    }
    #[test]
    fn suspend_saves_exact_cutoff_and_rejects_a_queued_old_timer() {
        let temp = tempfile::tempdir().unwrap();
        let mut store = WorkspaceStore::open(temp.path().join("workspace.json")).unwrap();
        let original = sample();
        store.save(original.clone(), 0).unwrap();
        store.cutoff(at("2026-10-19T10:01:00Z"), false).unwrap();
        let saved = store.save(original, 0).unwrap();
        assert_eq!(saved.generation, 1);
        let data = saved.workspace.unwrap();
        assert!(data["timer"].is_null());
        assert_eq!(
            data["timeEntries"][0]["endedAt"],
            "2026-10-19T10:01:00.000Z"
        );
        assert_eq!(data["timeEntries"].as_array().unwrap().len(), 1);
    }
    #[test]
    fn restart_uses_the_last_heartbeat_and_never_resumes() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("workspace.json");
        let mut store = WorkspaceStore::open(path.clone()).unwrap();
        store.save(sample(), 0).unwrap();
        drop(store);
        let data = WorkspaceStore::open(path)
            .unwrap()
            .snapshot()
            .workspace
            .unwrap();
        assert!(data["timer"].is_null());
        assert_eq!(
            data["timeEntries"][0]["endedAt"],
            "2026-10-19T10:00:05.000Z"
        );
    }
    #[test]
    fn native_heartbeat_keeps_minimized_work_alive_and_detects_a_sleep_gap() {
        let temp = tempfile::tempdir().unwrap();
        let mut store = WorkspaceStore::open(temp.path().join("workspace.json")).unwrap();
        let original = sample();
        store.save(original.clone(), 0).unwrap();
        store.heartbeat(at("2026-10-19T10:00:10Z")).unwrap();
        store.save(original, 0).unwrap();
        assert_eq!(
            store.snapshot().workspace.unwrap()["timer"]["lastHeartbeatAt"],
            "2026-10-19T10:00:10.000Z"
        );
        assert!(store.heartbeat(at("2026-10-19T10:02:00Z")).unwrap());
        assert!(store.snapshot().workspace.unwrap()["timer"].is_null());
    }
    #[test]
    fn closing_a_paused_timer_does_not_add_break_time() {
        let temp = tempfile::tempdir().unwrap();
        let mut store = WorkspaceStore::open(temp.path().join("workspace.json")).unwrap();
        let mut value = sample();
        value["timer"]["startedAt"] = Value::Null;
        store.save(value, 0).unwrap();
        store.cutoff(at("2026-10-19T11:00:00Z"), false).unwrap();
        assert_eq!(
            store.snapshot().workspace.unwrap()["timeEntries"],
            json!([])
        );
    }
}
