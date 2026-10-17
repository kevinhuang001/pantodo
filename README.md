# Pantodo

A quiet place for your Todos, planned time and actual work. Pantodo combines a playful paper desk with a translucent sidebar, a calendar, a work timer and saved panel views with list and gallery content.

Pantodo is a **Tauri 2 desktop application** for macOS, Windows and Linux, built with Rust and React. Download installers from [GitHub Releases](https://github.com/kevinhuang001/pantodo/releases). The Vite browser preview remains available for development.

## Plan your day

Create a Todo with a title, notes, status, project, multiple tags and an optional estimate. Its optional `startAt` and `endAt` form one planned interval. A separate `dueAt` represents the deadline.

- **No dates:** keep the Todo in lists and filtered views.
- **Planned interval:** see a time block in the calendar.
- **Deadline:** see a thin marker line with its time and title, including Todos without a planned interval.
- **Both:** see the plan and deadline independently.

The calendar provides **day, week and month** views, date navigation, current-time indication, overlap lanes and slider, trackpad pinch, two-finger touch and Ctrl/⌘-wheel zoom in time-grid views. Click a Todo or deadline to edit it. Todos do not drag.

## Track your work

Start work from a Todo, pause for a break, resume or stop and save. One timer runs at a time. Completing, cancelling, archiving or deleting the active Todo stops its timer. Switching pages keeps it running.

Actual time is stored separately from planned time. Add, edit and delete time entries from Statistics. **A newly saved manual entry replaces every whole existing entry that overlaps it.** The old entries are retained as superseded records in the workspace export and excluded from statistics; they are not split into fragments.

Starting a Todo shows a three-second countdown, then opens Focus across the entire right content pane. Navigation stays available. Escape or Leave focus returns to the workspace while keeping the timer running. Focus never changes the operating system's fullscreen state.

The native Rust process persists the workspace atomically in the system application-data directory, maintains five-second heartbeats while minimized, and stops the timer on window close, application exit or system suspend. Reopening never automatically starts a timer. Native lifecycle cutoffs invalidate pending renderer writes so a delayed save cannot restore a stopped session. Crash recovery ends at the last durable heartbeat. Linux sleep events require systemd-logind; a gap fallback remains available if native events are unavailable.

## Understand your time

Statistics includes daily totals, project and tag breakdowns, completed Todos, work-entry count, daily averages, comparison with the preceding period, and estimated versus actual time per Todo. Filter by date, project and multiple tags, inspect the underlying entries or export the selected interval as CSV.

Each tag receives the entry’s full duration. Combined tag filters count each entry once. Consequently, tag category totals can exceed overall work time. Entries spanning midnight are divided between local calendar dates.

## Build your own views

Saved views contain independently filtered panels. Create a view with a name and optional emoji, then add panels. Each panel switches between **List** and **Gallery**, with its own title, emoji, tags, status, project, schedule, deadline range, text filter and sorting.

Arrange panels vertically or in **Columns**. Columns default to two; change the count in View settings. Panel spans live in the panel editor. Drag handles with a pointer or touch, or use Space and arrow keys on a focused handle to reorder. Todos never drag. The same Todo may appear in several panels. Built-in Today, All and Trash support List and Gallery directly.

Projects and views support emoji icons. Only tags have colors; projects use a name and an icon. Appearance, language, week start and eight accent presets live in Settings. Light/dark/system themes and Chinese, English and Japanese are supported.

## Sync your devices

The web app saves to **localStorage by default** and works offline. Desktop saves to a local workspace file. WebDAV is optional: open **Settings → Sync**, enter an existing server directory and credentials, save the configuration, then sync. The file is `pantodo-workspace.json` inside that directory.

Sync includes Todos and their tags, projects, tags, custom panel views and recorded time. Appearance, built-in navigation, login information and the running timer stay on each device. Separate edits merge; conflicting edits and overlapping work records require a choice. Permanent-deletion markers prevent offline devices from restoring emptied Trash. Conditional writes use ETags and retry concurrent changes.

Automatic sync is opt-in: it runs after edits, on reconnect/focus and every minute. Disconnecting preserves local data and the remote file. Credentials remain in this device’s webview/browser storage and are excluded from sync files and exports.

WebDAV must support GET/PUT and strong ETags. For browser access, allow the app’s origin, methods `GET, PUT, OPTIONS`, request headers `Authorization, Content-Type, If-Match, If-None-Match`, and expose response header `ETag`. An HTTPS web app needs an HTTPS WebDAV endpoint. The desktop client uses native HTTP and does not require CORS. The app does not create server directories or follow redirects. Files are limited to 32 MB.

## Run locally

Requires Node.js >= 22.12.

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. A new workspace starts without sample Todos. For a disposable demonstration use `/?demo=1` on a fresh workspace. `/?reset=1` deliberately replaces the browser workspace with sample Todos; use it only for testing.

For the desktop app, install Rust stable and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/), then run:

