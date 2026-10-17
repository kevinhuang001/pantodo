# Interface and verification guide

The paper-desk visual direction now includes functional scheduling, a work timer, time-entry editing, statistics and saved composed views.

## Screens

1. **Create** — decorative notes from real open Todos, central title/notes form, multiple tags and project, expandable planned interval/deadline/estimate.
2. **Todo lists** — content and classification on the left, dates and work controls on the right. Open an editor by clicking content; start work with the play button.
3. **Calendar** — day/week/month/agenda, date navigation, continuous time-grid zoom, plan blocks and independent deadline lines. Click to edit; Todos do not drag.
4. **Work timer** — a persistent bar across pages with pause/resume/stop. Planned time is separate from actual work.
5. **Statistics** — date/project/tag filters, daily bars, category breakdown, per-Todo estimates/actuals, manual entry and correction, CSV and a ledger.
6. **Composed views** — saved independent panel filters, emoji, panel move handles/buttons, column spans and an editable Eisenhower template.
7. **Focus** — starting a task counts down 3 seconds, then fills the right pane; the sidebar remains available and no OS fullscreen is requested.
8. **Settings** — the only theme/language controls, plus week start, default plan duration and JSON export.

## Reproduce captures

```bash
npm ci
npx playwright install chromium
npm run screenshots
```

The command starts/stops Vite itself and uses a separate browser context with sample Todos and a fixed demonstration date. Work records are entered through the real forms. It outputs 16 PNGs in `artifacts/screenshots`, including scheduling, timer, day/week/month calendar, statistics, manual-entry dialog, panel editor, theme/settings and minimum-size layouts.

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an installed Chromium. `npm run e2e` covers the workflows; `npm test`, typecheck, lint, format and build cover the code.

The screenshots show the browser application. Native window translucency and physical system-sleep handling have not been verified; the browser interruption policy is documented in [SPEC.md](SPEC.md).
