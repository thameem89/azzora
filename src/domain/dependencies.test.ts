import { describe, it, expect } from "vitest";
import { seed } from "./seed";
import { dependencyError, dependencyState, days } from "./logic";
import { saveTask } from "./repository";
const setup = () => {
  const db = seed();
  const tasks = db.tasks.filter((t) => t.projectId === "project-0").slice(0, 5);
  tasks.forEach((t) => {
    t.dependencies = [];
    t.progress = 0;
    t.status = "Not Started";
    t.start = "2026-10-10";
    t.due = "2026-10-12";
  });
  return { db, tasks };
};
describe("activity dependencies", () => {
  it("accepts multiple predecessors and removes links without rescheduling", () => {
    const {
      db,
      tasks: [a, b, c],
    } = setup();
    const dates = [c.start, c.due];
    saveTask(db, { ...c, dependencies: [a.id, b.id] });
    const saved = db.tasks.find((t) => t.id === c.id)!;
    expect(dependencyState(db, saved).blockers.map((t) => t.id)).toEqual([
      a.id,
      b.id,
    ]);
    saveTask(db, { ...saved, dependencies: [] });
    expect(
      dependencyState(
        db,
        db.tasks.find((t) => t.id === c.id)!,
      ).blockers,
    ).toEqual([]);
    expect([saved.start, saved.due]).toEqual(dates);
  });
  it("explains self, duplicate, missing and cross-project links", () => {
    const {
      db,
      tasks: [a, b],
    } = setup();
    expect(dependencyError(db, a, [a.id])).toContain("itself");
    expect(dependencyError(db, a, [b.id, b.id])).toContain("already exists");
    expect(dependencyError(db, a, ["missing"])).toContain("same project");
    expect(
      dependencyError(db, a, [
        db.tasks.find((t) => t.projectId !== a.projectId)!.id,
      ]),
    ).toContain("same project");
    expect(() => saveTask(db, { ...a, dependencies: [b.id, b.id] })).toThrow(
      "already exists",
    );
  });
  it("rejects direct and long indirect cycles before saving", () => {
    const {
      db,
      tasks: [a, b, c, d, e],
    } = setup();
    b.dependencies = [a.id];
    expect(dependencyError(db, a, [b.id])).toContain("circular");
    c.dependencies = [b.id];
    d.dependencies = [c.id];
    e.dependencies = [d.id];
    expect(() => saveTask(db, { ...a, dependencies: [e.id] })).toThrow(
      "circular",
    );
    expect(a.dependencies).toEqual([]);
  });
  it("clears blockers on completion and detects conflicts independently of status", () => {
    const {
      db,
      tasks: [a, b, c],
    } = setup();
    c.dependencies = [a.id, b.id];
    a.status = "Completed";
    a.progress = 100;
    expect(dependencyState(db, c).blockers).toEqual([b]);
    expect(dependencyState(db, c).conflicts).toEqual([a, b]);
    b.progress = 100;
    expect(dependencyState(db, c).blockers).toEqual([]);
  });
  it("recalculates conflicts after date edits without cascading successor dates", () => {
    const {
      db,
      tasks: [a, b],
    } = setup();
    a.due = "2026-10-10";
    b.dependencies = [a.id];
    expect(dependencyState(db, b).conflicts).toEqual([]);
    saveTask(db, { ...a, due: "2026-10-15" });
    expect(dependencyState(db, b).conflicts.map((t) => t.id)).toEqual([a.id]);
    expect([b.start, b.due]).toEqual(["2026-10-10", "2026-10-12"]);
    expect(days(b.start, b.due) + 1).toBe(3);
  });
});