```bash
npm run icons
npm run desktop:dev
```

Build the current platform's installers with `npm run desktop:build`. Source icons live in `assets/icon.svg`; generated platform icons are excluded from source control. The desktop workspace lives in `workspace.json` beneath the app-data directory for `io.github.kevinhuang001.pantodo`. Browser preview storage is separate.

## Development

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run e2e
npm run build
npm run screenshots
```

Install the Playwright browser with `npx playwright install chromium` before UI checks. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally selects an installed Chromium. Screenshots start their own Vite server, exercise an isolated sample workspace and write application captures to `artifacts/screenshots`.

- [Product rules and data model](docs/SPEC.md)
- [Interface and verification guide](docs/UI-PREVIEW.md)
- [Third-party notices](THIRD-PARTY.md)

GitHub Actions checks type safety, formatting, lint, unit tests and production builds on Linux, macOS and Windows. The browser job runs Playwright and uploads screenshots. Desktop jobs produce macOS Apple Silicon/Intel DMGs, Windows x64 NSIS/MSI installers and Linux x64 AppImage/DEB/RPM packages. npm downloads, Cargo dependencies/build outputs, Tauri packaging tools and Playwright browsers are cached. All checks and all platform builds must pass before a version is published from main; published versions are left unchanged. See the [current release notes](docs/RELEASE-NOTES.md).

### Interface components

Forms use shadcn/ui components (Radix primitives, Tailwind CSS and Lucide). Source components live in `src/components/ui`; `components.json` configures the registry aliases. Selects, calendars, emoji pickers and menus render inside the app, with keyboard navigation and focus handling. Creating a view requires only a name and optional emoji; panels, filters and layout can be configured after creation. The frameless Tauri window provides a 44px window-control drag area without a duplicate breadcrumb/title row, macOS traffic lights or Windows/Linux controls, drag regions on the title and sidebar, and eight resize edges/corners. The native platform selects the controls. A writing card and a random localized phrase replace the previous dense create screen; explanatory captions and footers are removed. The sidebar uses native frosted UnderWindowBackground material on macOS and Acrylic on Windows, covered by a medium translucent tint that reveals blurred background colors; Linux transparency depends on the compositor. Capture metadata uses separate schedule and deadline popovers plus searchable project/tag pickers. Schedules take a start and duration and calculate the end automatically, and the sidebar scrolls without showing a scrollbar. View controls show localized tooltips on hover and keyboard focus.

Appearance settings offer Sage, Ocean, Teal, Lavender, Rose, Peach, Amber and Graphite accents in light and dark themes. Projects, views and panels share an offline Emoji Mart catalog with categories, search and skin tones. All saved filters are panel properties.

Dates and times are selected from calendars and hour/minute columns, including manual time entries. The accent also tints the workspace background and frosted sidebar. Panel galleries size cards to their content.
