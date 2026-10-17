# Pantodo product specification

This specification records the design confirmed on 16 October 2026 and the resulting desktop application.

## Todo model

`Task` is the source-code name for a Todo, not a second user-facing entity.

| Field                                    | Meaning                                        |
| ---------------------------------------- | ---------------------------------------------- |
| `id`                                     | Stable Todo identity                           |
| `title`, `notes`                         | Content                                        |
| `status`                                 | `todo`, `doing`, `done`, `cancelled`           |
| `projectId`                              | Optional single project                        |
| `taskTags[todoId]`                       | Zero or more tags                              |
| `startAt`, `endAt`                       | Optional planned interval directly on the Todo |
| `dueAt`                                  | Optional independent deadline                  |
| `estimateMinutes`                        | Optional estimated work duration               |
| `completedAt`, `archivedAt`, `deletedAt` | Lifecycle timestamps                           |
| `createdAt`, `updatedAt`, `sortOrder`    | System metadata                                |

Both planned endpoints are required together, and the end must follow the start. Plans may span midnight or multiple dates. A Todo has one planned interval. Deadline and plan do not constrain one another: a user may deliberately schedule work after a deadline. Plan changes do not rewrite actual work records.

Existing workspaces from the earlier prototype import their first active schedule interval into the Todo’s own fields. New writes contain no schedule entity.

## Navigation and creation

Primary navigation contains Create, Today, All Todos, Calendar and Statistics. Custom views form their own sidebar section. Trash remains accessible separately. There is no dedicated four-quadrant tab.

Create has a central form and decorative paper notes built from up to six real, open Todo titles. The background excludes archived, deleted, completed and cancelled Todos and never accepts input. Expand Time & estimate to set the planned interval, deadline and estimate. Projects and multiple tags are selected independently.

The list exposes the title, description, tags, planned time, deadline, estimate and a work-timer action. Clicking content opens the editor. The existing checkbox cycles Todo → Doing → Done → Todo. Todos do not support dragging anywhere.

## Calendar

- Day and week show 24-hour time grids with overlapping plans packed into local overlap clusters.
- Month shows planned events and thin deadline indicators in each date cell; additional entries open the day view.
- Agenda lists plans and deadlines for the 30 days starting at the anchor date.
- Plans use the project colour, falling back to the first tag and then the palette.
- Deadlines are thin amber lines with time/title labels in day/week grids, and compact line entries in month/agenda. A deadline-only Todo still appears.
- Completed work remains visible with a subdued style. Deleted, archived and cancelled Todos are excluded.
- Navigation includes previous/next, Today and a date picker. Clicking a date header opens the day view.
- Day/week zoom offers presets and a continuous 36–144 px/hour slider. Mode, zoom and week start persist.
- Time blocks and deadline labels open the Todo editor on click. They never drag or resize directly.

## Actual work ledger

A `TimeEntry` contains an identity, optional Todo identity, start/end instants, source (`timer` or `manual`), note and lifecycle timestamps. A timer session holds its current Todo, open segment, accumulated work, committed segment identities, owner window and latest heartbeat.

Only one timer runs. Starting another Todo saves the previous segment before starting the next. Pause saves the working segment; resume starts a new segment, excluding the break. Stop clears the session. Completing, cancelling, deleting or archiving its Todo also stops it. A saved manual correction affecting the current session ends that session so its displayed accumulated time cannot retain replaced work.

Manual records require a positive interval ending no later than now. They may be unassigned. Saving a new or edited manual record takes priority over **every whole overlapping record**. Overlap uses exclusive ends, so adjacent records survive. Superseded records carry `deletedAt` and `supersededBy` and do not count in the UI or CSV. A correction overlapping a live segment first saves and stops that timer, then supersedes the overlapping segment. All changes persist in one workspace write.

