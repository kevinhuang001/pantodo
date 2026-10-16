# Interface review — October 2026

This iteration implements the first visual direction for review before the remaining product decisions.

- A mint frosted sidebar sits beside a clear cream content surface. Rounded paper illustrations and quiet doodles provide the playful character.
- **Create** replaces Inbox and is the landing page. The central form uses the existing task creation flow. Background notes show up to six real, open task titles; they are decorative, excluded from the accessibility tree and never accept input.
- Todo rows give the title, description and tags room on the left, with due dates and estimates aligned on the right. Existing editing, status, deletion and restore actions remain available.
- Timetable is a primary navigation item. Editable custom views have their own sidebar section. The dedicated seeded quadrant entry is no longer shown in navigation.
- **My workbench** is explicitly labeled as a layout preview: three example panels show project tasks, unassigned tasks and completed tasks. Grid and vertical arrangements can be compared. These example filters are fixed; a saved panel model, independent filter editor, arbitrary panel placement and quadrant templates are deferred until design feedback.
- Light/dark and Chinese/English/Japanese copy follow the existing settings.

## Preview and verification

Run `npm run dev` for the interface and `npm run screenshots` for the six review screenshots in `artifacts/screenshots`. Screenshot capture starts and stops its own Vite server. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally selects an installed browser; otherwise Playwright uses its default installation.

`npm run e2e` covers capture and reload, task edits/status/trash, navigation, the decorative background, panel arrangements, language/theme, custom views, settings and timetable. Use the existing type, lint, format, unit and production-build commands as well.
