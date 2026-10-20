# Using Pantodo

## Capture and schedule

Open Create, enter a task name and an optional description. Project and tag pickers support search. Select a start date/time and duration in Schedule; the end is calculated automatically, including across midnight. Moving the start keeps the duration. Due opens a separate date/time picker and can be used without a schedule. Clearing a schedule leaves its deadline intact. Block duration is the planned interval; Focus time is the actual recorded work. Custom sits alongside duration presets and opens hour/minute number inputs only when clicked; cancel discards the input and Done or Enter applies a valid positive duration. Clock time values are selected from enlarged hour/minute columns; empty controls show Choose time.

## Tasks and panels

Today and All tasks show the full task summary, dates and work controls. Click a task to edit its details. Checking an unfinished task asks for confirmation; reopening a completed task happens immediately. Trash supports restoring tasks or permanently deleting them.

Create a view with a name and optional emoji, then add independently filtered panels. Panels can filter by project, included tags (any or all), status and text. No selected tags means all tags. Choose List or Gallery, change sorting and set the panel’s column span in its editor. Choose Vertical or Columns in the view controls, and change the column count in View settings.

List tasks have transparent backgrounds and individual borders; Gallery adapts its column count to the available panel width. Panel tasks show only names and descriptions. Click or focus a task and press Enter to edit its full information. Each panel’s task region grows with its contents up to the configurable height (480px by default) or 65% of the window height, whichever is smaller; further tasks scroll inside it. The region is keyboard-focusable. Drag handles reorder panels with pointer, touch or keyboard; tasks themselves do not drag.

## Timetable

Switch between day, week and month. Planned intervals appear as blocks, overlapping plans use separate lanes, and deadlines appear as accent-colored flag labels. Click a block or deadline to edit its task. Zoom the time grid with the slider, trackpad pinch, two-finger touch or Ctrl/⌘-wheel.

## Work and focus

Start a session from Today or All tasks. Only one timer runs at a time. Pause for breaks, resume, or stop and save. A short countdown opens Focus across the right pane without changing OS fullscreen. Leave Focus to continue browsing while the session remains active.

Completing, cancelling, archiving or deleting the active task stops its timer. On desktop, window close, exit and suspend also end the session. Reopening never starts a timer automatically; crash recovery uses the last saved heartbeat. Linux native sleep events require systemd-logind, with gap detection as a fallback.

## Time statistics

Review daily totals and project/tag breakdowns, filter by dates or classifications, and export CSV. Each scheduled task’s block duration is compared with its recorded focus time. Tasks without a scheduled interval show no block duration.

Add or edit work entries manually when needed. A newly saved manual entry replaces each whole overlapping entry; replaced entries remain as superseded records in workspace exports and do not contribute to statistics. Each tag receives the full entry duration, while combined tag filters count an entry once. Consequently, category totals may exceed the overall total. Entries crossing midnight are split between local days.

## Storage and WebDAV

Desktop saves atomically to a local workspace file; browser mode uses localStorage. Export your workspace in Settings.

Settings → Sync offers Local and WebDAV modes. Local mode shows the export action and makes no sync requests. WebDAV mode shows connection settings; switching back to Local pauses sync while retaining the server configuration. To configure WebDAV, provide an existing WebDAV directory and credentials. The app writes `pantodo-workspace.json`; it does not create directories or follow redirects. Sync includes tasks, projects, tags, custom views and recorded time. Running timers, credentials, device appearance and built-in navigation remain local. Separate edits merge; conflicting edits and overlapping records require a choice. Permanent-deletion markers prevent older offline devices from restoring emptied Trash.

Automatic sync is opt-in and runs after edits, on focus/reconnect and every minute. Disconnecting retains the local workspace and remote file. Credentials are stored on this device in webview/browser storage and excluded from sync files and exports.

WebDAV needs GET/PUT and strong ETags; files are limited to 32 MB. Browser access additionally needs CORS for the app origin, methods `GET, PUT, OPTIONS`, request headers `Authorization, Content-Type, If-Match, If-None-Match`, and exposed response header `ETag`. HTTPS browser pages need HTTPS WebDAV. Desktop uses native HTTP without CORS restrictions.

## Appearance

Settings includes light/dark/system themes, eight accent palettes, English/Simplified Chinese/Japanese and the first day of the week. macOS uses native frosted material; Windows uses Acrylic. Linux transparency and desktop blur depend on the compositor.

## Preferences and reports

General settings include startup page, default block duration and panel task-region height. Timer settings control automatic Focus and the countdown, including immediate entry. Statistics settings choose a daily focus goal and a default week/month/year period. Goals are indicators, not timer limits.

ECharts reports include daily minutes and cumulative time, project/tag shares, weekday/hour focus distribution, task rankings, planned versus recorded minutes and average daily goal progress. Active days, longest session and days meeting the goal use the same date/project/tag filters as the work ledger. Heatmap records are clipped to the selected period and split at local hour boundaries, including overnight sessions. Tags receive full time per tag and may add up to more than the deduplicated total. Charts resize with the window and follow the accent/theme; statistics code loads when the page is opened.

## Repeating tasks

Use Repeat in Create or the task editor. Configure daily/weekly/monthly/yearly frequency, a positive interval, first date and selected weekdays for weekly rules. End never, on an inclusive date, or after a number of occurrences (including skipped occurrences). Monthly/yearly rules keep their original date and skip months without that date; leap-day yearly tasks skip non-leap years. Rules follow the device's local calendar and preserve wall-clock times through daylight-saving changes.

There is only one stored Todo per series. Its `occurrences` collection contains a dated snapshot of each cycle, with its own planned start/end, deadline, status, completion and deletion timestamp. Lists and panels show every non-deleted historical cycle and today's cycle. New cycles are recorded on their local day; if the app was closed, the next launch catches up every missing day. Future calendar cycles remain computed previews. Untimed repeats appear in the all-day area.

Title, description, project and tags are shared by the series. Schedule and rule changes apply to unrecorded cycles; existing cycles keep their saved times and status, even when Repeat is disabled. Status is read-only in the editor and changes through completion/reopen and work controls. Open Repeat to review historical dates, times and statuses alongside upcoming previews. Delete offers this occurrence (a dated tombstone inside the source Todo) or the whole series (Trash). Restoring the series keeps its history. Earlier completion and skipped-date data is upgraded automatically.

Each work timer and time entry retains the source ID and occurrence date. Completing an older cycle does not stop another cycle's timer or complete today's cycle. Statistics count individual completed cycles. WebDAV carries the nested records and automatically merges changes to different dates; conflicting edits to the same date are shown for review.

### WebDAV sync status

Set automatic polling to 30–86400 seconds in Sync settings (default: 60 seconds).
Edits still trigger automatic sync after a short delay when automatic sync is enabled.
The sidebar footer shows the last successful sync time and any failure reason. Use its
refresh button to sync manually; it rotates during requests. Conflicts open Sync settings
for review. UTF-8 BOM JSON and Pantodo workspace exports are accepted and validated before
local data changes; credentials, settings and running timers remain local.
