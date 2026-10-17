# Development

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
npm run screenshots:product
```

Install the Playwright browser with `npx playwright install chromium` before UI checks. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally selects an installed Chromium. Screenshots start their own Vite server, exercise an isolated sample workspace and write application captures to `artifacts/screenshots`.

- [Product rules and data model](SPEC.md)
- [Interface and verification guide](UI-PREVIEW.md)
- [Third-party notices](../THIRD-PARTY.md)

GitHub Actions checks type safety, formatting, lint, unit tests and production builds on Linux, macOS and Windows. The browser job runs Playwright and uploads screenshots. Desktop jobs produce macOS Apple Silicon/Intel DMGs, Windows x64 NSIS/MSI installers and Linux x64 AppImage/DEB/RPM packages. npm downloads, Cargo dependencies/build outputs, Tauri packaging tools and Playwright browsers are cached. All checks and all platform builds must pass before a version is published from main; published versions are left unchanged. See the [current release notes](RELEASE-NOTES.md).

Product README captures are regenerated with `npm run screenshots:product` into `docs/images`. They use fictional sample tasks and work entries in an isolated browser workspace.

The macOS desktop module explicitly clears AppKit/WebKit backgrounds and lowers the native material layer opacity. Its desktop appearance must be verified on macOS; browser screenshots only validate the web content.
