import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const sql = readFileSync(
  new URL("../supabase/drafts/phase2-schema.sql", import.meta.url),
  "utf8",
);
const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map(
  (m) => m[1],
);
describe("unapplied backend preparation security invariants", () => {
  it("enables RLS and revokes default client grants on every business table", () => {
    expect(tables).toHaveLength(19);
    for (const table of tables) {
      expect(sql).toContain(
        `alter table public.${table} enable row level security;`,
      );
      expect(sql).toContain(
        `revoke all on public.${table} from public,anon,authenticated;`,
      );
      expect(sql).toContain(`create policy ${table}_authorized_read`);
    }
  });
  it("keeps privileged helpers private, identity-bound, and narrowly executable", () => {
    const functions = [...sql.matchAll(/create function (\w+)\.(\w+)/g)];
    expect(functions).toHaveLength(3);
    for (const f of functions) {
      expect(f[1]).toBe("private");
    }
    expect(sql.match(/security definer set search_path = ''/g)).toHaveLength(3);
    expect(sql.match(/select auth.uid\(\) is not null/g)).toHaveLength(3);
    expect(sql.match(/revoke all on function private\./g)).toHaveLength(3);
    expect(sql).not.toMatch(/user_metadata|create view|grant .* to anon/i);
  });
  it("denies client writes until transaction/RPC validation is available", () => {
    expect(sql).not.toMatch(/grant\s+(?:all|insert|update|delete)/i);
    expect(sql).not.toMatch(
      /for\s+(?:all|insert|update|delete)\s+to authenticated/i,
    );
    expect(sql).toContain("UNAPPLIED PREPARATION DRAFT");
  });
  it("enforces composite tenant/project references and manager/code uniqueness", () => {
    expect(sql).toContain(
      "foreign key(workspace_id,project_id,predecessor_task_id)",
    );
    expect(sql).toContain(
      "foreign key(workspace_id,project_id,successor_task_id)",
    );
    expect(sql).toContain("check(predecessor_task_id<>successor_task_id)");
    expect(sql).toContain("unique(predecessor_task_id,successor_task_id)");
    expect(sql).toContain("projects_workspace_code_ci");
    expect(sql).toContain("one_active_project_manager");
    expect(sql).not.toMatch(/on delete cascade/i);
  });
  it("keeps derived project values and file bytes out of persistent records", () => {
    expect(sql).not.toMatch(
      /project_manager_id|project_progress|phase_progress|data_url|base64|bytea/i,
    );
    expect(sql).toContain("completion_mode<>'manual' and completed is null");
    expect(sql).toContain("check(linked_task_id is null or due_date is null)");
    expect(sql).toContain("storage_path text");
  });
  it("has no credential values in the environment template", () => {
    const env = readFileSync(
      new URL("../.env.example", import.meta.url),
      "utf8",
    );
    const entries = env.split("\n").filter((l) => l && !l.startsWith("#"));
    for (const e of entries) {
      const [key, value] = e.split("=");
      expect(value).toBe(key === "VITE_DATA_MODE" ? "local" : "");
    }
    expect(env).not.toContain("VITE_SUPABASE_SERVICE_ROLE");
  });
});
