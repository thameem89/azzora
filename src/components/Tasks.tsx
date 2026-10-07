import { useState } from "react";
import type { Task } from "../domain/model";
import { taskStatuses, priorities } from "../domain/model";
import { useStore } from "../store";
import { blankTask } from "../domain/seed";
import {
  taskProgress,
  dependencyRisk,
  dateLabel,
  overdue,
} from "../domain/logic";
import { Badge, Progress, Empty, personName, Header } from "./ui";
import { Planning } from "./Planning";
export function TaskList({
  tasks,
  onTask,
}: {
  tasks: Task[];
  onTask: (t: Task) => void;
}) {
  const { db } = useStore();
  return (
    <div className="task-list">
      {tasks.map((t) => (
        <button key={t.id} className="task-row" onClick={() => onTask(t)}>
          <span>
            <strong>
              {t.parentId ? "↳ " : ""}
              {t.name}
            </strong>
            <small>
              {db.projects.find((p) => p.id === t.projectId)?.code} ·{" "}
              {db.phases.find((p) => p.id === t.phaseId)?.name} ·{" "}
              {personName(db, t.assigneeId)}
            </small>
          </span>
          <Badge>
            {overdue(t)
              ? "Delayed"
              : dependencyRisk(db, t)
                ? "At Risk"
                : t.status}
          </Badge>
          <span className="muted">{dateLabel(t.due)}</span>
          <Progress value={taskProgress(db, t)} />
        </button>
      ))}
      {!tasks.length && <Empty />}
    </div>
  );
}
export function Tasks({
  projectId,
  onTask,
}: {
  projectId?: string;
  onTask: (t: Task) => void;
}) {
  const { db } = useStore();
  const [project, setProject] = useState(projectId || "");
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [phase, setPhase] = useState("");
  const [priority, setPriority] = useState("");
  const [due, setDue] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("List");
  const [mine, setMine] = useState(false);
  const list = db.tasks.filter(
    (t) =>
      (!project || t.projectId === project) &&
      (!status || t.status === status) &&
      (!phase || t.phaseId === phase) &&
      (!priority || t.priority === priority) &&
      (!assignee || t.assigneeId === assignee) &&
      (!due || t.due <= due) &&
      (!mine || t.assigneeId === "person-0") &&
      t.name.toLowerCase().includes(search.toLowerCase()),
  );
  function create() {
    const p = db.projects.find((p) => p.id === project) || db.projects[0];
    if (p)
      onTask(
        blankTask(
          p.id,
          db.phases.find((ph) => ph.projectId === p.id)!.id,
          p.managerId,
        ),
      );
  }
  return (
    <>
      <Header
        title="Task Workspace"
        description="One shared task register across all project operations."
        action={
          <button className="primary" onClick={create}>
            + Create Task
          </button>
        }
      />
      <div className="tabs">
        <button
          className={!mine ? "active" : ""}
          onClick={() => setMine(false)}
        >
          All Tasks
        </button>
        <button className={mine ? "active" : ""} onClick={() => setMine(true)}>
          My Tasks
        </button>
        {["List", "Board", "Timeline"].map((m) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="filters">
        <input
          aria-label="Search tasks"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!projectId && (
          <select
            aria-label="Filter project"
            value={project}
            onChange={(e) => {
              setProject(e.target.value);
              setPhase("");
            }}
          >
            <option value="">All projects</option>
            {db.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter phase"
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
        >
          <option value="">All phases</option>
          {db.phases
            .filter((p) => !project || p.projectId === project)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {db.projects.find((x) => x.id === p.projectId)?.code}
              </option>
            ))}
        </select>
        <select
          aria-label="Filter assignee"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        >
          <option value="">All people</option>
          {db.people.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {taskStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Filter priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {priorities.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="inline">
          Due before
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
      </div>
      {mode === "List" ? (
        <div className="panel">
          <TaskList tasks={list} onTask={onTask} />
        </div>
      ) : mode === "Board" ? (
        <div className="board">
          {taskStatuses.map((s) => (
            <section className="board-column" key={s}>
              <h3>
                {s} <small>{list.filter((t) => t.status === s).length}</small>
              </h3>
              <TaskList
                tasks={list.filter((t) => t.status === s)}
                onTask={onTask}
              />
            </section>
          ))}
        </div>
      ) : (
        <Planning
          projectId={project || db.projects[0]?.id}
          onTask={onTask}
          filteredIds={list.map((t) => t.id)}
        />
      )}
    </>
  );
}
