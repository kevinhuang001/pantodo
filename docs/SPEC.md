# Pantodo — agreed specification

> October 2026 interface review: [UI-PREVIEW.md](UI-PREVIEW.md) records the new Create page and composed-panel direction. Its scoped UI changes supersede the earlier Inbox/navigation descriptions below; the remaining functional specification is unchanged.

Status: confirmed with the owner before implementation. Milestones are delivered in order, each with
screenshots, passing tests and a push to `main`.

## 1. Platform and stack

- Product name **Pantodo**, identifier `com.pantodo.desktop`, repository
  `git@github.com:kevinhuang001/pantodo.git`.
- Three desktop platforms: Linux, Windows, macOS.
- **Front end:** React + TypeScript + Vite (npm). Styling is **hand-written CSS** in a frosted-glass
  visual language — no Tailwind, no component library.
- **Back end:** a Rust `core` crate owns all business logic and SQLite (`rusqlite`, bundled). It is
  exposed to the UI through **Tauri IPC commands**; there is no localhost HTTP server.
- The front end depends only on a **`Bridge` interface**: Tauri IPC in the desktop app, a fixture
  implementation in the browser. That keeps `npm run dev` usable, and lets Playwright screenshot the
  real UI headlessly.
- **Tests:** Vitest for pure logic, `cargo test` for Rust, Playwright headless e2e against the Vite dev
  server, plus ESLint / Prettier and `cargo clippy -D warnings`.
- **CI:** GitHub Actions — three-OS packaging matrix, Linux e2e job uploading screenshots, and sync
  integration tests against a **real WebDAV server** started inside the job.

## 2. Data model (SQLite)

Every table carries `id` (uuid), `created_at`, `updated_at`, `deleted_at` — soft deletes double as
sync tombstones.

| Table                    | Key columns                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `projects`               | name, color, sort_order, archived_at                                                                                            |
| `tags`                   | name, color, sort_order                                                                                                         |
| `tasks`                  | title, notes, status(todo/doing/done/cancelled), project_id?, due_at?, estimate_minutes?, completed_at, archived_at, sort_order |
| `task_tags`              | task_id, tag_id                                                                                                                 |
| `schedule_blocks`        | task_id, start_at, end_at                                                                                                       |
| `recurrences`            | task_id, rrule, dtstart, tzid                                                                                                   |
| `occurrence_overrides`   | recurrence_id, occurrence_start, kind(skip/move/detach), new_start, new_end                                                     |
| `occurrence_completions` | task_id, occurrence_start, completed_at                                                                                         |
| `time_entries`           | task_id, started_at, ended_at?, source(timer/manual), note                                                                      |
| `views`                  | name, icon, filter_json, group_by, group_layout, grid_columns, sort_json                                                        |
| `view_groups`            | view_id, kind, value_id?, label, sort_order                                                                                     |
| `settings`               | key, value_json                                                                                                                 |

Times are stored in UTC; recurrence rules additionally store an IANA `tzid` so repeats do not drift
across daylight-saving changes. **`time_entries` stores no attribution snapshot**: project and tag
attribution is always derived from the task's current values (a deliberate decision — reclassifying a
task rewrites history). WebDAV passwords live in the OS keyring, never in SQLite or the repository.

## 3. Functional specification

### 3.1 Tasks, projects, tags

Task fields: title, notes, status, project (0 or 1), tags (many-to-many), due time, estimate, schedule
blocks (0..n). "A task without a time stays in the list; give it a time and it appears on the
timetable" is carried by `schedule_blocks`; `due_at` only drives reminders and sorting and never
occupies the grid. **Tasks are captured in the inbox and nowhere else**: the composer at the top of the inbox is the
single entry point, and there are no per-view or toolbar "new task" buttons (the toolbar has none at
all). Deletes go to a restorable trash; archiving moves completed tasks out of the default views. Projects and tags each have an optional colour; unspecified colours are derived from a
hash of the name. Timetable blocks use the project colour, falling back to the first tag's colour.

### 3.2 View system

A view is: name + icon + filter (tags any/all, project, status, date range, text) + group field
(tag/project/status/none) + an **ordered group list** + arrangement (vertical, horizontal columns,
N×M grid) + sort. Group headers can be dragged to reorder; the arrangement can be switched at any
time and is stored in the view. **The Eisenhower matrix is an ordinary view**: group by tag, four
fixed groups, 2×2 grid. First launch seeds Inbox, Today and All, plus an Eisenhower example view with
empty `important` and `urgent` tags. **Today = due today OR scheduled today.**

**Navigation.** The left sidebar lists **时间表 (Timetable)** as a plain row above a single **视图
(Views)** list: there is no views/timetable switch, and the seeded views sit in the same list as the
user's own — the Eisenhower example is not special and is editable like any other. A view is always
**a list of tasks**; there is no list/board switch. What the user shapes is the grouping (by tag,
project, status, or four pinned tag groups) and its arrangement (vertical stack, side-by-side columns,
N×M grid, and their order), by dragging group headers or switching the arrangement control. Custom
views are created and edited through a dialog covering name, icon, filter, grouping, arrangement and
grid width.

### 3.3 Timetable (its own tab, Google-Calendar style)

