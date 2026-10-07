# Database schema preparation

Unapplied SQL: `supabase/drafts/phase2-schema.sql`. It is deliberately outside migrations; the official CLI is unavailable. Do not represent this as an applied/validated migration. After local prerequisites exist, use CLI-generated migration filenames and validate reset/replay before adopting the draft.

| Table | Purpose / relationships |
| --- | --- |
| workspaces | Company boundary, unique slug |
| team_members | Operational personnel; optional login; no derived workload |
| workspace_members | Auth user ↔ workspace ↔ optional team member; validated text access role; active flag |
| clients | Workspace client/contact, archive |
| projects | Client, code, location/scope/type/value/dates/status; no manager/progress duplicate |
| project_phases | Project weights/order; no progress duplicate |
| project_assignments | Project/person/role and replacement history; canonical active manager |
| tasks | Project/phase/parent/assignee, dates, leaf progress/status/priority/trade/allocation/notes |
| task_dependencies | Same-project predecessor/successor, finish_to_start |
| milestones | Linked task date source or standalone date, never both |
| task_comments | Task text with authenticated author |
| task_attachments | Private object metadata linked to task |
| site_updates | Date, work, issue, tomorrow, manpower, notes, authenticated author |
| site_update_photos | Categorized private object metadata linked to update |
| snags | Sequential status model, responsibility, inspection and closure metadata |
| snag_media | Before/after private object metadata |
| documents | Versioned metadata/category/approval with optional private path |
| handover_items | Applicable/required manual or derived completion; automatic flags cannot be manually persisted |
| activities | Operational authenticated history + prior values in metadata, not a compliance audit |

UUID primary IDs; workspace_id on tenant-owned records; composite workspace/project/person/phase/parent FKs prevent cross-tenant linkage. Deletes restrict historical relationships; main records use archive timestamps. Dates are date; audit times are timestamptz. Role/status values use checked text, preserving existing UI labels to avoid needless behavior changes. Case-insensitive workspace/code uniqueness handles concurrent insert conflicts. One active manager partial unique index prevents competing assignments.

Query-driven indexes cover active auth membership, active person/project assignments, assignee/due tasks, dependency successor, phase order, site dates, activity dates, snag status and document category. Existing composite unique indexes also serve project-child lookups. Additional indexing must follow measured local query plans.

Future transactions/triggers must enforce phase totals 100, hierarchy depth/cycles, dependency cycles under project locking, sequential snag transitions, readiness under concurrent mutations, server actor stamping, completion/status consistency, updated_at, revision checks and atomic activity creation. CHECK/FK constraints do not implement those workflows. No RPC functions or write policies are included yet. Do not mistake the draft for a complete writable backend.

No views are introduced. Minimal private read helpers bypass membership-policy recursion but have no arbitrary SQL or mutation capability. Their execute privileges are revoked from PUBLIC/anon and narrowly granted to authenticated. All nineteen public business tables enable RLS and explicitly revoke default privileges; only authenticated SELECT is granted with scoped policies. All client writes are denied.
