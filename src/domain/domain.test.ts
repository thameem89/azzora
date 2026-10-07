import { describe, it, expect } from "vitest";
import { seed, blankTask } from "./seed";
import {
  projectProgress,
  phaseProgress,
  workload,
  handoverState,
  health,
  validDependency,
  canTransition,
  taskProgress,
  addDays,
  today,
  dependencyRisk,
} from "./logic";
import {
  saveTask,
  createProject,
  transitionSnag,
  completeProject,
} from "./repository";
import type { Database } from "./model";
function small(): Database {
  const db = seed();
  const p = db.projects[0];
  db.projects = [p];
  db.phases = db.phases.filter((ph) => ph.projectId === p.id);
  db.tasks = db.tasks.filter((t) => t.projectId === p.id);
  db.tasks.forEach((t) => {
    t.progress = 0;
    t.status = "Not Started";
    t.start = today();
    t.due = addDays(today(), 7);
    t.dependencies = [];
  });
  db.documents = [];
  return db;
}
describe("connected delivery rules", () => {
  it("calculates weighted phases without disconnected percentages", () => {
    const db = small();
    const phase = db.phases[1];
    db.tasks
      .filter((t) => t.phaseId === phase.id)
      .forEach((t) => {
        t.progress = 100;
        t.status = "Completed";
      });
    expect(phaseProgress(db, phase.id)).toBe(100);
    expect(projectProgress(db, db.projects[0].id)).toBe(20);
  });
  it("normalizes configurable phase weights", () => {
    const db = small();
    db.phases[0].weight = 50;
    db.phases.slice(1).forEach((p) => (p.weight = 0));
    db.tasks
      .filter((t) => t.phaseId === db.phases[0].id)
      .forEach((t) => (t.progress = 50));
    expect(projectProgress(db, db.projects[0].id)).toBe(50);
  });
  it("completes tasks and removes active allocation", () => {
    const db = small();
    const t = db.tasks[0];
    const before = workload(db, t.assigneeId);
    saveTask(db, { ...t, status: "Completed" });
    expect(db.tasks[0].progress).toBe(100);
    expect(db.tasks[0].completedAt).toBeTruthy();
    expect(workload(db, t.assigneeId)).toBe(before - t.allocation);
    expect(db.activities[0].entityId).toBe(t.id);
  });
  it("rolls subtasks into parent progress without double counting", () => {
    const db = small();
    const parent = db.tasks[0];
    const child = {
      ...blankTask(parent.projectId, parent.phaseId, parent.assigneeId),
      name: "Subtask",
      parentId: parent.id,
      progress: 50,
    };
    saveTask(db, child);
    expect(
      taskProgress(
        db,
        db.tasks.find((t) => t.id === parent.id)!,
      ),
    ).toBe(50);
    expect(db.tasks.find((t) => t.id === parent.id)!.status).toBe(
      "In Progress",
    );
  });
  it("rejects dependency cycles and cross-project references", () => {
    const db = small();
    const [a, b] = db.tasks;
    a.dependencies = [b.id];
    expect(validDependency(db, b.id, [a.id])).toBe(false);
    expect(validDependency(db, a.id, [a.id])).toBe(false);
    expect(validDependency(db, b.id, ["missing"])).toBe(false);
  });
  it("flags dependency delay without moving contractual dates", () => {
    const db = small();
    const [a, b] = db.tasks;
    a.due = addDays(today(), -1);
    b.dependencies = [a.id];
    const due = b.due;
    expect(dependencyRisk(db, b)).toBe(true);
    expect(health(db, a.projectId)).toBe("Delayed");
    expect(b.due).toBe(due);
  });
  it("derives risk, hold and completion states", () => {
    const db = small();
    db.tasks[0].status = "Blocked";
    expect(health(db, db.projects[0].id)).toBe("At Risk");
    db.projects[0].status = "On Hold";
    expect(health(db, db.projects[0].id)).toBe("On Hold");
    db.projects[0].status = "Completed";
    expect(health(db, db.projects[0].id)).toBe("Completed");
  });
  it("requires tasks, snags and required checklist confirmations", () => {
    const db = small();
    const id = db.projects[0].id;
    expect(handoverState(db, id).ready).toBe(false);
    expect(() => completeProject(db, id)).toThrow();
    db.tasks.forEach((t) => {
      t.progress = 100;
      t.status = "Completed";
    });
    db.snags
      .filter((s) => s.projectId === id)
      .forEach((s) => (s.status = "Closed"));
    db.handover
      .filter((h) => h.projectId === id)
      .forEach((h) => (h.complete = true));
    expect(handoverState(db, id).percent).toBe(100);
    completeProject(db, id);
    expect(db.projects[0].status).toBe("Completed");
  });
  it("preserves snag transition history and requires inspection", () => {
    const db = small();
    const s = db.snags[0];
    s.status = "Open";
    expect(canTransition("Open", "Closed")).toBe(false);
    expect(() => transitionSnag(db, s.id, "Closed")).toThrow();
    transitionSnag(db, s.id, "Assigned");
    transitionSnag(db, s.id, "Rectification");
    transitionSnag(db, s.id, "Ready for Inspection");
    s.inspection = "";
    expect(() => transitionSnag(db, s.id, "Closed")).toThrow();
    s.inspection = "Verified on site";
    transitionSnag(db, s.id, "Closed");
    expect(s.closedAt).toBeTruthy();
    expect(db.activities.filter((a) => a.entityId === s.id)).toHaveLength(4);
  });
  it("creates a project with client, team, plan and handover relationships", () => {
    const db = small();
    const p = {
      ...db.projects[0],
      id: "new-project",
      clientId: "new-client",
      code: "AZ-100",
      name: "Test Fit-Out",
    };
    const before = db.tasks.length;
    createProject(
      db,
      p,
      "Test client",
      "Client rep",
      { "Site Engineer": "person-3" },
      true,
    );
    expect(db.tasks.length - before).toBe(37);
    expect(db.phases.filter((ph) => ph.projectId === p.id)).toHaveLength(8);
    expect(
      db.assignments.some(
        (a) => a.projectId === p.id && a.personId === "person-3",
      ),
    ).toBe(true);
    expect(db.handover.filter((h) => h.projectId === p.id)).toHaveLength(12);
    expect(() => createProject(db, p, "Test", "", {}, false)).toThrow();
  });
  it("keeps linked milestone dates synchronized with task edits", () => {
    const db = small();
    const m = db.milestones.find((m) =>
      db.tasks.some((t) => t.id === m.taskId),
    )!;
    const task = db.tasks.find((t) => t.id === m.taskId)!;
    const date = addDays(today(), 14);
    saveTask(db, { ...task, due: date });
    expect(m.due).toBe(date);
  });
  it("rejects invalid task dates and progress without mutating data", () => {
    const db = small();
    const task = db.tasks[0];
    expect(() => saveTask(db, { ...task, progress: 120 })).toThrow();
    expect(() =>
      saveTask(db, { ...task, due: addDays(task.start, -1) }),
    ).toThrow();
    expect(db.tasks[0].progress).toBe(0);
  });
  it("creates custom phases with no unintended dependencies", () => {
    const db = small();
    const p = {
      ...db.projects[0],
      id: "custom",
      clientId: "custom-client",
      code: "AZ-101",
    };
    createProject(db, p, "Custom client", "", {}, false);
    expect(db.phases.filter((ph) => ph.projectId === "custom")).toHaveLength(8);
    expect(db.tasks.filter((t) => t.projectId === "custom")).toHaveLength(0);
  });
});
