import { useState } from "react";
import { useStore } from "../store";
import type { Task } from "../domain/model";
import {
  days,
  addDays,
  today,
  dateLabel,
  phaseProgress,
  taskProgress,
  dependencyRisk,
  overdue,
} from "../domain/logic";
import { blankTask } from "../domain/seed";
import { Header, Badge, Progress, personName, Empty } from "./ui";
export function Planning({
  projectId,
  onTask,
  filteredIds,
}: {
  projectId?: string;
  onTask: (task: Task) => void;
  filteredIds?: string[];
}) {
  const { db } = useStore();
  const [selected, setSelected] = useState(
    projectId || db.projects[0]?.id || "",
  );
  const [view, setView] = useState("Month");
  const [anchor, setAnchor] = useState(today());
  const [zoom, setZoom] = useState(1);
  const [dependencies, setDependencies] = useState(true);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const span = view === "Week" ? 7 : view === "Quarter" ? 90 : 30;
  const width = (view === "Week" ? 85 : view === "Quarter" ? 18 : 32) * zoom;
  const phases = db.phases
    .filter((p) => p.projectId === selected)
    .sort((a, b) => a.order - b.order);
  const tasks = db.tasks.filter(
    (t) =>
      t.projectId === selected &&
      (!filter || t.assigneeId === filter) &&
      (!filteredIds || filteredIds.includes(t.id)),
  );
  const rows: ({ phase: (typeof phases)[number] } | { task: Task })[] = [];
  phases.forEach((p) => {
    rows.push({ phase: p });
    if (!collapsed.includes(p.id)) {
      const roots = tasks.filter((t) => t.phaseId === p.id && !t.parentId);
      roots.forEach((t) => {
        rows.push({ task: t });
        tasks
          .filter((c) => c.parentId === t.id)
          .forEach((c) => rows.push({ task: c }));
      });
      tasks
        .filter(
          (t) =>
            t.phaseId === p.id &&
            t.parentId &&
            !roots.some((r) => r.id === t.parentId),
        )
        .forEach((t) => rows.push({ task: t }));
    }
  });
  const rowIndex = (id: string) =>
    rows.findIndex((r) => "task" in r && r.task.id === id);
  return (
    <>
      <Header
        title="Planning & Timeline"
        description="Phase hierarchy, programme dates and finish-to-start relationships."
        action={
          <button
            className="primary"
            onClick={() => {
              const p = db.projects.find((p) => p.id === selected);
              if (p) onTask(blankTask(p.id, phases[0].id, p.managerId));
            }}
          >
            + Add Task
          </button>
        }
      />
      <div className="filters">
        {!projectId && (
          <select
            aria-label="Planning project"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {db.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Timeline view"
          value={view}
          onChange={(e) => setView(e.target.value)}
        >
          {["Week", "Month", "Quarter"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <button onClick={() => setAnchor(addDays(anchor, -span))}>
          ← Previous
        </button>
        <button onClick={() => setAnchor(today())}>Today</button>
        <button onClick={() => setAnchor(addDays(anchor, span))}>Next →</button>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom(Math.min(2, zoom + 0.25))}
        >
          Zoom +
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
        >
          Zoom −
        </button>
        <select
          aria-label="Planning assignee filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All assignees</option>
          {db.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="inline">
          <input
            type="checkbox"
            checked={dependencies}
            onChange={(e) => setDependencies(e.target.checked)}
          />{" "}
          Dependencies
        </label>
      </div>
      <p className="muted">
        {dateLabel(anchor)} – {dateLabel(addDays(anchor, span - 1))}. Dates
        remain under project manager control.
      </p>
      <div className="gantt">
        <div className="gantt-left">
          <div className="gantt-table-head">
            <span>Task / phase</span>
            <span>Assigned</span>
            <span>Start</span>
            <span>Due</span>
            <span>Days</span>
            <span>Progress</span>
          </div>
          {rows.map((r) =>
            "phase" in r ? (
              <button
                className="gantt-phase"
                key={r.phase.id}
                onClick={() =>
                  setCollapsed(
                    collapsed.includes(r.phase.id)
                      ? collapsed.filter((id) => id !== r.phase.id)
                      : [...collapsed, r.phase.id],
                  )
                }
              >
                <span>
                  {collapsed.includes(r.phase.id) ? "▸" : "▾"}{" "}
                  {String(r.phase.order + 1).padStart(2, "0")} {r.phase.name}
                </span>
                <Progress value={phaseProgress(db, r.phase.id)} />
              </button>
            ) : (
              <button
                className="gantt-task"
                key={r.task.id}
                onClick={() => onTask(r.task)}
              >
                <span>
                  <strong>
                    {r.task.parentId ? "↳ " : ""}
                    {r.task.name}
                  </strong>
                  <small className="mobile-dates">
                    {dateLabel(r.task.start)} → {dateLabel(r.task.due)} ·{" "}
                    {personName(db, r.task.assigneeId)}{" "}
                    {dependencies &&
                      r.task.dependencies.length > 0 &&
                      "· " + r.task.dependencies.length + " predecessor(s)"}
                  </small>
                </span>
                <span>{personName(db, r.task.assigneeId).split(" ")[0]}</span>
                <span>{r.task.start.slice(5)}</span>
                <span>{r.task.due.slice(5)}</span>
                <span>{days(r.task.start, r.task.due) + 1}</span>
                <Progress value={taskProgress(db, r.task)} />
              </button>
            ),
          )}
        </div>
        <div className="gantt-scroll">
          <div
            className="gantt-grid"
            style={{ width: span * width, backgroundSize: width + "px 100%" }}
          >
            <div className="gantt-date-head">
              {Array.from({ length: span }, (_, i) => (
                <span key={i} style={{ width }}>
                  {addDays(anchor, i).slice(8)}
                  <small>
                    {new Date(
                      addDays(anchor, i) + "T12:00Z",
                    ).toLocaleDateString("en-GB", { month: "short" })}
                  </small>
                </span>
              ))}
            </div>
            {rows.map((r) => (
              <div
                key={"phase" in r ? r.phase.id : r.task.id}
                className={"gantt-lane " + ("phase" in r ? "phase-lane" : "")}
              >
                {"task" in r &&
                  days(anchor, r.task.due) >= 0 &&
                  days(anchor, r.task.start) < span && (
                    <button
                      aria-label={`Edit ${r.task.name}`}
                      title={`${r.task.name}: ${dateLabel(r.task.start)} – ${dateLabel(r.task.due)}`}
                      className={
                        "gantt-bar " +
                        (overdue(r.task) || dependencyRisk(db, r.task)
                          ? "risk"
                          : "")
                      }
                      style={{
                        left: Math.max(0, days(anchor, r.task.start)) * width,
                        width: Math.max(
                          width / 2,
                          (Math.min(span - 1, days(anchor, r.task.due)) -
                            Math.max(0, days(anchor, r.task.start)) +
                            1) *
                            width,
                        ),
                      }}
                      onClick={() => onTask(r.task)}
                    >
                      <i style={{ width: taskProgress(db, r.task) + "%" }} />
                      <span>{r.task.name}</span>
                    </button>
                  )}
              </div>
            ))}
            {dependencies && (
              <svg
                className="dependency-lines"
                width={span * width}
                height={rows.length * 48 + 48}
                aria-label="Task dependency connectors"
              >
                <defs>
                  <marker
                    id="arrow"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0 0 L6 3 L0 6" fill="#745a37" />
                  </marker>
                </defs>
                {tasks.flatMap((t) =>
                  t.dependencies.map((id) => {
                    const before = db.tasks.find((x) => x.id === id);
                    const a = rowIndex(id),
                      b = rowIndex(t.id);
                    if (!before || a < 0 || b < 0) return null;
                    const x1 = (days(anchor, before.due) + 1) * width,
                      x2 = days(anchor, t.start) * width;
                    if (
                      x1 < 0 ||
                      x1 > span * width ||
                      x2 < 0 ||
                      x2 > span * width
                    )
                      return null;
                    return (
                      <path
                        key={id + t.id}
                        d={`M${x1} ${a * 48 + 72} H${x1 + 10} V${b * 48 + 72} H${x2}`}
                        fill="none"
                        stroke="#745a37"
                        strokeWidth="1.5"
                        markerEnd="url(#arrow)"
                      />
                    );
                  }),
                )}
              </svg>
            )}
          </div>
        </div>
      </div>
      <div className="mobile-only">
        <Badge>Mobile programme view</Badge> Tap any task to update dates,
        assignee or dependencies.
      </div>
      {!tasks.length && (
        <Empty>No tasks in this programme. Add a task to begin.</Empty>
      )}
    </>
  );
}
