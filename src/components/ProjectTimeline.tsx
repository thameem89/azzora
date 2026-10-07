import { useId, useRef, useState } from "react";
import type { Task } from "../domain/model";
import {
  addDays,
  days,
  dateLabel,
  dependencyState,
  taskProgress,
  today,
} from "../domain/logic";
import { saveTask } from "../domain/repository";
import { useStore } from "../store";
import { Header, Empty, personName } from "./ui";
import { DependencyEditor } from "./DependencyEditor";
const ROW = 120;
const HEAD = 56;
export function ProjectTimeline({
  projectId,
  onTask,
}: {
  projectId: string;
  onTask: (task: Task) => void;
}) {
  const { db, mutate } = useStore();
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("");
  const [scale, setScale] = useState(32);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const marker = useId().replace(/:/g, "");
  const all = db.tasks.filter((t) => t.projectId === projectId);
  const tasks = all
    .filter((t) => !filter || t.assigneeId === filter)
    .sort(
      (a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name),
    );
  const start = addDays(all.map((t) => t.start).sort()[0] || today(), -2);
  const end = addDays(
    all
      .map((t) => t.due)
      .sort()
      .at(-1) || today(),
    3,
  );
  const span = Math.max(7, days(start, end) + 1);
  const active = all.find((t) => t.id === selected);
  const positions = new Map(
    tasks.map((t, i) => [
      t.id,
      {
        x: days(start, t.start) * scale,
        end: (days(start, t.due) + 1) * scale,
        y: HEAD + i * ROW + ROW / 2,
      },
    ]),
  );
  const sync = (source: HTMLDivElement, target: HTMLDivElement | null) => {
    if (target && Math.abs(target.scrollTop - source.scrollTop) > 1)
      target.scrollTop = source.scrollTop;
  };
  return (
    <>
      <Header
        title="Dependencies / Timeline"
        description="Existing project activities, dates and finish-to-start dependencies."
      />
      <div className="filters">
        <select
          aria-label="Timeline assignee"
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
        <select
          aria-label="Timeline scale"
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        >
          <option value={32}>Day view</option>
          <option value={16}>Compact view</option>
          <option value={56}>Expanded view</option>
        </select>
        <span className="muted">
          {dateLabel(start)} – {dateLabel(end)} · {tasks.length} activities
        </span>
      </div>
      <p className="muted">
        Open an activity to edit dates. Use its link button to add or remove
        predecessors. Dates are never automatically rescheduled.
      </p>
      <div className="project-timeline">
        <div
          className="timeline-activities"
          ref={left}
          onScroll={(e) => sync(e.currentTarget, right.current)}
        >
          <div className="timeline-activity-head">
            <span>Activity / assigned person</span>
            <span>Start / end</span>
            <span>Progress</span>
            <span>Links</span>
          </div>
          {tasks.map((t) => {
            const state = dependencyState(db, t);
            return (
              <div
                className={`timeline-activity ${state.conflicts.length ? "has-conflict" : ""}`}
                key={t.id}
                style={{ height: ROW }}
              >
                <button className="timeline-open" onClick={() => onTask(t)}>
                  <strong>{t.name}</strong>
                  <small>{personName(db, t.assigneeId)}</small>
                  <small className="timeline-mobile-info">
                    {dateLabel(t.start)} → {dateLabel(t.due)} ·{" "}
                    {Math.round(taskProgress(db, t))}% · {t.status}
                  </small>
                  {state.blockers.length > 0 && (
                    <small className="timeline-warning">
                      Blocked by: {state.blockers.map((p) => p.name).join(", ")}
                    </small>
                  )}
                  {state.conflicts.length > 0 && (
                    <small className="timeline-conflict">
                      Date conflict with:{" "}
                      {state.conflicts.map((p) => p.name).join(", ")}
                    </small>
                  )}
                </button>
                <span className="timeline-dates">
                  {dateLabel(t.start)}
                  <small>{dateLabel(t.due)}</small>
                </span>
                <span className="timeline-progress">
                  {Math.round(taskProgress(db, t))}%<small>{t.status}</small>
                </span>
                <button
                  className="timeline-link"
                  aria-label={`Dependencies for ${t.name}`}
                  aria-pressed={selected === t.id}
                  onClick={() => setSelected(selected === t.id ? "" : t.id)}
                >
                  ↗ {t.dependencies.length}
                </button>
              </div>
            );
          })}
        </div>
        <div
          className="timeline-calendar"
          ref={right}
          onScroll={(e) => sync(e.currentTarget, left.current)}
          tabIndex={0}
          aria-label="Scrollable activity timeline"
        >
          <div
            className="timeline-canvas"
            style={{
              width: span * scale,
              height: HEAD + tasks.length * ROW,
              backgroundSize: `${scale}px 100%`,
            }}
          >
            <div className="timeline-calendar-head" style={{ height: HEAD }}>
              {Array.from({ length: span }, (_, i) => (
                <span key={i} style={{ width: scale }}>
                  {addDays(start, i).slice(8)}
                  <small>
                    {new Date(addDays(start, i) + "T12:00Z").toLocaleDateString(
                      "en-GB",
                      { month: "short" },
                    )}
                  </small>
                </span>
              ))}
            </div>
            {tasks.map((t) => {
              const pos = positions.get(t.id)!;
              const state = dependencyState(db, t);
              return (
                <div
                  key={t.id}
                  className="timeline-lane"
                  style={{ height: ROW }}
                >
                  <button
                    data-task-id={t.id}
                    className={`timeline-bar ${state.conflicts.length ? "conflict" : state.blockers.length ? "blocked" : t.status === "Completed" ? "complete" : ""}`}
                    style={{
                      left: pos.x,
                      width: Math.max(scale, pos.end - pos.x),
                    }}
                    onClick={() => onTask(t)}
                    aria-label={`Open activity ${t.name}`}
                    title={`${t.name}: ${dateLabel(t.start)} – ${dateLabel(t.due)}; ${Math.round(taskProgress(db, t))}%${state.blockers.length ? "; Blocked by: " + state.blockers.map((p) => p.name).join(", ") : ""}`}
                  >
                    <i style={{ width: taskProgress(db, t) + "%" }} />
                    <span>{t.name}</span>
                  </button>
                </div>
              );
            })}
            <svg
              className="timeline-connectors"
              width={span * scale}
              height={HEAD + tasks.length * ROW}
              aria-label="Activity dependency arrows"
            >
              <defs>
                <marker
                  id={marker}
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <path d="M0 0 L7 3.5 L0 7 Z" fill="context-stroke" />
                </marker>
              </defs>
              {tasks.flatMap((t) =>
                t.dependencies.map((id, j) => {
                  const a = positions.get(id),
                    b = positions.get(t.id);
                  if (!a || !b) return null;
                  const bend = a.end + 10 + j * 5;
                  const lane = b.y - 32 - j * 4;
                  return (
                    <path
                      data-from={id}
                      data-to={t.id}
                      key={`${id}-${t.id}`}
                      d={`M${a.end} ${a.y} H${bend} V${lane} H${b.x - 8} V${b.y} H${b.x}`}
                      fill="none"
                      stroke={
                        dependencyState(db, t).conflicts.some(
                          (p) => p.id === id,
                        )
                          ? "#bc4234"
                          : "#806846"
                      }
                      strokeWidth="1.7"
                      markerEnd={`url(#${marker})`}
                    >
                      <title>
                        {all.find((p) => p.id === id)?.name} → {t.name}
                      </title>
                    </path>
                  );
                }),
              )}
            </svg>
          </div>
        </div>
      </div>
      <p className="timeline-legend">
        <span>● Completed</span>
        <span>● In progress / planned</span>
        <span className="timeline-warning">● Dependency blocked</span>
        <span className="timeline-conflict">● Date conflict</span>
      </p>
      {active && (
        <section
          className="panel timeline-editor-panel"
          aria-label={`Dependency editor for ${active.name}`}
        >
          <div className="between">
            <h3>{active.name}</h3>
            <button onClick={() => setSelected("")}>Close</button>
          </div>
          <DependencyEditor
            key={active.id}
            task={active}
            onChange={(ids) =>
              mutate(
                (d) => saveTask(d, { ...active, dependencies: ids }),
                "Dependencies saved; activity dates unchanged",
              )
            }
          />
        </section>
      )}
      {!tasks.length && <Empty>No activities match this view.</Empty>}
    </>
  );
}
