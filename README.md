# Pantodo

A quiet place for your Todos, planned time and actual work. Pantodo combines a playful paper desk with a mint glass sidebar, a calendar, a work timer and saved views built from independently filtered panels.

Pantodo is a **Tauri 2 desktop application** for macOS, Windows and Linux, built with Rust and React. Download installers from [GitHub Releases](https://github.com/kevinhuang001/pantodo/releases). The Vite browser preview remains available for development.

## Plan your day

Create a Todo with a title, notes, status, project, multiple tags and an optional estimate. Its optional `startAt` and `endAt` form one planned interval. A separate `dueAt` represents the deadline.

- **No dates:** keep the Todo in lists and filtered views.
- **Planned interval:** see a time block in the calendar.
- **Deadline:** see a thin marker line with its time and title, including Todos without a planned interval.
- **Both:** see the plan and deadline independently.

The calendar provides **day, week, month and agenda** views, date navigation, current-time indication, overlap lanes and continuous zoom in time-grid views. Click a Todo or deadline to edit it. Todos do not drag.

## Track your work

Start work from a Todo, pause for a break, resume or stop and save. One timer runs at a time. Completing, cancelling, archiving or deleting the active Todo stops its timer. Switching pages keeps it running.

Actual time is stored separately from planned time. Add, edit and delete time entries from Statistics. **A newly saved manual entry replaces every whole existing entry that overlaps it.** The old entries are retained as superseded records in the workspace export and excluded from statistics; they are not split into fragments.

Starting a Todo shows a three-second countdown, then opens Focus across the entire right content pane. Navigation stays available. Escape or Leave focus returns to the workspace while keeping the timer running. Focus never changes the operating system's fullscreen state.

The native Rust process persists the workspace atomically in the system application-data directory, maintains five-second heartbeats while minimized, and stops the timer on window close, application exit or system suspend. Reopening never automatically starts a timer. Native lifecycle cutoffs invalidate pending renderer writes so a delayed save cannot restore a stopped session. Crash recovery ends at the last durable heartbeat. Linux sleep events require systemd-logind; a gap fallback remains available if native events are unavailable.

## Understand your time

Statistics includes daily totals, project and tag breakdowns, completed Todos, work-entry count, daily averages, comparison with the preceding period, and estimated versus actual time per Todo. Filter by date, project and multiple tags, inspect the underlying entries or export the selected interval as CSV.

Each tag receives the entry’s full duration. Combined tag filters count each entry once. Consequently, tag category totals can exceed overall work time. Entries spanning midnight are divided between local calendar dates.

## Build your own views

Views combine an overall filter with a list layout or composed panels. Each panel has its own title, emoji, include/exclude tags, any/all tag matching, status, project, schedule, deadline range, text filter and sort order.

Drag panel handles or use the move buttons to reorder panels. Change a panel’s column span, choose the grid width or switch to vertical/column arrangements. A Todo may appear in multiple panels. The Eisenhower template creates four ordinary, editable panels from two selected tags.

Projects and views support emoji icons. Appearance, language, week start and default planned duration live in Settings. Light/dark/system themes and Chinese, English and Japanese are supported.

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

Install the Playwright browser with `npx playwright install chromium` before UI checks. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally selects an installed Chromium. Screenshots start their own Vite server, exercise an isolated sample workspace and write 17 captures to `artifacts/screenshots`.

- [Product rules and data model](docs/SPEC.md)
- [Interface and verification guide](docs/UI-PREVIEW.md)
- [Third-party notices](THIRD-PARTY.md)

GitHub Actions checks type safety, formatting, lint, unit tests and production builds on Linux, macOS and Windows. The browser job runs Playwright and uploads screenshots. Desktop jobs produce macOS Apple Silicon/Intel DMGs, Windows x64 NSIS/MSI installers and Linux x64 AppImage/DEB/RPM packages. npm downloads, Cargo dependencies/build outputs, Tauri packaging tools and Playwright browsers are cached. All checks and all platform builds must pass before a version is published from main; published versions are left unchanged. See [release notes](docs/RELEASE-NOTES.md) for test-build installation details.

### Interface components

Forms use shadcn/ui components (Radix primitives, Tailwind CSS and Lucide). Source components live in `src/components/ui`; `components.json` configures the registry aliases. Selects, calendars, emoji pickers and menus render inside the app, with keyboard navigation and focus handling. Creating a view requires only a name and optional emoji; panels, filters, templates and layout can be configured after creation. The frameless Tauri window provides its own draggable title region and window controls. The sidebar uses a transparent webview over native Sidebar material on macOS and Acrylic on Windows; Linux transparency depends on the compositor.
