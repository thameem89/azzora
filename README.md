# AZZORA — Interior Fit-Out Project Control

A functional, browser-local demo adapted from the supplied Google Stitch screens. Original HTML, screenshots, ZIP and logo PDF are retained unchanged.

## Run

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

Open the Vite Local URL. All routes use hash navigation, so the static build does not require server rewrites.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
```

Browser verification uses headless Google Chrome at the standard macOS application path. The dev server must be running on port 5173. It uses an isolated browser context and does not modify your normal Chrome profile.

## Architecture

- `src/domain/model.ts`: strict relationship types.
- `src/domain/seed.ts`: fictional UAE data, standard plan and checklist factories.
- `src/domain/logic.ts`: weighted progress, hierarchy, risk, workload, handover and date rules.
- `src/domain/repository.ts`: repository contract, browser persistence and validated domain commands.
- `src/store.tsx`: shared application state and atomic mutations; persistence failure leaves the visible data unchanged.
- `src/components/`: shell content, directory, dashboard, wizard, workspace, shared task drawer, planning, operations, team and handover.
- `src/styles.css`: local tokens translated from Stitch's Architectural Prestige design, responsive navigation and mobile task programme.
- `tests/browser.mjs`: route/viewport and full delivery journey checks.

## Demo boundaries

Seven projects, sixteen employees, 259 tasks, weighted phases, milestones, team assignments, updates, snags and document metadata. These are fictional examples. Current demo actor is Sarah Mansoor. Records are stored under `azzora-demo-v1` in browser localStorage. Export from Settings before resetting or clearing the browser.

LocalStorage supplies no authentication, authorization, backups, collaboration or durable cloud file storage. Small attachments (up to 750 KB each) are browser-local data URLs; quota errors are surfaced and do not commit a mutation. Seeded documents have metadata only. No backend or production deployment was created.

Inter and Space Grotesk are referenced by Stitch but no font binaries were supplied. The application uses system sans-serif fallbacks without downloading fonts. The displayed logo is a rendered crop from the supplied PDF; the original is preserved.

See [initial audit](docs/INITIAL-AUDIT.md), [implementation report](docs/IMPLEMENTATION-REPORT.md) and [backend readiness](docs/BACKEND-READINESS.md).
