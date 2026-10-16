# Pantodo

A glass-morphic desktop task manager: tasks that may or may not have a time, a Google-Calendar-style
timetable, tags, projects, custom views (including an Eisenhower matrix built from four tags),
repeating tasks, a timer, 20-minute-ahead reminders and time statistics.

Built as a **Tauri 2 desktop app** (Linux / Windows / macOS) with a **Rust core** owning all business
logic and SQLite, and a **React + TypeScript** front end styled in the same frosted-glass visual
language as [Glassmark](https://github.com/kevinhuang001/bookmark-web).

## Status

| Milestone | Scope                                                                                                                                                                              | State       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **M1**    | Foundation: repo, tooling, design tokens (light + dark), app shell, i18n, `Bridge` layer, task/tag/project CRUD, list view, status, trash, archive, preset views, quadrant example | in progress |
| M2        | Timetable + scheduling + recurrence (introduces the Rust core)                                                                                                                     | planned     |
| M3        | Timer + statistics                                                                                                                                                                 | planned     |
| M4        | Reminders + tray + autostart + notifications                                                                                                                                       | planned     |
| M5        | Full view system (custom views, group drag, board / quadrant / grid arrangements) + polish                                                                                         | planned     |
| M6        | WebDAV sync + CI integration tests against a real WebDAV server + release packaging                                                                                                | planned     |

The full agreed specification lives in [docs/SPEC.md](docs/SPEC.md).

## Quick start

Requires Node >= 22.12.

```bash
npm install
npm run dev          # http://localhost:1420
```

In M1 the app runs in a plain browser against a fixture-backed `Bridge`; the Tauri shell and the Rust
core arrive in M2.

## Checks

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run format:check  # prettier
npm test              # vitest (unit, node environment)
npm run e2e           # playwright against the dev server
npm run build         # typecheck + production bundle
npm run screenshots   # headless screenshots into artifacts/
```

`npm run verify`-style gating happens in CI: see [.github/workflows/ci.yml](.github/workflows/ci.yml).
