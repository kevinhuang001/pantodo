# Pantodo

A quiet place for your Todos, planned time and actual work. Pantodo combines a playful paper desk with a mint glass sidebar, a calendar, a work timer and saved views built from independently filtered panels.

The current application runs in a browser and stores its workspace on the device. The native Tauri host, installers and OS power-event integration remain separate work.

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

Normal page/window exit synchronously saves and stops the owner’s timer. Durable five-second heartbeats recover interrupted sessions: a gap longer than 30 seconds closes the session at its last heartbeat. This browser fallback cannot distinguish every short system sleep from normal execution or every background-throttling event; native OS sleep handling requires the desktop host.

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

Install the Playwright browser with `npx playwright install chromium` before UI checks. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally selects an installed Chromium. Screenshots start their own Vite server, exercise an isolated sample workspace and write 16 captures to `artifacts/screenshots`.

- [Product rules and data model](docs/SPEC.md)
- [Interface and verification guide](docs/UI-PREVIEW.md)
- [Third-party notices](THIRD-PARTY.md)

GitHub Actions checks type safety, formatting, lint, unit tests and production builds on Linux, macOS and Windows; the Linux UI job runs Playwright and uploads screenshots.
