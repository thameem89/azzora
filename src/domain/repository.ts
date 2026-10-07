import { initializeQuotations } from "../quotation/repository";
import { z } from "zod";
import type { Database, Task, Project, SnagStatus, Activity } from "./model";
import { seed, generatePlan } from "./seed";
import {
  uid,
  dependencyError,
  handoverState,
  canTransition,
  taskProgress,
} from "./logic";
const KEY = "azzora-demo-v1";
export interface Repository {
  load(): Database;
  save(db: Database): void;
}
export const localRepository: Repository = {
  load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const value = JSON.parse(raw) as Database;
    if (
      value.version !== 1 ||
      !Array.isArray(value.projects) ||
      !Array.isArray(value.tasks)
    )
      throw Error(
        "Saved demo data is incompatible. Export it or reset from Settings.",
      );
    initializeQuotations(value);
    return value;
  },
  save(db) {
    localStorage.setItem(KEY, JSON.stringify(db));
  },
};
export const taskSchema = z
  .object({
    name: z.string().trim().min(2, "Task name needs at least 2 characters"),
    progress: z.number().min(0).max(100),
    start: z.string().min(1),
    due: z.string().min(1),
    allocation: z.number().min(0).max(100),
  })
  .refine((t) => t.due >= t.start, {
    message: "Due date must be on or after start date",
  });
export const projectSchema = z
  .object({
    name: z.string().trim().min(2),
    code: z.string().min(1),
    start: z.string().min(1),
    due: z.string().min(1),
    value: z.number().min(0),
    area: z.number().min(0),
    location: z.string().min(2),
    managerId: z.string().min(1),
  })
  .refine((p) => p.due >= p.start, {
    message: "Target completion must be on or after start date",
  });
export function record(
  db: Database,
  projectId: string,
  entityType: string,
  entityId: string,
  action: string,
  summary: string,
  previous?: string,
) {
  db.activities.unshift({
    id: uid(),
    actorId: "person-0",
    action,
    entityType,
    entityId,
    projectId,
    timestamp: new Date().toISOString(),
    summary,
    previous,
  } satisfies Activity);
}
export function saveTask(db: Database, task: Task) {
  taskSchema.parse(task);
  const dependencyMessage = dependencyError(db, task, task.dependencies);
  if (dependencyMessage) throw Error(dependencyMessage);
  const old = db.tasks.find((t) => t.id === task.id);
  if (task.parentId) {
    const parent = db.tasks.find((t) => t.id === task.parentId);
    if (
      !parent ||
      parent.projectId !== task.projectId ||
      parent.phaseId !== task.phaseId ||
      parent.parentId ||
      parent.id === task.id
    )
      throw Error("Choose a top-level parent in the same phase.");
  }
  if (task.status === "Completed") task.progress = 100;
  else if (task.progress === 100) task.status = "Completed";
  else if (task.progress > 0 && task.status === "Not Started")
    task.status = "In Progress";
  task.completedAt =
    task.status === "Completed"
      ? task.completedAt || new Date().toISOString()
      : undefined;
  task.updatedAt = new Date().toISOString();
  db.tasks = old
    ? db.tasks.map((t) => (t.id === task.id ? task : t))
    : [...db.tasks, task];
  db.milestones
    .filter((m) => m.taskId === task.id)
    .forEach((m) => {
      m.due = task.due;
    });
  if (task.parentId) {
    const p = db.tasks.find((t) => t.id === task.parentId)!;
    p.progress = taskProgress(db, p);
    p.status =
      p.progress === 100
        ? "Completed"
        : p.progress > 0
          ? "In Progress"
          : "Not Started";
  }
  record(
    db,
    task.projectId,
    "Task",
    task.id,
    old ? "Task updated" : "Task created",
    `${task.name}: ${task.status}, ${task.progress}%`,
    old ? JSON.stringify(old) : undefined,
  );
}
export function createProject(
  db: Database,
  p: Project,
  clientName: string,
  contact: string,
  team: Record<string, string>,
  standard: boolean,
) {
  projectSchema.parse(p);
  if (db.projects.some((x) => x.code.toLowerCase() === p.code.toLowerCase()))
    throw Error("Project code must be unique.");
  if (!clientName.trim()) throw Error("Client name is required.");
  db.clients.push({ id: p.clientId, name: clientName, contact });
  db.projects.push(p);
  generatePlan(db, p, standard);
  const selected = { ...team, "Project Manager": p.managerId };
  Object.entries(selected)
    .filter(([, personId]) => personId)
    .forEach(([role, personId]) =>
      db.assignments.push({
        id: uid(),
        projectId: p.id,
        personId,
        role,
        start: p.start,
        end: p.due,
        responsibility: role,
        status: "Active",
      }),
    );
  record(db, p.id, "Project", p.id, "Project created", p.name);
}
export function transitionSnag(db: Database, id: string, status: SnagStatus) {
  const snag = db.snags.find((s) => s.id === id)!;
  if (!canTransition(snag.status, status))
    throw Error("Move the snag one step at a time so inspection is recorded.");
  if (status === "Closed" && !snag.inspection.trim())
    throw Error("Inspection notes are required before closing.");
  record(
    db,
    snag.projectId,
    "Snag",
    id,
    "Snag status changed",
    `${snag.reference}: ${snag.status} → ${status}`,
    JSON.stringify(snag),
  );
  snag.status = status;
  snag.closedAt = status === "Closed" ? new Date().toISOString() : undefined;
  snag.closedBy = status === "Closed" ? "person-0" : undefined;
}
export function completeProject(db: Database, id: string) {
  if (!handoverState(db, id).ready)
    throw Error("Complete all required handover criteria first.");
  db.projects.find((p) => p.id === id)!.status = "Completed";
  record(
    db,
    id,
    "Project",
    id,
    "Project completed",
    "Required handover criteria confirmed.",
  );
}
