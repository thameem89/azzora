import { Quotations } from "../quotation/LazyQuotations";
import { useState } from "react";
import { useStore } from "../store";
import type { Task, Project } from "../domain/model";
import {
  currentPhase,
  projectProgress,
  phaseProgress,
  health,
  days,
  today,
  dateLabel,
  taskProgress,
} from "../domain/logic";
import { trades } from "../domain/model";
import { record, projectSchema } from "../domain/repository";
import { Header, Badge, Progress, personName, Empty, Modal, Field } from "./ui";
import { TaskList, Tasks } from "./Tasks";
import { ProjectTimeline } from "./ProjectTimeline";
import { Team } from "./Team";
import { SiteUpdates, Snags, Documents } from "./Operations";
import { Handover } from "./Handover";
const tabs = [
  ["overview", "Overview"],
  ["timeline", "Dependencies / Timeline"],
  ["tasks", "Tasks"],
  ["team", "Team"],
  ["site-updates", "Site Updates"],
  ["documents", "Documents"],
  ["quotations", "Quotations"],
  ["snags-qa", "Snags & QA"],
  ["handover", "Handover"],
];
export function Workspace({
  id,
  tab,
  onTask,
}: {
  id: string;
  tab: string;
  onTask: (t: Task) => void;
}) {
  const { db, mutate } = useStore();
  const [edit, setEdit] = useState<Project | null>(null);
  const p = db.projects.find((p) => p.id === id);
  if (!p)
    return (
      <Empty>
        Project not found. <a href="#/projects">Open directory</a>
      </Empty>
    );
  const tasks = db.tasks.filter((t) => t.projectId === id);
  const phases = db.phases.filter((ph) => ph.projectId === id);
  const approval = db.documents.filter(
    (d) =>
      d.projectId === id &&
      d.category === "Approvals" &&
      d.status === "Pending",
  );
  return (
    <>
      <Header
        eyebrow={p.code + " · " + p.type}
        title={p.name}
        description={`${db.clients.find((c) => c.id === p.clientId)?.name} · ${p.location}, ${p.emirate}`}
        action={
          <>
            <Badge>{p.status === "Draft" ? "Draft" : health(db, id)}</Badge>
            <button onClick={() => setEdit(structuredClone(p))}>
              Edit Project
            </button>
          </>
        }
      />
      <div className="project-summary">
        <span>
          Manager<strong>{personName(db, p.managerId)}</strong>
        </span>
        <span>
          Start<strong>{dateLabel(p.start)}</strong>
        </span>
        <span>
          Target<strong>{dateLabel(p.due)}</strong>
        </span>
        <span>
          Current phase<strong>{currentPhase(db, id)}</strong>
        </span>
        <Progress value={projectProgress(db, id)} />
      </div>
      <nav className="tabs">
        {tabs.map(([key, label]) => (
          <a
            key={key}
            className={tab === key ? "active" : ""}
            href={`#/projects/${id}/${key}`}
          >
            {label}
          </a>
        ))}
      </nav>
      {tab === "overview" ? (
        <>
          <div className="kpis">
            {[
              ["Days Remaining", days(today(), p.due)],
              [
                "Tasks Complete",
                `${tasks.filter((t) => taskProgress(db, t) === 100).length} / ${tasks.length}`,
              ],
              [
                "Open Snags",
                db.snags.filter(
                  (s) => s.projectId === id && s.status !== "Closed",
                ).length,
              ],
              ["Pending Approvals", approval.length],
            ].map(([label, n]) => (
              <div className="panel kpi" key={label}>
                <small>{label}</small>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
          <div className="dashboard-grid">
            <div className="stack">
              <section className="panel">
                <h2>Phase Progress</h2>
                {phases.map((ph) => (
                  <div className="workload" key={ph.id}>
                    <div className="between">
                      <strong>{ph.name}</strong>
                      <small>Weight {ph.weight}%</small>
                    </div>
                    <Progress value={phaseProgress(db, ph.id)} />
                  </div>
                ))}
              </section>
              <section className="panel">
                <h2>Open Tasks</h2>
                <TaskList
                  tasks={tasks
                    .filter((t) => t.status !== "Completed")
                    .slice(0, 8)}
                  onTask={onTask}
                />
              </section>
              <section className="panel">
                <h2>Trade Progress</h2>
                {trades
                  .filter((trade) => tasks.some((t) => t.trade === trade))
                  .map((trade) => {
                    const list = tasks.filter(
                      (t) =>
                        t.trade === trade &&
                        !db.tasks.some((c) => c.parentId === t.id),
                    );
                    return (
                      <div className="workload" key={trade}>
                        <span>{trade}</span>
                        <Progress
                          value={
                            list.reduce((s, t) => s + taskProgress(db, t), 0) /
                            list.length
                          }
                        />
                      </div>
                    );
                  })}
              </section>
            </div>
            <div className="stack">
              <section className="panel">
                <h2>Next Milestones</h2>
                {db.milestones
                  .filter(
                    (m) =>
                      m.projectId === id &&
                      db.tasks.find((t) => t.id === m.taskId)?.status !==
                        "Completed",
                  )
                  .sort((a, b) => a.due.localeCompare(b.due))
                  .slice(0, 5)
                  .map((m) => (
                    <button
                      className="milestone"
                      key={m.id}
                      onClick={() =>
                        onTask(db.tasks.find((t) => t.id === m.taskId)!)
                      }
                    >
                      <strong>{m.name}</strong>
                      <small>{dateLabel(m.due)}</small>
                    </button>
                  ))}
              </section>
              <section className="panel">
                <h2>Assigned Team</h2>
                {db.assignments
                  .filter((a) => a.projectId === id && a.status === "Active")
                  .map((a) => (
                    <p key={a.id}>
                      {personName(db, a.personId)}
                      <small>{a.role}</small>
                    </p>
                  ))}
                <a href={`#/projects/${id}/team`}>Manage assignments →</a>
              </section>
              <section className="panel">
                <h2>Recent Site Activity</h2>
                {db.updates
                  .filter((u) => u.projectId === id)
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 3)
                  .map((u) => (
                    <p key={u.id}>
                      {u.completed}
                      <small>{dateLabel(u.date)}</small>
                    </p>
                  ))}
              </section>
              <section className="panel">
                <h2>Pending Approvals</h2>
                {approval.map((d) => (
                  <p key={d.id}>{d.name}</p>
                ))}
                {!approval.length && <Empty>No approvals pending.</Empty>}
                <h3>Recent Documents</h3>
                {db.documents
                  .filter((d) => d.projectId === id)
                  .slice(-3)
                  .map((d) => (
                    <p key={d.id}>
                      {d.name}
                      <small>{d.category}</small>
                    </p>
                  ))}
              </section>
            </div>
          </div>
        </>
      ) : tab === "timeline" ? (
        <ProjectTimeline projectId={id} onTask={onTask} />
      ) : tab === "tasks" ? (
        <Tasks projectId={id} onTask={onTask} />
      ) : tab === "team" ? (
        <Team projectId={id} onTask={onTask} />
      ) : tab === "site-updates" ? (
        <SiteUpdates projectId={id} />
      ) : tab === "quotations" ? (
        <Quotations projectId={id} />
      ) : tab === "documents" ? (
        <Documents projectId={id} />
      ) : tab === "snags-qa" ? (
        <Snags projectId={id} />
      ) : tab === "handover" ? (
        <Handover projectId={id} />
      ) : (
        <Empty>Workspace tab not found.</Empty>
      )}
      {edit && (
        <Modal title="Edit Project" onClose={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                mutate((d) => {
                  projectSchema.parse(edit);
                  Object.assign(
                    d.projects.find((x) => x.id === edit.id)!,
                    edit,
                  );
                  record(d, id, "Project", id, "Project updated", edit.name);
                })
              )
                setEdit(null);
            }}
          >
            <Field label="Project name">
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <input
                required
                value={edit.location}
                onChange={(e) => setEdit({ ...edit, location: e.target.value })}
              />
            </Field>
            <Field label="Start">
              <input
                type="date"
                required
                value={edit.start}
                onChange={(e) => setEdit({ ...edit, start: e.target.value })}
              />
            </Field>
            <Field label="Target completion">
              <input
                type="date"
                required
                min={edit.start}
                value={edit.due}
                onChange={(e) => setEdit({ ...edit, due: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <select
                value={edit.status}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    status: e.target.value as Project["status"],
                  })
                }
              >
                <option>Active</option>
                <option>Draft</option>
                <option>On Hold</option>
                {edit.status === "Completed" && <option>Completed</option>}
              </select>
            </Field>
            <p className="muted">
              Complete projects through the handover checklist.
            </p>
            <button className="primary">Save Project</button>
          </form>
        </Modal>
      )}
    </>
  );
}
