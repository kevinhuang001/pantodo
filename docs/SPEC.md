# Pantodo product specification

This document describes the current application.

## Workspace and Todos

A Todo stores title, notes, status (`todo`, `doing`, `done`, `cancelled`), optional project, multiple tags, optional planned interval, independent deadline, optional estimate and lifecycle timestamps. Both planned endpoints must be present together, with end after start. Plans may cross midnight. Changing a plan does not rewrite actual work.

Projects have a name and emoji. Tags have a name and color. Create is the entry point for new Todos: one writing card, optional notes, project/tags, and a calendar/time popover. A localized phrase is chosen from 16 messages on entry without immediately repeating; typing does not change it. Content clicks open the Todo editor. Clicking an unchecked checkbox asks for completion confirmation; confirming marks Done with dimming and strikethrough. Reopening Done returns directly to Todo. Work timers still set Doing.

Navigation contains Create, Today, All Todos, Calendar, Statistics, saved views and Trash. Today includes planned or due Todos for the local day. Deleted Todos appear only in Trash. Todos never drag.

## Views

A custom view contains panels. Creating it requires only a name and optional emoji and creates no placeholder panels. View settings contain identity and column count (default two). All saved filters belong to panels; views have no filter field.

The compact 44px title row switches between vertical and column panel arrangements. Each panel independently switches between List and Gallery using localized hover/focus tooltips. Built-in Today, All and Trash use List or Gallery directly.

Each panel stores name, emoji, list/gallery presentation, filter, sort and column span. Filters support included/excluded tags, any/all matching, status, project or unassigned project, planned/unplanned time, deadline bounds and title/notes text. Search and sidebar filters apply before each panel’s filter. A Todo may appear in several panels.

Add panels directly. Column count is edited only in View settings; panel spans are edited in the panel dialog. Pointer, touch and keyboard sorting operate only on panel handles and persist order. The dragged overlay retains its original size; displaced panels translate without scaling. Gallery cards fit their contents without minimum body/card heights; empty metadata and timing sections take no space. Small windows collapse to one column without changing saved spans.

Capture metadata has separate Schedule, Due, Project and Tag triggers. Schedule selects a start date/time and a duration, automatically calculating the end (including overnight and multiday intervals). Block duration offers presets plus a Custom button that opens hour/minute number inputs with cancel and confirmation. Recorded Focus time is labeled separately. Existing custom intervals keep their duration when their start moves. Due is independent, can be set without a schedule, and is never moved or cleared by schedule edits. Both popovers apply on Done and discard on dismissal. Clicking dates and times opens selection-only calendars and keyboard-accessible hour/minute columns. The Todo editor uses the same start/duration model. Project/tag pickers support search and keyboard navigation. Navigation owns page names; the redundant top breadcrumb/title row is removed, with view presentation and settings kept as compact controls. Deadline flags, dates and time labels follow the active accent. Built-in task lists wrap full descriptions, status, project, tags, start, computed end and duration. Custom panels show only task names and descriptions, with click/Enter opening the full editor. Their task regions cap at min(480px, 65dvh), scroll internally, and remain keyboard-focusable. Empty time controls show a localized Choose time label; time selection uses enlarged hour/minute options.

Forms use shadcn/ui with Radix primitives. Selects, emoji choices, date calendars and menus render inside the application and support keyboard navigation.

## Calendar

Day and Week show 24-hour grids with overlapping plans packed into local overlap clusters. Month shows compact plans and deadline entries; additional events open Day. Plans use the first tag color or the accent. Deadlines appear independently, including for unplanned Todos. Completed work is subdued; deleted, archived and cancelled Todos are excluded.

A single 48px control row contains previous/next, the date-range calendar popover, Day/Week/Month and a draggable 36–144 px/hour slider. Time-grid zoom also supports trackpad pinch, two-finger touch and Ctrl/⌘-wheel gestures. It preserves the hour under the gesture, stays within the slider bounds and persists when the gesture ends. Ordinary scrolling stays unchanged. There are no zoom presets or draggable ruler handles. Calendar mode, scale and week start persist. Clicking a date header opens Day; clicking a plan or deadline opens its Todo editor.

## Work and focus

Only one timer runs. Starting another Todo commits the preceding segment. Pause commits work; resume begins a new segment and excludes the break. Stop clears the session. Completing, cancelling, deleting or archiving the active Todo stops it.

Starting work begins a three-second countdown, then Focus fills the entire right pane. Cancelling the countdown leaves work running. Sidebar and custom window controls remain available. Escape or Leave focus returns without pausing. Pause and Stop operate on the same session. OS fullscreen is never requested.

A time entry stores Todo identity (optional), interval, source (`timer` or `manual`), note and lifecycle timestamps. Manual intervals must end no later than now. Saving a correction supersedes every whole overlapping record; adjacent intervals survive. Superseded records do not count in the UI or CSV. A correction overlapping a running segment first commits and stops it. The workspace write is atomic.

