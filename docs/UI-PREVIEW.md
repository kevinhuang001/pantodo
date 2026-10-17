# Interface and verification guide

Capture and inspect the current application in an isolated sample workspace.

## Screens

1. **Create** — one writing card with borderless title/notes, a random localized phrase, project/tags and optional scheduling; no extra captions or footer.
2. **Todo lists** — content and classification on the left, dates and work controls on the right. Open an editor by clicking content; start work with the play button.
3. **Calendar** — day/week/month, date navigation, continuous time-grid zoom, plan blocks and independent deadline lines. Click to edit; Todos do not drag.
4. **Work timer** — a persistent bar across pages with pause/resume/stop. Planned time is separate from actual work.
5. **Statistics** — date/project/tag filters, daily bars, category breakdown, per-Todo estimates/actuals, manual entry and correction, CSV and a ledger.
6. **Views** — compact list, card gallery, status board and independently filtered panels; persistent presentation, pointer/touch/keyboard panel sorting, column spans and editable Eisenhower template.
7. **Focus** — starting a task counts down 3 seconds, then fills the right pane; the sidebar remains available and no OS fullscreen is requested.
8. **Settings** — the only theme/language controls, plus week start, default plan duration and JSON export.

## Reproduce captures

```bash
npm ci
npx playwright install chromium
npm run screenshots
```

The command starts/stops Vite itself and uses a separate browser context with sample Todos and a fixed demonstration date. Work records are entered through the real forms. It outputs 21 PNGs in `artifacts/screenshots`, including scheduling, timer, day/week/month calendar, statistics, manual-entry dialog, panel editor, theme/settings and small-window layouts, gallery, board and view dialogs.

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an installed Chromium. `npm run e2e` covers the workflows; `npm test`, typecheck, lint, format and build cover the code.

The screenshots show the browser application. Native window translucency and physical system-sleep handling have not been verified; the browser interruption policy is documented in [SPEC.md](SPEC.md).
