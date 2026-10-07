import { useState } from "react";
import { useStore } from "../store";
import type { Project } from "../domain/model";
import {
  projectProgress,
  phaseProgress,
  currentPhase,
  health,
  dateLabel,
  money,
  today,
} from "../domain/logic";
import { Header, Badge, Avatar, Progress, Empty, personName } from "./ui";
export function ProjectCard({
  project: p,
  onOpen,
}: {
  project: Project;
  onOpen: (id: string) => void;
}) {
  const { db } = useStore();
  const phases = db.phases.filter((ph) => ph.projectId === p.id);
  return (
    <button className="project-card" onClick={() => onOpen(p.id)}>
      <div className="project-card-head">
        <div>
          <div className="meta">
            <span>{p.code}</span> · {p.type}{" "}
            <Badge>{p.status === "Draft" ? "Draft" : health(db, p.id)}</Badge>
          </div>
          <h3>{p.name}</h3>
          <p>
            {db.clients.find((c) => c.id === p.clientId)?.name} · {p.location}
          </p>
        </div>
        <div className="value">
          <small>Contract value</small>
          <strong>{money(p.value)}</strong>
          <small>Target: {dateLabel(p.due)}</small>
        </div>
      </div>
      <div className="between">
        <small>{currentPhase(db, p.id)}</small>
        <small>{projectProgress(db, p.id)}% Total Completion</small>
      </div>
      <div className="phase-strip">
        {phases.map((ph) => (
          <div
            key={ph.id}
            title={`${ph.name}: ${phaseProgress(db, ph.id).toFixed(0)}%`}
          >
            <div className="track">
              <i style={{ width: phaseProgress(db, ph.id) + "%" }} />
            </div>
            <small>{ph.name.split(" ")[0]}</small>
          </div>
        ))}
      </div>
      <footer>
        <div className="inline">
          <Avatar name={personName(db, p.managerId)} />
          <div>
            {personName(db, p.managerId)}
            <small>Project Manager · {dateLabel(p.start)}</small>
          </div>
        </div>
        <div className="avatars">
          {db.assignments
            .filter((a) => a.projectId === p.id && a.status === "Active")
            .slice(0, 4)
            .map((a) => (
              <Avatar key={a.id} name={personName(db, a.personId)} />
            ))}
        </div>
        <span className="link">Open workspace →</span>
      </footer>
    </button>
  );
}
export function Projects({
  onOpen,
  onNew,
}: {
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const { db } = useStore();
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState("All");
  const [manager, setManager] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sort, setSort] = useState("due");
  const [view, setView] = useState("Cards");
  const filtered = db.projects
    .filter(
      (p) =>
        (p.name + " " + p.code).toLowerCase().includes(search.toLowerCase()) &&
        (phase === "All" || currentPhase(db, p.id).includes(phase)) &&
        (!manager || p.managerId === manager) &&
        (!client || p.clientId === client) &&
        (!location || p.emirate === location) &&
        (!state || health(db, p.id) === state) &&
        (!deadline || p.due <= deadline),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : a.due.localeCompare(b.due),
    );
  return (
    <>
      <Header
        title="Project Directory"
        description="A unified view of every fit-out, from scope to handover."
        action={
          <button className="primary" onClick={onNew}>
            + New Project
          </button>
        }
      />
      <div className="tabs">
        {[
          "All",
          "Planning",
          "Design",
          "Client Approval",
          "Procurement",
          "Mobilization",
          "Execution",
          "QA / Snagging",
          "Handover",
          "Completed",
        ].map((s) => (
          <button
            className={phase === s ? "active" : ""}
            key={s}
            onClick={() => setPhase(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="filters">
        <input
          aria-label="Search projects"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Project manager"
          value={manager}
          onChange={(e) => setManager(e.target.value)}
        >
          <option value="">All managers</option>
          {db.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Client"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        >
          <option value="">All clients</option>
          {db.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="">All locations</option>
          <option>Dubai</option>
          <option>Abu Dhabi</option>
        </select>
        <select
          aria-label="Health"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="">All health</option>
          {["On Track", "At Risk", "Delayed", "On Hold", "Completed"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
        <label className="inline">
          Due before
          <input
            aria-label="Deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>
        <select
          aria-label="Sort projects"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="due">Earliest completion</option>
          <option value="name">Name A–Z</option>
        </select>
        <select
          aria-label="Project display"
          value={view}
          onChange={(e) => setView(e.target.value)}
        >
          {["Cards", "List", "Board"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <small>
        {filtered.length} projects · {today()}
      </small>
      {view === "Cards" ? (
        <div className="project-grid">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} onOpen={onOpen} />
          ))}
        </div>
      ) : view === "List" ? (
        <div className="panel">
          {filtered.map((p) => (
            <button
              className="list-row"
              key={p.id}
              onClick={() => onOpen(p.id)}
            >
              <span>
                {p.code}
                <strong>{p.name}</strong>
                <small>
                  {p.location} · {personName(db, p.managerId)}
                </small>
              </span>
              <Badge>{health(db, p.id)}</Badge>
              <Progress value={projectProgress(db, p.id)} />
              <span>{dateLabel(p.due)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="board">
          {[
            "Planning",
            "Design",
            "Client Approval",
            "Procurement",
            "Mobilization",
            "Execution",
            "QA / Snagging",
            "Handover",
            "Completed",
          ].map((s) => (
            <section className="board-column" key={s}>
              <h3>{s}</h3>
              {filtered
                .filter((p) => currentPhase(db, p.id) === s)
                .map((p) => (
                  <ProjectCard key={p.id} project={p} onOpen={onOpen} />
                ))}
            </section>
          ))}
        </div>
      )}
      {!filtered.length && <Empty />}
    </>
  );
}