## Statistics

The inclusive local-date range clips records and splits overnight work at local midnight. Duration uses elapsed seconds. Filters support project and a union of tags; selected records count once in the total. Each tag receives the full matching duration, so tag sums can exceed the total. Classification follows the Todo’s current project/tags. Deleted Todos retain their work history.

Statistics includes daily totals, project/tag breakdowns, completion and record counts, daily average, previous-period comparison, per-Todo estimates versus actual work, an editable ledger and CSV export. CSV escapes spreadsheet formula prefixes.

## Persistence and desktop

Browser preview stores one workspace in localStorage and observes updates from other windows. Fresh workspaces have starter views/tags; sample Todos require an explicit demo/reset URL. Failed storage writes do not partially commit time transitions.

The Tauri host writes workspace JSON atomically. Native heartbeats and suspend/exit events close active work at a durable cutoff. Reopening never resumes a timer. A generation counter rejects queued writes from before a cutoff. Browser preview uses five-second heartbeats and stops an interrupted session at its last heartbeat after a gap over 30 seconds.

The window is frameless and resizable, opening at 1080×740 with an 800×600 minimum. Native platform detection selects macOS traffic lights or Windows/Linux controls. Buttons sit above drag regions. Title/sidebar backgrounds initiate native dragging; eight edges/corners initiate native resize dragging. The sidebar uses frosted Sidebar material on macOS, with a clear WKWebView/window canvas and a partially translucent native material layer and Acrylic on Windows. A medium translucent tint over native blur reveals background colors while keeping text readable. Browser glass uses a 22px blur. Linux depends on the compositor. The right pane is opaque. Sidebar Personal space/shortcut and brand subtitle text are omitted. Search uses one outer focus indicator without an inner input border; the Create icon and paper mascot use accent tokens. Native file-drop interception is disabled for panel interaction.

Settings uses an icon navigation rail and grouped cards for appearance, timer, sync, data and about. It supports light/dark/system appearance, Chinese/English/Japanese, week start, eight accent presets and JSON export.

## WebDAV sync

Browser data uses localStorage by default; desktop uses the native workspace file. Sync is disabled until configured. A user supplies an existing WebDAV directory, username and password; the client reads/writes `pantodo-workspace.json`. Credentials and the last successful sync base remain in local browser/webview storage and are excluded from exports and remote documents. Disconnect removes local sync configuration/base and retains both workspace copies.

Version 1 documents contain project, tag, Todo-with-tag-assignment, custom-view and committed-time-entry records keyed by ID. They exclude appearance settings, built-in views and live timers. Seed identities are deterministic across new devices. First synchronization from an untouched workspace imports the server workspace without duplicating starter panels.

A three-way merge compares the last synced base with current local and remote records. Independent changes merge. Concurrent edits, deletion-versus-edit conflicts and overlapping time recordings require the user to choose local or remote for the listed conflicts. The choice is valid only for the reviewed record contents; another change requires review again. Permanent deletion uses null tombstones. Resolving overlapping time tombstones the unchosen record.

GET validates every record before local writes. PUT uses `If-None-Match: *` for creation or a strong `If-Match` ETag for updates. A 412 retries the read/merge/write sequence up to three times. A missing ETag, authentication failure, invalid document or transport error leaves local data available. Local edits made during network requests are retained, and automatic sync queues another attempt when needed. Remote completion, cancellation, archival or deletion of a locally timed Todo commits and stops its current segment before applying the change. If a native lifecycle cutoff rejects the sync write, sync reapplies its data against the new generation while keeping the committed segment and stopped timer.

Automatic sync is opt-in, debounced after data changes, polls each minute and checks on reconnect/focus. Ordinary timer heartbeats do not trigger writes. Network operations time out after 20 seconds, reject redirects, support HTTP(S) and cap documents at 32 MB. Desktop requests use Rust HTTP; browser requests require server CORS permissions and an exposed ETag header. No server directory is created.

## Verification

Unit tests cover Todo filters, plans, calendar clipping/lanes, timers, overlap corrections, statistics and atomic persistence. Playwright covers the actual forms, view presentations, pointer panel dragging, pointer zoom persistence, calendar modes, work/focus, manual records, window-command dispatch, reload behavior and a real authenticated WebDAV test server with two browser devices, conflicts, conditional retries, deletion and offline recovery. Screenshot inspection covers light/dark, full and minimum-size windows. Browser simulation does not verify physical native material or system sleep on every OS.

Appearance settings include eight accent presets with light/dark colors and persistent selection. The selected accent also tints the main background, translucent sidebar and content surfaces in both themes. Trash is the final item of the scrolling sidebar. The native effect and application clip share a 14px radius; child panes do not add another rounded boundary.
