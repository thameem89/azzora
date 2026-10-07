import { useStore } from "../store";
import type { Task } from "../domain/model";
import {
  today,
  addDays,
  overdue,
  dependencyRisk,
  currentPhase,
  workload,
  availability,
  dateLabel,
} from "../domain/logic";
import { Header, Badge, Progress, Empty, personName } from "./ui";
import { ProjectCard } from "./Projects";
export function Dashboard({
  onOpen,
  onTask,
  onNew,
}: {
  onOpen: (id: string) => void;
  onTask: (t: Task) => void;
  onNew: () => void;
}) {
  const { db } = useStore();
  const active = db.projects.filter((p) => p.status === "Active");
  const delayed = db.tasks.filter(
    (t) => overdue(t) && active.some((p) => p.id === t.projectId),
  );
  const week = db.milestones.filter(
    (m) =>
      m.due >= today() &&
      m.due <= addDays(today(), 7) &&
      db.tasks.find((t) => t.id === m.taskId)?.status !== "Completed",
  );
  const near = active.filter((p) =>
    ["QA / Snagging", "Handover"].includes(currentPhase(db, p.id)),
  );
  const pending = db.documents.filter(
    (d) => d.category === "Approvals" && d.status === "Pending",
  );
  const risk = db.tasks.filter(
    (t) => t.status === "Blocked" || dependencyRisk(db, t),
  );
  const attention = [...delayed, ...risk]
    .filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i)
    .slice(0, 6);
  return (
    <>
      <Header
        eyebrow="Directorate control cockpit · UAE portfolio"
        title="Executive Overview"
        description="Active fit-out operations, milestone deliverables, and site health across UAE projects."
        action={
          <button className="primary" onClick={onNew}>
            + New Project
          </button>
        }
      />
      <div className="kpis">
        {[
          [
            "Active Projects",
            active.length,
            `${active.filter((p) => p.emirate === "Dubai").length} in Dubai · ${active.filter((p) => p.emirate === "Abu Dhabi").length} in Abu Dhabi`,
          ],
          ["Due This Week", week.length, "Site milestones & deliverables"],
          [
            "Delayed Tasks",
            delayed.length,
            "Action required across active projects",
          ],
          ["Near Handover", near.length, "Quality, snagging & final delivery"],
        ].map(([label, n, detail]) => (
          <div className="panel kpi" key={label}>
            <small>{label}</small>
            <strong>{n}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section>
          <div className="between">
            <h2>
              Active Fit-Outs <Badge>{active.length} Active</Badge>
            </h2>
            <a href="#/projects">View directory →</a>
          </div>
          <div className="stack">
            {active.map((p) => (
              <ProjectCard key={p.id} project={p} onOpen={onOpen} />
            ))}
          </div>
          {!active.length && <Empty>No active projects.</Empty>}
        </section>
        <aside className="stack">
          <section className="panel">
            <h2>
              Needs Attention <Badge>{attention.length + pending.length}</Badge>
            </h2>
            {attention.map((t) => (
              <button
                key={t.id}
                className="attention"
                onClick={() => onTask(t)}
              >
                <Badge>
                  {overdue(t)
                    ? "Overdue Task"
                    : t.status === "Blocked"
                      ? "Blocked"
                      : "Dependency Risk"}
                </Badge>
                <strong>{t.name}</strong>
                <small>
                  {db.projects.find((p) => p.id === t.projectId)?.code} ·{" "}
                  {dateLabel(t.due)}
                </small>
              </button>
            ))}
            {pending.map((d) => (
              <a
                className="attention"
                key={d.id}
                href={`#/projects/${d.projectId}/documents`}
              >
                <Badge>Pending Approval</Badge>
                <strong>{d.name}</strong>
              </a>
            ))}
            <a className="attention" href="#/snags-qa">
              <Badge>
                {db.snags.filter((s) => s.status !== "Closed").length} open
                snags
              </Badge>
              <strong>Review field rectification →</strong>
            </a>
          </section>
          <section className="panel">
            <h2>Upcoming Milestones</h2>
            {db.milestones
              .filter(
                (m) =>
                  m.due >= today() &&
                  db.tasks.find((t) => t.id === m.taskId)?.status !==
                    "Completed",
              )
              .sort((a, b) => a.due.localeCompare(b.due))
              .slice(0, 6)
              .map((m) => (
                <button
                  className="milestone"
                  key={m.id}
                  onClick={() => {
                    const t = db.tasks.find((t) => t.id === m.taskId);
                    if (t) onTask(t);
                  }}
                >
                  <small>
                    {dateLabel(m.due)} ·{" "}
                    {db.projects.find((p) => p.id === m.projectId)?.code}
                  </small>
                  <strong>{m.name}</strong>
                </button>
              ))}
          </section>
          <section className="panel">
            <h2>Team Workload</h2>
            {db.people
              .slice()
              .sort((a, b) => workload(db, b.id) - workload(db, a.id))
              .slice(0, 6)
              .map((p) => (
                <div className="workload" key={p.id}>
                  <div className="between">
                    <span>{personName(db, p.id)}</span>
                    <small>{workload(db, p.id)}%</small>
                  </div>
                  <Progress value={Math.min(100, workload(db, p.id))} />
                  <small>{availability(workload(db, p.id))}</small>
                </div>
              ))}
            <a href="#/team">Resource matrix →</a>
          </section>
        </aside>
      </div>
    </>
  );
}