The browser owner persists a heartbeat every five seconds. Page exit saves synchronously and stops; reopening never automatically starts a timer. A gap longer than 30 seconds closes an interrupted session at its last heartbeat. Browser background throttling and brief system sleeps cannot be perfectly distinguished here; the desktop host separately listens for native suspend/resume and window exit events. Simulated interruption tests verify the current heartbeat policy, not physical OS sleep on every platform.

## Statistics

Statistics selects an inclusive date range in local calendar time and clips work to that range. Overnight entries are split at local midnight; durations use actual elapsed seconds. The main total counts each selected entry once.

Filters include project and a union of selected tags. Each tag receives full duration, so tag category sums may exceed total time. Multi-tag filters deduplicate records. Project/tag attribution follows the Todo’s current classification. Deleting a Todo does not erase the ledger; permanently purged Todos fall back to an unassigned historical label.

The page provides daily bars, project/tag breakdowns, completion count, record count, total/daily-average work, previous-period comparison, per-Todo estimated/actual work and an editable ledger. Live work contributes until it stops. CSV exports the filtered, clipped interval and escapes spreadsheet formula prefixes.

## Views and emoji

A view stores its name, emoji, overall filter, arrangement, grid width, sorting and either grouping rules or independent panels. Each panel stores its identity, title, emoji, filter, sort and column span.

Panel filters include tags (any/all), excluded tags, status, project or unassigned project, planned/unplanned time, deadline endpoints and title/notes text. Overall view/search/sidebar filters apply first; each panel then filters that candidate set independently. A Todo can appear in several panels.

Only panel handles drag. Move buttons offer keyboard-accessible reordering. Width controls select how many grid columns a panel spans; smaller windows collapse panels to one column without changing saved spans. An Eisenhower template creates four normal editable panels from two distinct tags. There is no automatic mutation of Todo properties through a view.

Project and view emoji are editable through common choices or the system emoji keyboard. Each icon accepts one grapheme, including compound emoji. Tag colour remains a separate classification cue.

## Persistence and platform

The current browser bridge stores one workspace in localStorage and reloads changes from other windows. Time-record replacement is atomic within its workspace write. Browser storage errors do not partially commit a time transition. A fresh workspace is empty apart from starter views/tags; sample Todos require the explicit demonstration/reset URL.

The repository contains a Tauri 2/Rust desktop host and a React/TypeScript application. The native host writes workspace JSON atomically, owns lifecycle cutoffs and heartbeats, and rejects renderer writes from before a cutoff. SQLite, native reminders, recurring Todos, tray/autostart and WebDAV synchronization remain outside this iteration. Settings exposes implemented controls: general, timer, data export and about.

## Verification

Unit tests cover filter/group behaviour, direct Todo plans, calendar clipping/lane packing, timer lifecycle, pause exclusion, interrupted sessions, whole-record overlap replacement, multi-tag deduplication, local-midnight splitting and atomic browser writes.

Playwright covers creation/editing, calendar modes/zoom/deadlines, timer pause/resume and exit persistence, simulated interrupted execution, manual corrections, statistics, emoji, saved panel filters/order/width, language/theme and existing CRUD flows. The screenshot script captures 16 actual app states in light/dark and 960×640/1440×1080 windows.

## Desktop and focus

Starting a task triggers a three-second countdown and automatically opens Focus inside the entire right content pane. The sidebar and custom window controls remain available; OS fullscreen is never requested. The countdown can be cancelled without stopping the timer. The running timer also has an immediate Focus control. Escape or Leave focus returns to the workspace without pausing. Pause and Stop act on the same work session. Native suspend closes the active segment at the event time; resume does not restart it. Rust maintains heartbeats independently of webview throttling. App startup recovers an orphaned timer at its last durable heartbeat. A lifecycle generation counter prevents queued pre-suspend writes from resurrecting a stopped timer. Native persistence uses a synchronized temporary file followed by atomic replacement.

View creation asks only for its name and optional icon. An empty composed view is created without a placeholder panel. Add and configure panels after creation; edit view settings for templates, grouping, filters and layout. Non-create pages omit decorative hero blocks. Form controls are shadcn/ui components with in-app menus and calendars.
