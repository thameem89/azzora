import { useState } from "react";
import { useStore } from "../store";
import type {
  SiteUpdate,
  Snag,
  SnagStatus,
  DocumentRecord,
  Attachment,
} from "../domain/model";
import { categories, priorities, snagStatuses } from "../domain/model";
import { uid, today, addDays, dateLabel } from "../domain/logic";
import { record, transitionSnag } from "../domain/repository";
import { Modal, Header, Field, Badge, Empty, personName } from "./ui";
import { Attachments } from "./uploads";
function ProjectSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { db } = useStore();
  return (
    <Field label="Project">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {db.projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} · {p.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function SiteUpdates({ projectId }: { projectId?: string }) {
  const { db, mutate } = useStore();
  const [filter, setFilter] = useState(projectId || "");
  const [draft, setDraft] = useState<SiteUpdate | null>(null);
  function create() {
    setDraft({
      id: uid(),
      projectId: filter || db.projects[0].id,
      date: today(),
      completed: "",
      inProgress: "",
      issue: "",
      tomorrow: "",
      manpower: 0,
      notes: "",
      authorId: "person-0",
      photos: [],
    });
  }
  const list = db.updates
    .filter((u) => !filter || u.projectId === filter)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <Header
        title="Site Updates"
        description="Daily site records, progress photography and field issues."
        action={
          <button className="primary" onClick={create}>
            + Post Site Update
          </button>
        }
      />
      {!projectId && (
        <div className="filters">
          <select
            aria-label="Site updates project"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {db.projects.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="feed">
        {list.map((u) => (
          <article className="panel" key={u.id}>
            <div className="between">
              <h3>{db.projects.find((p) => p.id === u.projectId)?.name}</h3>
              <Badge>{dateLabel(u.date)}</Badge>
            </div>
            <small>
              {personName(db, u.authorId)} · {u.manpower} personnel
            </small>
            <div className="detail-grid">
              <div>
                <small>Work completed</small>
                <p>{u.completed}</p>
              </div>
              <div>
                <small>Work in progress</small>
                <p>{u.inProgress || "None recorded"}</p>
              </div>
              <div>
                <small>Tomorrow’s plan</small>
                <p>{u.tomorrow || "None recorded"}</p>
              </div>
              <div>
                <small>Issues / delays</small>
                <p className={u.issue ? "error" : ""}>
                  {u.issue || "None reported"}
                </p>
              </div>
            </div>
            <p>{u.notes}</p>
            <div className="photo-grid">
              {u.photos.map((f) => (
                <figure key={f.id}>
                  <img src={f.dataUrl} alt={f.name} />
                  <figcaption>
                    {f.category} · {f.name}
                  </figcaption>
                </figure>
              ))}
            </div>
            {!u.photos.length && (
              <p className="muted">No photos attached to this demo record.</p>
            )}
          </article>
        ))}
      </div>
      {!list.length && <Empty>No site updates yet.</Empty>}
      {draft && (
        <Modal title="Daily Site Update" onClose={() => setDraft(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                mutate((d) => {
                  d.updates.push(draft);
                  record(
                    d,
                    draft.projectId,
                    "SiteUpdate",
                    draft.id,
                    "Site update posted",
                    draft.completed,
                  );
                }, "Site update posted")
              )
                setDraft(null);
            }}
          >
            <ProjectSelect
              value={draft.projectId}
              onChange={(id) => setDraft({ ...draft, projectId: id })}
            />
            <div className="form-grid">
              <Field label="Date">
                <input
                  type="date"
                  required
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </Field>
              <Field label="Manpower count">
                <input
                  type="number"
                  min={0}
                  required
                  value={draft.manpower}
                  onChange={(e) =>
                    setDraft({ ...draft, manpower: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            {(
              [
                ["completed", "Work completed"],
                ["inProgress", "Work in progress"],
                ["issue", "Delay / Issue"],
                ["tomorrow", "Tomorrow’s plan"],
                ["notes", "Notes"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <textarea
                  required={key === "completed"}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </Field>
            ))}
            <Attachments
              photos
              files={draft.photos}
              onChange={(photos) => setDraft({ ...draft, photos })}
            />
            <button className="primary">Post Update</button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Snags({ projectId }: { projectId?: string }) {
  const { db, mutate } = useStore();
  const [filter, setFilter] = useState(projectId || "");
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<Snag | null>(null);
  const [nextStatus, setNextStatus] = useState<SnagStatus>("Open");
  const list = db.snags.filter(
    (s) =>
      (!filter || s.projectId === filter) && (!status || s.status === status),
  );
  function open(s: Snag) {
    setDraft(structuredClone(s));
    setNextStatus(s.status);
  }
  function create() {
    open({
      id: uid(),
      reference:
        "SN-" +
        String(
          Math.max(
            0,
            ...db.snags.map((s) => Number(s.reference.replace(/\D/g, ""))),
          ) + 1,
        ).padStart(3, "0"),
      projectId: filter || db.projects[0].id,
      area: "",
      description: "",
      assigneeId: "",
      priority: "Normal",
      createdAt: new Date().toISOString(),
      due: addDays(today(), 7),
      status: "Open",
      before: [],
      after: [],
      inspection: "",
      createdBy: "person-0",
    });
  }
  return (
    <>
      <Header
        title="Snags & Quality Assurance"
        description="Track rectification through inspection and retain the record."
        action={
          <button className="primary" onClick={create}>
            + Create Snag
          </button>
        }
      />
      <div className="filters">
        {!projectId && (
          <select
            aria-label="Snag project"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {db.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Snag status filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {snagStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="project-grid">
        {list.map((s) => (
          <button
            className="panel snag-card"
            key={s.id}
            onClick={() => open(s)}
          >
            <div className="between">
              <small>
                {s.reference} ·{" "}
                {db.projects.find((p) => p.id === s.projectId)?.code}
              </small>
              <Badge>{s.status}</Badge>
            </div>
            <h3>{s.area}</h3>
            <p>{s.description}</p>
            <p>
              {personName(db, s.assigneeId)} · Due {dateLabel(s.due)}
            </p>
            <Badge>{s.priority}</Badge>
          </button>
        ))}
      </div>
      {!list.length && <Empty>No snags match this view.</Empty>}
      {draft && (
        <Modal
          drawer
          title={draft.reference + " · Snag record"}
          onClose={() => setDraft(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (nextStatus !== "Open" && !draft.assigneeId) {
                return mutate(() => {
                  throw Error(
                    "Assign a responsible person before advancing the snag.",
                  );
                });
              }
              if (
                mutate((d) => {
                  const old = d.snags.find((s) => s.id === draft.id);
                  if (old) {
                    const originalStatus = old.status;
                    record(
                      d,
                      draft.projectId,
                      "Snag",
                      draft.id,
                      "Snag updated",
                      draft.description,
                      JSON.stringify(old),
                    );
                    Object.assign(old, draft, { status: originalStatus });
                    transitionSnag(d, draft.id, nextStatus);
                  } else {
                    d.snags.push(draft);
                    record(
                      d,
                      draft.projectId,
                      "Snag",
                      draft.id,
                      "Snag created",
                      draft.reference,
                    );
                    if (nextStatus !== "Open")
                      transitionSnag(d, draft.id, nextStatus);
                  }
                })
              )
                setDraft(null);
            }}
          >
            <ProjectSelect
              value={draft.projectId}
              onChange={(id) => setDraft({ ...draft, projectId: id })}
            />
            <Field label="Area / Room">
              <input
                required
                value={draft.area}
                onChange={(e) => setDraft({ ...draft, area: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                required
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </Field>
            <Field label="Responsible person">
              <select
                value={draft.assigneeId}
                onChange={(e) =>
                  setDraft({ ...draft, assigneeId: e.target.value })
                }
              >
                <option value="">Unassigned</option>
                {db.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Priority">
                <select
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      priority: e.target.value as Snag["priority"],
                    })
                  }
                >
                  {priorities.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Target date">
                <input
                  type="date"
                  required
                  value={draft.due}
                  onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Status">
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as SnagStatus)}
              >
                {snagStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <p className="muted">
              Advance one step at a time. Closure requires inspection notes.
            </p>
            <h3>Before photos</h3>
            <Attachments
              photos
              files={draft.before}
              onChange={(before) => setDraft({ ...draft, before })}
            />
            <h3>After photos</h3>
            <Attachments
              photos
              files={draft.after}
              onChange={(after) => setDraft({ ...draft, after })}
            />
            <Field label="Inspection notes">
              <textarea
                value={draft.inspection}
                onChange={(e) =>
                  setDraft({ ...draft, inspection: e.target.value })
                }
              />
            </Field>
            <h3>History</h3>
            {db.activities
              .filter((a) => a.entityId === draft.id)
              .map((a) => (
                <p key={a.id}>
                  {a.summary}
                  <small>{a.timestamp}</small>
                </p>
              ))}
            <button className="primary">Save Snag</button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Documents({ projectId }: { projectId?: string }) {
  const { db, mutate } = useStore();
  const [filter, setFilter] = useState(projectId || "");
  const [category, setCategory] = useState("");
  const [draft, setDraft] = useState<DocumentRecord | null>(null);
  const [files, setFiles] = useState<Attachment[]>([]);
  const list = db.documents.filter(
    (d) =>
      (!filter || d.projectId === filter) &&
      (!category || d.category === category),
  );
  return (
    <>
      <Header
        title="Document Register"
        description="Versioned metadata, drawing approvals and project records."
        action={
          <button
            className="primary"
            onClick={() => {
              setFiles([]);
              setDraft({
                id: uid(),
                projectId: filter || db.projects[0].id,
                name: "",
                category: "Design Drawings",
                status: "Pending",
                version: 1,
                uploadedAt: today(),
                uploadedBy: "person-0",
              });
            }}
          >
            + Add Document
          </button>
        }
      />
      <p className="notice">
        Demo document register. Attached files are kept in this browser only;
        seeded records contain metadata without files.
      </p>
      <div className="filters">
        {!projectId && (
          <select
            aria-label="Documents project"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {db.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Document category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="panel">
        {list.map((d) => (
          <div key={d.id} className="list-row">
            <span>
              <strong>{d.name}</strong>
              <small>
                {d.category} · v{d.version} ·{" "}
                {db.projects.find((p) => p.id === d.projectId)?.code} ·{" "}
                {dateLabel(d.uploadedAt)}
              </small>
            </span>
            <Badge>{d.status}</Badge>
            {d.attachment?.dataUrl ? (
              <a
                className="button"
                href={d.attachment.dataUrl}
                download={d.attachment.name}
              >
                Download
              </a>
            ) : (
              <span className="muted">Metadata only</span>
            )}
            <button
              onClick={() => {
                setDraft(structuredClone(d));
                setFiles(d.attachment ? [d.attachment] : []);
              }}
            >
              Edit / approve
            </button>
          </div>
        ))}
        {!list.length && <Empty />}
      </div>
      {draft && (
        <Modal title="Document Metadata" onClose={() => setDraft(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                mutate((d) => {
                  const next = { ...draft, attachment: files[0] };
                  const old = d.documents.find((x) => x.id === next.id);
                  if (old) Object.assign(old, next);
                  else d.documents.push(next);
                  record(
                    d,
                    next.projectId,
                    "Document",
                    next.id,
                    "Document updated",
                    next.name + " · " + next.status,
                  );
                })
              )
                setDraft(null);
            }}
          >
            <ProjectSelect
              value={draft.projectId}
              onChange={(projectId) => setDraft({ ...draft, projectId })}
            />
            <Field label="Document name">
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              >
                {categories.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Version">
              <input
                type="number"
                min={1}
                required
                value={draft.version}
                onChange={(e) =>
                  setDraft({ ...draft, version: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Approval status">
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as DocumentRecord["status"],
                  })
                }
              >
                <option>Pending</option>
                <option>Approved</option>
              </select>
            </Field>
            <Attachments files={files} onChange={setFiles} />
            {files.length > 1 && (
              <p className="notice">
                This record stores the first attachment; create separate records
                for other files.
              </p>
            )}
            <button className="primary">Save Document</button>
          </form>
        </Modal>
      )}
    </>
  );
}
