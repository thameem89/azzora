# Backend readiness

The front end currently has no backend. Repository.load/save is deliberately isolated from components, and domain commands validate mutations before committing shared state. For a remote implementation, replace whole-database local transactions with async entity queries/commands while preserving the domain calculation functions and component view models. Introduce loading/error states at those async boundaries.

Proposed normalized tables mirror model.ts: users, team_members, clients, projects, project_phases, project_assignments, tasks, task_dependencies, milestones, site_updates, site_photos, snags, documents, handover_items, activities. Add foreign keys and indexes for project, phase, assignee and due date. Store files in private object storage with metadata in the database; enforce upload size/type policies server-side. Keep replacement/removal assignment history and prior snag activity.

Before connecting a hosted service, implement authenticated users and server-enforced role permissions. Owner/Admin, Operations Manager, Project Manager, Designer, Site Engineer, MEP Engineer, Quantity Surveyor, Procurement and Site Supervisor roles must be agreed. Route hiding is not authorization. Validate dependencies, dates, phase weights and handover completion again on the server, inside transactions. Protect against concurrent edits, duplicate codes, cross-project dependency links and stale handover checks. Add integration tests for access control and multi-user concurrency. Replace the demo activity actor with the authenticated identity; current records are operational demo history, not a security audit.

No hosted database, project, migration, paid resource or secret was created. Authentication, row-level authorization, private storage, optional realtime, migrations, backups and deployment remain future work requiring explicit authorization.

Unresolved company rules: payment milestones, VAT/tax, procurement/variation/contract approval authority, retention, penalties, accounting closure and formal client sign-off wording. This demo makes no policy assumptions; commercial closure is a manually confirmed checklist indicator.
