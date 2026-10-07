# Provisional authorization matrix

This is a design proposal from the user's provisional model, not signed-off company authority. RLS must enforce it independently of frontend capability checks. The preparation draft implements only deny-by-default writes and workspace/project-scoped reads; the remaining write capabilities are not yet available.

| Role | Read scope | Planned writes | Explicit exclusions |
| --- | --- | --- | --- |
| owner_admin | All non-archived workspace projects | Workspace/team administration and operational management | Other workspaces |
| operations_manager | All non-archived workspace projects | Create/edit projects; assign team; manage tasks, programmes, site, snags, documents, handover | Membership/security/ownership administration |
| project_manager | Actively assigned projects | Assigned-project operational tasks/programme, site, snags, documents, checklist | Workspace members, unrelated projects, unrestricted project creation |
| designer / quantity_surveyor / site_engineer / mep_engineer / procurement / site_supervisor | Actively assigned projects | Own assigned task progress/comments; relevant site records and snag contributions, subject to next-stage command policy review | Unrelated projects, memberships/security, team administration, project completion |
| inactive member / non-member / anonymous | None | None | All business data |

Workspace roles come from workspace_members, not editable user_metadata. Assignment uses team_member_id, not auth user ID. A user without a linked operational person has project access only through owner/operations role; do not grant implicit project access. Team directory read is workspace-scoped. Client read is restricted to accessible projects unless owner/operations. Membership read currently returns only the caller's active memberships. Future owner administration needs a dedicated authorized command/read path.

Read helpers have authenticated identity checks, qualified tables, empty search_path and explicit execute grants. They are private and never accept an arbitrary actor ID. Cross-tenant/project relationship integrity uses composite foreign keys.

Outstanding decisions before write implementation: exact other-role field permissions (including task progress vs assignee/dates), document approval authority, snag inspection/closure authority, phase-weight authority for operations/PM, archive/reopen authority and owner membership provisioning/revocation workflow. Until defined and locally tested, deny those writes. No company financial/legal powers are inferred.
