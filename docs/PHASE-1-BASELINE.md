# AZZORA Phase 1 baseline

Prepared and revalidated on 7 October 2026 (Asia/Dubai).

## Baseline revision

- Branch: `main`
- Exact front-end baseline commit SHA: `12dc160f3b40dcba43e605dd2fd018ff9de8dd68`
- Commit message: `feat: establish Azzora CRM frontend baseline`
- Baseline includes 64 files: application source, domain logic and tests, browser verification script, package manifest/lock, build/lint/TypeScript configs, README, existing verification/backend documentation, original Stitch HTML/design/screenshots/ZIP, supplied logo PDF and derived local logo asset.
- This document is committed afterward in a documentation-only commit to record the immutable baseline SHA. A commit cannot contain its own SHA. The documentation commit does not change application behavior.
- No remote configured and no push or deployment performed. Local Git identity: `Codex <codex@local.invalid>`; no global identity settings changed.

## Stack

React 19.3.0, React DOM 19.3.0, Vite 6.4.4, strict TypeScript 5.9.3, npm with committed package-lock.json, Zod 3.25.76, Lucide React, Vitest 4.1.11, ESLint 9.39.5, Playwright 1.63.0 and Prettier. Installed dependencies were present and `npm ls --depth=0` passed; reinstall was unnecessary.

## Architecture

- `src/domain/model.ts`: typed entities and explicit relationships.
- `src/domain/seed.ts`: centralized fictional UAE seed data and plan/checklist factories.
- `src/domain/logic.ts`: task hierarchy, phase/project progress, health, dependency risk, workload and readiness calculations.
- `src/domain/repository.ts`: repository contract, browser persistence and validated commands.
- `src/store.tsx`: shared state and atomic validated mutations.
- `src/components/`: reusable screens, wizard, task drawer, Gantt, operations, team and handover.
- `src/App.tsx`: application shell, hash navigation, search, notifications, reports and settings.
- `src/styles.css`: approved Stitch-derived tokens and responsive layouts.

No UI redesign, application behavior changes, dependency changes or domain-rule changes were made while preparing this baseline. Only ignore rules and this baseline document were added/updated.

## Supported modules

Dashboard; project directory with filters/views; five-step project creation and draft saving; project workspace; weighted phase/task/trade progress; planning/Gantt with dependencies and subtasks; shared task register/editor; team assignments/replacements and workload; daily site updates/photos; snag rectification and inspection history; document metadata/approval and small local attachments; handover readiness and confirmed completion; global search; demo notifications; portfolio CSV reports; demo export/reset and phase-weight settings.

Seed data: 7 projects, 16 employees, 56 phases and 259 tasks, with related assignments, milestones, site records, snags and documents.

## Routes

Primary hash routes:

`#/dashboard`, `#/projects`, `#/planning`, `#/tasks`, `#/team`, `#/site-updates`, `#/snags-qa`, `#/documents`, `#/handover`, `#/reports`, `#/settings`.

Project workspace routes:

`#/projects/:id/overview`, `#/projects/:id/timeline`, `#/projects/:id/tasks`, `#/projects/:id/team`, `#/projects/:id/site-updates`, `#/projects/:id/documents`, `#/projects/:id/snags-qa`, `#/projects/:id/handover`.

## Persistence

Browser-local localStorage under `azzora-demo-v1`. Mutations clone/validate/save before updating shared state. Small attachments use local data URLs (750 KB per-file limit); quota/read errors are surfaced. Seeded documents are metadata-only. This provides no authentication, authorization, cloud durability, backup, collaboration or cross-device sync. Export local demo data before resetting or clearing the browser.

## Baseline validation

| Check | Result |
| --- | --- |
| `npm ls --depth=0` | Passed; no install needed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, no errors/warnings reported |
| `npm test` | Passed: 13 domain tests |
| `npm run build` | Passed; production output generated in ignored `dist/` |
| `npm run test:browser` | Passed: 66 primary-route/viewport checks, no page overflow or browser errors, complete project-to-handover journey |

Domain tests cover weighted progress, task completion and hierarchy, dependency validity/risk, health, workload, readiness gating, snag transitions/history, standard/custom project plans, milestone date synchronization and invalid task input.

Browser verification covers 11 routes at 1440×900, 1280×800, 1024×768, 768×1024, 430×932 and 390×844. It also verifies project creation, client/scope/team/template selection, task editing/dependencies/progress, task creation, team replacement/reassignment/history, daily update/photo upload, document approval/attachment, snag inspection/closure, checklist gating, confirmed handover and persistence after reload. It uses an isolated headless Chrome context, requires the dev server at port 5173, and currently assumes the standard macOS Chrome executable path.

## Ignored files and preserved evidence

Ignored: `node_modules/`, `dist/`, coverage, Playwright reports/cache/auth state, test-results/blob-report, generated artifacts/screenshots, the four generated `docs/*.png` verification screenshots and `docs/browser-validation.json`, environment values (`.env`, `.env.*`, `*.local`), local `.npmrc`, AWS/credential directories, private key/certificate files, agent/editor state, OS files, logs and temporary files.

`.env.example` and `.env.sample` may be committed as sanitized templates; neither exists at this baseline. Patterns were verified with `git check-ignore`. Generated evidence remains on disk and can be regenerated; written verification documentation remains versioned. Original Stitch reference screenshots are versioned source assets and are intentionally preserved.

## Secret review

Scanned project text/config/source/docs and text members of the original Stitch ZIP (62 text files/archive members) for private keys, common provider tokens, JWTs and credential assignments. No matches found. No local environment or credential files found. Reviewed the staged file list to confirm generated/local/sensitive paths were excluded. This is a pattern-based review, not a guarantee against every possible secret format. No secret values were printed or committed.

## Known limitations and missing fonts

Front-end demo only: no real identity, server permissions, backend, multi-user collaboration, private cloud file storage, concurrency handling, backups or deployment. Operational activity records are demo history, not an authenticated security audit. Handover document/client/commercial confirmations are manual. Dependencies indicate risk but do not move dates. Gantt does not support date dragging. People search opens the team module. Large desktop planning tables scroll within their panel.

Inter and Space Grotesk font binaries were not supplied; system sans-serif fallbacks remain. The supplied Drive folder was inaccessible to the connected account. No replacement fonts were downloaded. Original Stitch assets are retained unchanged, including one pre-existing whitespace warning in the mobile timeline HTML export.

## Backend work remaining

Agree authenticated identities and role/access policies; implement async entity repositories; normalized schema, foreign keys/indexes and transaction-safe mutations; server validation and authorization; private object storage; optional realtime; concurrency/duplicate-code safeguards; backups and access-control/integration tests. Confirm company payment/VAT, procurement/variation/contract authority, retention, penalties, commercial closure and formal client sign-off rules before implementing them.

No Supabase resources, database connections, hosted migrations, production secrets, paid services, deployment or production infrastructure changes were created. Backend work is outside this task.
