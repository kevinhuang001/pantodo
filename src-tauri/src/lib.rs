pub mod workspace;

#[cfg(feature = "desktop")]
mod desktop {
    use super::workspace::{Snapshot, WorkspaceStore};
    use serde_json::Value;
    use std::sync::Mutex;
    use tauri::{Emitter, Listener, Manager};

    type Store = Mutex<WorkspaceStore>;

    #[tauri::command]
    fn load_workspace(state: tauri::State<'_, Store>) -> Result<Snapshot, String> {
        Ok(state.lock().map_err(|e| e.to_string())?.snapshot())
    }

    #[tauri::command]
    fn save_workspace(
        workspace: Value,
        generation: u64,
        state: tauri::State<'_, Store>,
    ) -> Result<Snapshot, String> {
        state
            .lock()
            .map_err(|e| e.to_string())?
            .save(workspace, generation)
    }

    fn cutoff(app: &tauri::AppHandle, last_heartbeat: bool) {
        let result = (|| -> Result<Snapshot, String> {
            let state = app.state::<Store>();
            let mut store = state.lock().map_err(|e| e.to_string())?;
            store.cutoff(chrono::Utc::now().timestamp_millis(), last_heartbeat)?;
            Ok(store.snapshot())
        })();
        match result {
            Ok(snapshot) => {
                let _ = app.emit("pantodo:workspace", snapshot);
            }
            Err(error) => {
                eprintln!("Cannot save timer: {error}");
                let _ = app.emit("pantodo:storage-error", error);
            }
        }
    }

    pub fn run() {
        tauri::Builder::default()
            .plugin(tauri_plugin_single_instance::init(|app, _, _| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }))
            .plugin(tauri_plugin_power_monitor::init())
            .invoke_handler(tauri::generate_handler![load_workspace, save_workspace])
            .setup(|app| {
                let path = app.path().app_data_dir()?.join("workspace.json");
                app.manage(Mutex::new(
                    WorkspaceStore::open(path).map_err(std::io::Error::other)?,
                ));
                let handle = app.handle().clone();
                app.listen("power-monitor://suspend", move |_| cutoff(&handle, false));
                let handle = app.handle().clone();
                app.listen("power-monitor://resume", move |_| cutoff(&handle, true));
                let handle = app.handle().clone();
                std::thread::spawn(move || loop {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    let result = {
                        let state = handle.state::<Store>();
                        let mut store = state.lock().unwrap_or_else(|e| e.into_inner());
                        store
                            .heartbeat(chrono::Utc::now().timestamp_millis())
                            .map(|changed| (changed, store.snapshot()))
                    };
                    match result {
                        Ok((true, snapshot)) => {
                            let _ = handle.emit("pantodo:workspace", snapshot);
                        }
                        Err(error) => {
                            let _ = handle.emit("pantodo:storage-error", error);
                        }
                        _ => {}
                    }
                });
                Ok(())
            })
            .on_window_event(|window, event| {
                if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                    cutoff(window.app_handle(), false);
                }
            })
            .build(tauri::generate_context!())
            .expect("Cannot start Pantodo")
            .run(|app, event| {
                if matches!(event, tauri::RunEvent::ExitRequested { .. }) {
                    cutoff(app, false);
                }
            });
    }
}

#[cfg(feature = "desktop")]
pub use desktop::run;