Shipped: a week grid of seven day columns over a scrollable 00:00–24:00 canvas (56px per hour), blocks
positioned by time and packed side by side when they overlap, an all-day row for tasks that only carry
a due time, a red now-line, week navigation with a "today" button, and three zoom levels (compact 44px,
standard 76px, roomy 112px per hour — roomy is the default so block text always fits).

Still M2: Day and Month views, and drag on empty grid to create, drag to move, drag an edge to
resize, 15-minute snapping, weeks start Monday, browser-local time zone only.
Overlapping events sit side by side, a red line marks the current time, and a top all-day row holds
tasks that only have a due time. Blocks are coloured by project (falling back to tag colour) and show
live time feedback while dragging. Recurring occurrences are rendered virtually.

### 3.4 Recurrence

An RRULE subset: daily / every N days / weekly on chosen weekdays / every N weeks / monthly on a day
of month / monthly on the Nth weekday / yearly, ending on a date or after N occurrences. One task plus
one rule; individual occurrences are never stored as rows. Per-occurrence operations are: skip this
one, edit only this one (detaching a standalone instance), edit this and following, edit all.
Completion is recorded per occurrence.

### 3.5 Timer

Exactly one running timer at a time; start / pause / resume / stop; state survives a restart. A
persistent bar shows the running timer and the tray shows the current task and elapsed time. Manual
add / edit / delete of time entries is supported, and unscheduled tasks can be timed. Starting a timer
moves a task from `todo` to `doing`; completing a task stops its timer. Statistics compare estimate
against actual.

### 3.6 Reminders

Default lead time 20 minutes, configured **globally in Settings only** (no per-block override). A Rust
scheduler plus a resident tray icon plus launch-at-login (a systemd user service on Linux, native
mechanisms on Windows and macOS). System notifications name the task and time; clicking focuses the
window and opens that task; 5/10-minute snooze is offered; notifications are silent by default.
Reminders missed while the app was closed or the machine asleep are collected into a "missed" list on
launch rather than replayed as popups.

### 3.7 Statistics

ECharts with tree-shaking and a dark theme. Filterable by date range, project and tag. Metrics: total
tracked time, per-day bars, share by project and by tag, per-task totals, completed-task count,
period-over-period trend, calendar heatmap, estimate versus actual. CSV export.

### 3.8 Sync (M6)

Op-log with per-record `updatedAt` last-write-wins and tombstones, covering every entity. Triggered by
a debounced auto-sync after changes plus a manual "sync now" button in Settings. Credentials go to the
OS keyring. CI runs two simulated devices against a real WebDAV server; the owner's existing rclone
remotes are never touched.

### 3.9 Settings

A macOS-style two-pane window mirroring Glassmark: 通用 (appearance / language / week start) ·
提醒 (default lead time, silence, missed summary) · 计时 · 同步 (WebDAV + sync now) · 数据 (export /
import JSON, empty trash) · 关于.

### 3.10 Theming and language

Light **and dark** frosted-glass token sets (the reference project is light-only, so the dark palette
is new work). Colours, radii, shadows, spacing and type are all tokenised, reusing Glassmark's key
values: accent `#2d6d95`, 30px glass blur, 20px window radius, 1px white strokes, cool low-alpha
shadows. Three languages — zh-CN, en, ja — defaulting to the system locale and falling back to zh-CN.

## 4. Defaults chosen during the interview

Window 1440×920 with a 960×640 minimum (matching the reference project). Shortcuts: ⌘/Ctrl+K search,
⌘/Ctrl+1..6 switch view, T start/stop timer, N new task, Esc close. List sorting defaults to manual
`sort_order`, then due time. Data file `<appdata>/pantodo/pantodo.sqlite3`; exports are JSON. The app
icon is a glass-style SVG mark (check box plus timeline).

## 5. Milestones

- **M1 — foundation** (no Rust required): repository + tooling, token layer (light + dark), app shell
  and theme switching, three-language i18n runtime, `Bridge` + browser fixture with persistence,
  task/tag/project CRUD, list view, status, trash, archive, three preset views and the Eisenhower
  example, unit tests, smoke e2e, headless screenshots, CI skeleton.
- **M2** — timetable, scheduling and recurrence (introduces the Rust core crate, SQLite schema and IPC).
- **M3** — timer and statistics.
- **M4** — reminders, tray, autostart, notifications.
- **M5** — full view system (richer filters, group dragging, board arrangements) and polish.
- **M6** — WebDAV sync, real-WebDAV CI integration tests, three-OS packaging.

Every milestone is accepted on screenshots + passing tests + a push.

## 6. Known verification limits on the development machine

The development box (`mydebian`) is headless, with no desktop environment, no display and no tray, and
`sudo` requires a password. Therefore:

- Tray, launch-at-login and system notifications **cannot be verified locally at all**; M4 ships code
  plus instructions, and the owner verifies on a desktop machine.
- Real-window and native-glass behaviour can only be confirmed by the owner; locally the same React UI
  is screenshotted through headless Chromium.
- Windows and macOS installers are produced by GitHub Actions; their artefacts can be inspected but not
  run locally.
- Rust/Tauri compilation requires system packages installed with `sudo apt-get install build-essential
pkg-config libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev libgtk-3-dev libsoup-3.0-dev
librsvg2-dev libssl-dev libayatana-appindicator3-dev libxdo-dev patchelf gh`, plus a rustup
  toolchain. M1 deliberately needs none of it.
