# Phase 2A backend design — preparation checkpoint

Status: design and unapplied migration draft only. Docker and the Supabase CLI are unavailable on this host. The explicit local-runtime stop condition prevents claiming a validated backend. No hosted environment is a substitute. Do not apply this draft to a hosted project.

Starting HEAD: `db4be5df9f0c4f5cf5b55b8e17a71d07c55c3620`. Approved application baseline: `12dc160f3b40dcba43e605dd2fd018ff9de8dd68`. Work branch: `codex/supabase-phase2`. Main/history and original assets remain intact.

## Current architecture audit

Reviewed model.ts, seed.ts, logic.ts, repository.ts, store.tsx, every mutate callback, component consumers, IMPLEMENTATION-REPORT.md, PHASE-1-BASELINE.md and BACKEND-READINESS.md.

Current entities: Person, Client, Project, Phase, Assignment, Task, Comment, Attachment, Milestone, SiteUpdate, Snag, DocumentRecord, HandoverItem, Activity and the Database aggregate. Project IDs connect phases/assignments/tasks/milestones/updates/snags/documents/checklist/activity. Tasks reference phase, parent, assignee and predecessor task IDs. Comments and attachments are embedded arrays. Assignments are separate from task assignees. No workspace/auth entities exist yet.

Repository.load/save and Store.mutate are synchronous. The store clones the whole Database, runs a callback, saves localStorage and returns a boolean; wizard/drawers immediately close and redirect on success. Components read a shared db snapshot but several directly change records inside mutate callbacks. These cannot safely be serialized as remote updates. Supabase must not save entire snapshots or trust browser-generated activity/actor IDs.

Mutation inventory:

| Current path | Required async command/transaction |
| --- | --- |
| Wizard/createProject | Create/select client + project + phases + template tasks + dependencies + milestones + assignments + checklist + activity |
| TaskDrawer/saveTask | Validate hierarchy/dependency graph, complete subtasks if requested, persist task/comments/file metadata + authenticated activity |
| Team | Assign/replace/remove project role + optional unfinished-task reassignment + history; one active manager |
| Workspace | Edit project fields/status; completion cannot bypass readiness |
| SiteUpdates | Create daily update + attach private object metadata + activity |
| Snags | Create/edit record + validated sequential transition + inspection/closure metadata + history |
| Documents | Create/update version/approval metadata + private object reference + history |
| Handover | Update manual item or validate/complete project in server transaction |
| Settings | Replace phase weights atomically with total 100; demo reset/export never exposed as backend destructive reset |

Seed uses mixed textual IDs (`person-0`, `project-0`, `client-0`) and random UUIDs for generated records. Dates depend on today. No browser data import is permitted. A future deterministic seed must map all IDs via a stable namespace UUID algorithm, fix a comparison date, and preserve the existing 7/16/56/259 record counts. It must not create 16 logins automatically.

LocalStorage is `azzora-demo-v1`, version 1. It contains browser data URLs up to 750 KB/file and demo activity actor `person-0`. Activity.previous serializes earlier values. None is an authenticated audit log. Existing demo mode remains unchanged at this checkpoint.

Derived values stay derived: child/parent progress, phase/project progress, current phase, dependency risk, health, active leaf-task workload, trade progress and automatic handover criteria. Phase weights default 10/20/5/15/5/35/7/3. The adapter derives managerId from active Project Manager assignments. Linked milestone dates derive from the linked task.

## Planned authoritative architecture

Supabase Auth session → active database workspace membership → centralized capability service → async DomainRepository commands → transactional PostgreSQL RPC → reload canonical authorized snapshot → existing derived functions → approved screens.

LocalDemoRepository and SupabaseRepository remain explicit modes. `VITE_DATA_MODE=local` is intentional demo; `supabase` requires valid configuration and real Auth, never silent local fallback. Boot/auth/data/save/upload errors must remain distinct; no optimistic multi-record writes. Network retries use idempotency keys and expected row revisions to prevent duplicate work/stale overwrites. The UI refactor is deferred until local transactional/RLS tests can run.

Auth users differ from operational team members. workspace_members links auth.users to a workspace and optionally team_members; membership role is authoritative text, not user-editable JWT metadata. Internal email/password login only, persistent/refreshable session, logout, unauthorized/loading states; no public registration. Recovery email delivery stays unclaimed without tested SMTP.

## Schema and authorization

See DATABASE-SCHEMA.md and AUTHORIZATION-MATRIX.md. Composite foreign keys bind tenant/project relationships; archive major records; restrict deletion of history. Private authorization helpers use authenticated identity, qualified names and empty search_path. No views, no duplicate project progress, no direct browser write grants in the draft. The read-policy foundation is unapplied and has not been security validated.

Write RPCs are not implemented at this checkpoint. Their contracts must validate role/project membership server-side, lock a project to serialize graph/weights/completion-sensitive changes, stamp auth.uid(), preserve old assignment/snag values, enforce required checklist/task/snag conditions and reject cross-tenant IDs. Reopening completed projects needs a defined operational policy; do not invent financial/legal authority. All project writes must share project locking so a task/snag edit cannot race completion. Public RPC wrappers should be SECURITY INVOKER; narrowly scoped private SECURITY DEFINER functions may be used only with explicit authorization, safe search_path and revoked default execute.

## Storage

See STORAGE-SECURITY.md. Private project documents/media buckets, canonical workspace/project prefixes, random unique names, metadata paths rather than permanent URLs. Validate sizes/MIME server/bucket side; authenticated download or short signed URLs. Upload then metadata attachment is not one database transaction: use pending-upload reservation, authorized finalization and orphan cleanup. Never persist base64 bytes in PostgreSQL or trust browser actor IDs.

## Stop/resume boundary

Prepared: design, normalized SQL draft, conservative read-policy draft, sanitized env template and preparation/security-test specifications. Not implemented/validated: runnable local config/migrations, Auth, remote repository/store/UI integration, write RPCs, seed/auth-user scripts, bucket policies, RLS/storage/transaction tests and authenticated journey. Install/enable Docker and the official CLI locally, then resume on this branch. Generate real migration filenames with `supabase migration new`; review/import the draft only after local reset tests are possible.

Documentation consulted: [local CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [storage access control](https://supabase.com/docs/guides/storage/security/access-control). Changelog index fetch was attempted but the browsing tool rejected its text/markdown content type; recheck relevant CLI/Auth/Storage changes before implementation.
