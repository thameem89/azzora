import type { Database, Task, SnagStatus } from "./model";
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const addDays = (date: string, n: number) =>
  new Date(Date.parse(date + "T12:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export const days = (a: string, b: string) =>
  Math.round(
    (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000,
  );
export const dateLabel = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dubai",
  });
export const money = (v: number) =>
  new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(v);
export const uid = () => crypto.randomUUID();
export function taskProgress(db: Database, t: Task): number {
  const children = db.tasks.filter((x) => x.parentId === t.id);
  return children.length
    ? children.reduce((s, c) => s + taskProgress(db, c), 0) / children.length
    : t.progress;
}
export function phaseProgress(db: Database, id: string) {
  const tasks = db.tasks.filter((t) => t.phaseId === id && !t.parentId);
  return tasks.length
    ? tasks.reduce((s, t) => s + taskProgress(db, t), 0) / tasks.length
    : 0;
}
export function projectProgress(db: Database, id: string) {
  const phases = db.phases.filter((p) => p.projectId === id);
  const weight = phases.reduce((s, p) => s + p.weight, 0);
  return weight
    ? Math.round(
        phases.reduce((s, p) => s + phaseProgress(db, p.id) * p.weight, 0) /
          weight,
      )
    : 0;
}
export function currentPhase(db: Database, id: string) {
  const phases = db.phases
    .filter((p) => p.projectId === id)
    .sort((a, b) => a.order - b.order);
  return phases.find((p) => phaseProgress(db, p.id) < 100)?.name || "Completed";
}
export const overdue = (t: Task, date = today()) =>
  t.status !== "Completed" && t.due < date;
export function dependencyRisk(db: Database, t: Task, date = today()) {
  return t.dependencies.some((id) => {
    const p = db.tasks.find((x) => x.id === id);
    return (
      p &&
      p.status !== "Completed" &&
      (overdue(p, date) || p.due >= t.start || p.status === "Blocked")
    );
  });
}
export function health(db: Database, id: string, date = today()) {
  const p = db.projects.find((x) => x.id === id);
  if (p?.status === "Completed" || p?.status === "On Hold") return p.status;
  const tasks = db.tasks.filter((t) => t.projectId === id);
  if (tasks.some((t) => overdue(t, date))) return "Delayed";
  if (
    tasks.some((t) => t.status === "Blocked" || dependencyRisk(db, t, date)) ||
    db.documents.some(
      (d) =>
        d.projectId === id &&
        d.category === "Approvals" &&
        d.status === "Pending",
    )
  )
    return "At Risk";
  return "On Track";
}
export function workload(db: Database, id: string) {
  return db.tasks
    .filter(
      (t) =>
        t.assigneeId === id &&
        t.status !== "Completed" &&
        !db.tasks.some((c) => c.parentId === t.id) &&
        db.projects.some((p) => p.id === t.projectId && p.status === "Active"),
    )
    .reduce((s, t) => s + t.allocation, 0);
}
export const availability = (n: number) =>
  n > 100
    ? "Over Capacity"
    : n >= 85
      ? "Near Capacity"
      : n >= 50
        ? "Healthy"
        : "Available";
export function handoverState(db: Database, id: string) {
  const items = db.handover
    .filter((h) => h.projectId === id && h.applicable)
    .map((h) => ({
      ...h,
      complete:
        h.automatic === "tasks"
          ? db.tasks.some((t) => t.projectId === id) &&
            db.tasks
              .filter((t) => t.projectId === id)
              .every((t) => taskProgress(db, t) === 100)
          : h.automatic === "snags"
            ? db.snags
                .filter((s) => s.projectId === id)
                .every((s) => s.status === "Closed")
            : h.complete,
    }));
  return {
    items,
    percent: items.length
      ? Math.round(
          (items.filter((h) => h.complete).length / items.length) * 100,
        )
      : 0,
    ready:
      items.length > 0 &&
      items.filter((h) => h.required).every((h) => h.complete),
  };
}
export function dependencyError(
  db: Database,
  task: Task,
  dependencies: string[],
): string | undefined {
  if (dependencies.includes(task.id))
    return "An activity cannot depend on itself.";
  if (new Set(dependencies).size !== dependencies.length)
    return "This dependency already exists.";
  const tasks = new Map(db.tasks.map((t) => [t.id, t]));
  for (const id of dependencies) {
    if (tasks.get(id)?.projectId !== task.projectId)
      return "Choose an existing activity from the same project.";
    const seen = new Set<string>();
    const pending = [id];
    while (pending.length) {
      const node = pending.pop()!;
      if (node === task.id)
        return "This dependency cannot be added because it would create a circular dependency.";
      if (seen.has(node)) continue;
      seen.add(node);
      pending.push(...(tasks.get(node)?.dependencies || []));
    }
  }
}
export function validDependency(
  db: Database,
  id: string,
  dependencies: string[],
) {
  const task = db.tasks.find((t) => t.id === id);
  return !!task && !dependencyError(db, task, dependencies);
}
export function dependencyState(db: Database, task: Task) {
  const byId = new Map(db.tasks.map((t) => [t.id, t]));
  const predecessors = task.dependencies
    .map((id) => byId.get(id))
    .filter((t): t is Task => !!t && t.projectId === task.projectId);
  return {
    blockers: predecessors.filter(
      (t) => t.status !== "Completed" && taskProgress(db, t) < 100,
    ),
    conflicts: predecessors.filter((t) => task.start < t.due),
  };
}
export function canTransition(from: SnagStatus, to: SnagStatus) {
  const steps = [
    "Open",
    "Assigned",
    "Rectification",
    "Ready for Inspection",
    "Closed",
  ];
  return from === to || Math.abs(steps.indexOf(from) - steps.indexOf(to)) === 1;
}
