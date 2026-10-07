import { Quotations } from "./quotation/LazyQuotations";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  CalendarRange,
  ListChecks,
  Users,
  HardHat,
  ClipboardCheck,
  Files,
  KeyRound,
  ChartNoAxesCombined,
  Settings,
  Search,
  Plus,
  Bell,
  Menu,
  X,
} from "lucide-react";
import type { Task } from "./domain/model";
import { useStore } from "./store";
import { record } from "./domain/repository";
import { money, projectProgress, health, today } from "./domain/logic";
import { Dashboard } from "./components/Dashboard";
import { Projects } from "./components/Projects";
import { Workspace } from "./components/Workspace";
import { Tasks } from "./components/Tasks";
import { TaskDrawer } from "./components/TaskDrawer";
import { Planning } from "./components/Planning";
import { Wizard } from "./components/Wizard";
import { Team } from "./components/Team";
import { SiteUpdates, Snags, Documents } from "./components/Operations";
import { Handover } from "./components/Handover";
import { Modal, Header, Empty, Badge, Confirm, Field } from "./components/ui";
const navigation = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["projects", "Projects", Building2],
  ["planning", "Planning", CalendarRange],
  ["tasks", "Tasks", ListChecks],
  ["team", "Team", Users],
  ["site-updates", "Site Updates", HardHat],
  ["snags-qa", "Snags & QA", ClipboardCheck],
  ["documents", "Documents", Files],
  ["quotations", "Quotations", Files],
  ["handover", "Handover", KeyRound],
  ["reports", "Reports", ChartNoAxesCombined],
  ["settings", "Settings", Settings],
] as const;
function exportData(data: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export default function App() {
  const { db, toast, error, clear, mutate, reset } = useStore();
  const [route, setRoute] = useState(location.hash.slice(2) || "dashboard");
  const [menu, setMenu] = useState(false);
  const [wizard, setWizard] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [profile, setProfile] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [weights, setWeights] = useState<number[] | null>(null);
  const [weightProject, setWeightProject] = useState(db.projects[0]?.id || "");
  useEffect(() => {
    const fn = () => {
      setRoute(location.hash.slice(2) || "dashboard");
      setMenu(false);
      setQuery("");
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(clear, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, clear]);
  const [page, id, tab = "overview"] = route.split("/");
  const open = (id: string) => {
    location.hash = "/projects/" + id + "/overview";
  };
  const q = query.toLowerCase().trim();
  const search = [
    ...db.projects.map((p) => ({
      id: p.id,
      label: p.code + " · " + p.name,
      type: "Project",
      open: () => open(p.id),
    })),
    ...db.tasks.map((t) => ({
      id: t.id,
      label: t.name,
      type: "Task",
      open: () => setTask(t),
    })),
    ...db.people.map((p) => ({
      id: p.id,
      label: p.name,
      type: "Team",
      open: () => {
        location.hash = "/team";
      },
    })),
    ...db.snags.map((s) => ({
      id: s.id,
      label: s.reference + " · " + s.description,
      type: "Snag",
      open: () => {
        location.hash = "/projects/" + s.projectId + "/snags-qa";
      },
    })),
    ...db.documents.map((d) => ({
      id: d.id,
      label: d.name,
      type: "Document",
      open: () => {
        location.hash = "/projects/" + d.projectId + "/documents";
      },
    })),
  ]
    .filter((r) => r.label.toLowerCase().includes(q))
    .slice(0, 12);
  let content;
  if (page === "dashboard")
    content = (
      <Dashboard onOpen={open} onTask={setTask} onNew={() => setWizard(true)} />
    );
  else if (page === "projects" && id)
    content = <Workspace key={id + tab} id={id} tab={tab} onTask={setTask} />;
  else if (page === "projects")
    content = <Projects onOpen={open} onNew={() => setWizard(true)} />;
  else if (page === "planning") content = <Planning onTask={setTask} />;
  else if (page === "tasks") content = <Tasks onTask={setTask} />;
  else if (page === "team") content = <Team onTask={setTask} />;
  else if (page === "site-updates") content = <SiteUpdates />;
  else if (page === "snags-qa") content = <Snags />;
  else if (page === "documents") content = <Documents />;
  else if (page === "quotations")
    content = <Quotations key={id || "list"} id={id} mode={tab} />;
  else if (page === "handover") content = <Handover />;
  else if (page === "reports")
    content = (
      <>
        <Header
          title="Portfolio Reports"
          description="Current project delivery metrics derived from the demo repository."
          action={
            <button
              onClick={() =>
                exportData(
                  [
                    "Code,Project,Progress,Health,Target,Contract AED",
                    ...db.projects.map((p) =>
                      [
                        p.code,
                        '"' + p.name.replaceAll('"', '""') + '"',
                        projectProgress(db, p.id),
                        health(db, p.id),
                        p.due,
                        p.value,
                      ].join(","),
                    ),
                  ].join("\n"),
                  "azzora-portfolio-" + today() + ".csv",
                  "text/csv",
                )
              }
            >
              Export CSV
            </button>
          }
        />
        <div className="panel">
          {db.projects.map((p) => (
            <button className="list-row" key={p.id} onClick={() => open(p.id)}>
              <span>
                <strong>
                  {p.code} · {p.name}
                </strong>
                <small>
                  {money(p.value)} · {p.due}
                </small>
              </span>
              <Badge>{health(db, p.id)}</Badge>
              <strong>{projectProgress(db, p.id)}%</strong>
            </button>
          ))}
        </div>
        <h2>Activity Record</h2>
        <div className="panel">
          {db.activities.slice(0, 30).map((a) => (
            <p key={a.id}>
              {a.action}: {a.summary}
              <small>{a.timestamp} · Demo actor: Sarah Mansoor</small>
            </p>
          ))}
          {!db.activities.length && (
            <Empty>No demo actions recorded yet.</Empty>
          )}
        </div>
      </>
    );
  else if (page === "settings")
    content = (
      <>
        <Header
          title="Settings"
          description="Demo persistence, programme weights and backend readiness."
        />
        <section className="panel">
          <h2>Browser Demo</h2>
          <p>
            Changes are saved to localStorage on this device. No authentication,
            server authorization, multi-user sync or backup is configured.
          </p>
          <div className="actions">
            <button
              onClick={() =>
                exportData(
                  JSON.stringify(db, null, 2),
                  "azzora-demo-backup.json",
                  "application/json",
                )
              }
            >
              Export demo data
            </button>
            <button onClick={() => setResetConfirm(true)}>
              Reset demo data
            </button>
          </div>
          <p>
            Fonts: Inter and Space Grotesk assets were not supplied. System
            sans-serif fallbacks are used.
          </p>
          <p>
            Current demo user: Sarah Mansoor · Project Manager. Role labels are
            demo behavior only.
          </p>
        </section>
        <section className="panel">
          <h2>Quotation numbering</h2>
          <Field label="Quotation number prefix">
            <input
              value={db.quotationNumbering.prefix}
              onChange={(e) =>
                mutate((d) => {
                  d.quotationNumbering.prefix = e.target.value;
                }, "")
              }
            />
          </Field>
          <Field label="Next quotation sequence">
            <input
              type="number"
              min="1"
              value={db.quotationNumbering.next}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isSafeInteger(next) && next > 0)
                  mutate((d) => {
                    d.quotationNumbering.next = next;
                  }, "");
              }}
            />
          </Field>
        </section>
        <section className="panel">
          <h2>Phase Weights</h2>
          <Field label="Project">
            <select
              value={weightProject}
              onChange={(e) => {
                setWeightProject(e.target.value);
                setWeights(null);
              }}
            >
              {db.projects.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const phases = db.phases.filter(
                (p) => p.projectId === weightProject,
              );
              const values = weights || phases.map((p) => p.weight);
              if (
                mutate((d) => {
                  if (
                    values.reduce((s, n) => s + n, 0) !== 100 ||
                    values.some((n) => n < 0)
                  )
                    throw Error(
                      "Phase weights must be non-negative and total 100%.",
                    );
                  phases.forEach(
                    (p, i) =>
                      (d.phases.find((x) => x.id === p.id)!.weight = values[i]),
                  );
                  record(
                    d,
                    weightProject,
                    "Project",
                    weightProject,
                    "Weights updated",
                    values.join(", "),
                  );
                })
              )
                setWeights(null);
            }}
          >
            <div className="form-grid">
              {db.phases
                .filter((p) => p.projectId === weightProject)
                .map((p, i) => (
                  <Field key={p.id} label={p.name + " %"}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weights?.[i] ?? p.weight}
                      onChange={(e) => {
                        const values =
                          weights ||
                          db.phases
                            .filter((p) => p.projectId === weightProject)
                            .map((p) => p.weight);
                        setWeights(
                          values.map((n, j) =>
                            j === i ? Number(e.target.value) : n,
                          ),
                        );
                      }}
                    />
                  </Field>
                ))}
            </div>
            <button className="primary">Save Weights</button>
          </form>
        </section>
      </>
    );
  else
    content = (
      <Empty>
        Page not found. <a href="#/dashboard">Return to Dashboard</a>
      </Empty>
    );
  return (
    <>
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <a className="brand" href="#/dashboard">
          <img src="/assets/azzora-logo.png" alt="AZZORA design . build" />
          <span>
            <strong>AZZORA</strong>
            <small>design . build</small>
          </span>
          <Badge>DXB</Badge>
        </a>
        <div className="site-select">
          <small>Active project</small>
          <select
            aria-label="Open active project"
            value={id || ""}
            onChange={(e) => open(e.target.value)}
          >
            <option value="">UAE Portfolio</option>
            {db.projects
              .filter((p) => p.status === "Active")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
        <small className="nav-label">Project Execution</small>
        <nav>
          {navigation.map(([key, label, Icon], i) => (
            <a
              key={key}
              href={"#/" + key}
              aria-current={page === key ? "page" : undefined}
              className={
                (page === key ? "active " : "") + (i === 9 ? "governance" : "")
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <footer>
          <small>Dubai HQ Studio</small>
          <span>GST +4 · Browser demo</span>
          <a href="/assets/azzora-logo.png" target="_blank" rel="noreferrer">
            View supplied logo
          </a>
        </footer>
      </aside>
      {menu && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-only"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={20} />
          </button>
          <div className="portfolio">
            <span className="dot" />
            <strong>Dubai & Northern Emirates</strong>
            <Badge>UAE Portfolio</Badge>
          </div>
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Global search"
              placeholder="Search projects, tasks, people…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {q && (
              <div className="search-results">
                {search.map((r) => (
                  <button
                    key={r.type + r.id}
                    onClick={() => {
                      r.open();
                      setQuery("");
                    }}
                  >
                    <small>{r.type}</small>
                    {r.label}
                  </button>
                ))}
                {!search.length && <Empty>No results found.</Empty>}
              </div>
            )}
          </div>
          <button className="primary quick-add" onClick={() => setWizard(true)}>
            <Plus size={18} />
            <span>Quick Add</span>
          </button>
          <button
            aria-label="Notifications"
            onClick={() => setNotifications(true)}
          >
            <Bell size={19} />
          </button>
          <button
            className="profile"
            aria-label="User profile"
            onClick={() => setProfile(true)}
          >
            SM
          </button>
        </header>
        <main>
          {content}
          <footer className="page-footer">
            AZZORA Project Control · {today()} · Demo data, local to this
            browser
          </footer>
        </main>
      </div>
      <nav className="mobile-nav">
        <a href="#/dashboard">
          <LayoutDashboard size={20} />
          Dashboard
        </a>
        <a href="#/projects">
          <Building2 size={20} />
          Projects
        </a>
        <a href="#/tasks">
          <ListChecks size={20} />
          Tasks
        </a>
        <a href="#/site-updates">
          <HardHat size={20} />
          Updates
        </a>
        <button onClick={() => setMenu(true)}>
          <Menu size={20} />
          More
        </button>
      </nav>
      {toast && (
        <div role="status" className="toast">
          {toast}
          <button aria-label="Dismiss notification" onClick={clear}>
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <div role="alert" className="toast error-toast">
          {error}
          <button aria-label="Dismiss error" onClick={clear}>
            <X size={16} />
          </button>
        </div>
      )}
      {wizard && (
        <Wizard
          onClose={() => setWizard(false)}
          onCreated={(id) => {
            setWizard(false);
            open(id);
          }}
        />
      )}
      {task && (
        <TaskDrawer key={task.id} task={task} onClose={() => setTask(null)} />
      )}{" "}
      {notifications && (
        <Modal title="Notifications" onClose={() => setNotifications(false)}>
          <p>Current attention items derive from project records.</p>
          {db.tasks
            .filter((t) => t.status === "Blocked")
            .map((t) => (
              <button
                key={t.id}
                className="list-row"
                onClick={() => {
                  setNotifications(false);
                  setTask(t);
                }}
              >
                {t.name}
                <Badge>Blocked</Badge>
              </button>
            ))}
          {db.documents
            .filter((d) => d.status === "Pending")
            .map((d) => (
              <p key={d.id}>
                {d.name}
                <Badge>Pending approval</Badge>
              </p>
            ))}
        </Modal>
      )}
      {profile && (
        <Modal title="Demo User" onClose={() => setProfile(false)}>
          <p>Sarah Mansoor · Project Manager</p>
          <p>This browser demo has no sign-in or server permissions.</p>
        </Modal>
      )}
      {resetConfirm && (
        <Confirm
          title="Reset all demo changes?"
          onClose={() => setResetConfirm(false)}
          onConfirm={() => {
            reset();
            setResetConfirm(false);
            location.hash = "/dashboard";
          }}
        >
          Export your demo data first if you need to keep it. Reset replaces
          locally saved projects and activity.
        </Confirm>
      )}
    </>
  );
}
