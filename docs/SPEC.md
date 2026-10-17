# Pantodo product specification

This document describes the current application.

## Workspace and Todos

A Todo stores title, notes, status (`todo`, `doing`, `done`, `cancelled`), optional project, multiple tags, optional planned interval, independent deadline, optional estimate and lifecycle timestamps. Both planned endpoints must be present together, with end after start. Plans may cross midnight. Changing a plan does not rewrite actual work.

Projects have a name and emoji. Tags have a name and color. Create is the entry point for new Todos: one writing card, optional notes, project/tags, and expandable scheduling. A localized phrase is chosen from 16 messages on entry without immediately repeating; typing does not change it. Content clicks open the Todo editor. The checkbox cycles Todo → Doing → Done → Todo.

Navigation contains Create, Today, All Todos, Calendar, Statistics, saved views and Trash. Today includes planned or due Todos for the local day. Deleted Todos appear only in Trash. Todos never drag.

## Views

A view stores name, emoji, filter, presentation, sort, panels and panel layout. Creating it requires name and optional emoji, starts in List, and creates no placeholder panels. View settings contain identity and a collapsed overall filter.

The compact 44px title row switches List, Gallery, Board and Panels. The choice persists per view. List and Gallery use the same filtered Todo set; Board groups that set into four status columns. Switching presentation preserves panel configuration.

Each panel stores name, emoji, list/gallery presentation, filter, sort and column span. Filters support included/excluded tags, any/all matching, status, project or unassigned project, planned/unplanned time, deadline bounds and title/notes text. Overall view, search and sidebar filters apply first. A Todo may appear in several panels.

The panel workspace provides layout, column count, Add panel and an Eisenhower template built from two distinct tags. The template appends four editable panels. Pointer, touch and keyboard sorting operate only on panel handles and persist the new order. Move buttons provide another ordering control. Small windows collapse to one column without changing saved spans.

Forms use shadcn/ui with Radix primitives. Selects, emoji choices, date calendars and menus render inside the application and support keyboard navigation.

## Calendar

Day and Week show 24-hour grids with overlapping plans packed into local overlap clusters. Month shows compact plans and deadline entries; additional events open Day. Plans use the first tag color or the accent. Deadlines appear independently, including for unplanned Todos. Completed work is subdued; deleted, archived and cancelled Todos are excluded.

A single 48px control row contains Today, previous/next, the date-range calendar popover, Day/Week/Month and a draggable 36–144 px/hour slider. Zoom has no presets. Calendar mode, scale and week start persist. Clicking a date header opens Day; clicking a plan or deadline opens its Todo editor.

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

The window is frameless and resizable. Native platform detection selects macOS traffic lights or Windows/Linux controls. Buttons sit above drag regions. Title/sidebar backgrounds initiate native dragging; eight edges/corners initiate native resize dragging. The webview and sidebar are transparent over Liquid Glass Clear on supported macOS, Sidebar material on earlier macOS and Acrylic on Windows. Linux depends on the compositor. The right pane is opaque. Native file-drop interception is disabled for panel interaction.

Settings supports light/dark/system appearance, Chinese/English/Japanese, week start, default planned duration and JSON export.

## Verification

Unit tests cover Todo filters, quadrant panel rules, plans, calendar clipping/lanes, timers, overlap corrections, statistics and atomic persistence. Playwright covers the actual forms, view presentations, pointer panel dragging, pointer zoom persistence, calendar modes, work/focus, manual records, window-command dispatch and reload behavior. Screenshot inspection covers light/dark, full and minimum-size windows. Browser simulation does not verify physical native material or system sleep on every OS.
