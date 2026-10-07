import { useState } from "react";
import type { Assignment, Person, Task } from "../domain/model";
import { roles } from "../domain/model";
import { workload, availability, today, uid } from "../domain/logic";
import { record, saveTask } from "../domain/repository";
import { useStore } from "../store";
import {
  Header,
  Modal,
  Avatar,
  Badge,
  Progress,
  Field,
  Confirm,
  personName,
  Empty,
} from "./ui";
import { TaskList } from "./Tasks";
export function Team({
  projectId,
  onTask,
}: {
  projectId?: string;
  onTask: (t: Task) => void;
}) {
  const { db, mutate } = useStore();
  const [person, setPerson] = useState<Person | null>(null);
  const [draft, setDraft] = useState<Assignment | null>(null);
  const [replacement, setReplacement] = useState("");
  const [reassign, setReassign] = useState(false);
  const [remove, setRemove] = useState<Assignment | null>(null);
  const assignments = db.assignments.filter(
    (a) => (!projectId || a.projectId === projectId) && a.status === "Active",
  );
  const list = projectId
    ? db.people.filter((p) => assignments.some((a) => a.personId === p.id))
    : db.people;
  function edit(a?: Assignment) {
    setDraft(
      a
        ? structuredClone(a)
        : {
            id: uid(),
            projectId: projectId || db.projects[0].id,
            personId: db.people[0].id,
            role: "Project Manager",
            start: today(),
            end: db.projects.find(
              (p) => p.id === (projectId || db.projects[0].id),
            )!.due,
            responsibility: "",
            status: "Active",
          },
    );
    setReplacement(a?.personId || db.people[0].id);
    setReassign(false);
  }
  return (
    <>
      <Header
        title={projectId ? "Project Team" : "Team & Resource Allocation"}
        description="Project roles and task allocations share one resource view."
        action={
          <button className="primary" onClick={() => edit()}>
            + Assign Person
          </button>
        }
      />
      <div className="kpis">
        {[
          ["Total Team", list.length],
          [
            "Assigned",
            list.filter((p) => assignments.some((a) => a.personId === p.id))
              .length,
          ],
          ["Available", list.filter((p) => workload(db, p.id) < 50).length],
          [
            "Over Capacity",
            list.filter((p) => workload(db, p.id) > 100).length,
          ],
        ].map(([label, n]) => (
          <div className="panel kpi" key={label}>
            <small>{label}</small>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <div className="team-grid">
        {list.map((p) => (
          <button
            className="panel team-card"
            key={p.id}
            onClick={() => setPerson(p)}
          >
            <div className="inline">
              <Avatar name={p.name} />
              <div>
                <h3>{p.name}</h3>
                <p>{p.role}</p>
              </div>
            </div>
            <Progress value={Math.min(100, workload(db, p.id))} />
            <p>
              {workload(db, p.id)}% allocated ·{" "}
              {
                db.tasks.filter(
                  (t) => t.assigneeId === p.id && t.status !== "Completed",
                ).length
              }{" "}
              active tasks
            </p>
            <Badge>{availability(workload(db, p.id))}</Badge>
            <small>
              {
                db.assignments.filter(
                  (a) => a.personId === p.id && a.status === "Active",
                ).length
              }{" "}
              project assignments
            </small>
          </button>
        ))}
      </div>
      <h2>Project assignments</h2>
      <div className="panel">
        {assignments.map((a) => (
          <div className="list-row" key={a.id}>
            <span>
              <strong>{personName(db, a.personId)}</strong>
              <small>
                {db.projects.find((p) => p.id === a.projectId)?.code} · {a.role}{" "}
                · {a.start} → {a.end}
              </small>
            </span>
            <button onClick={() => edit(a)}>Edit / replace</button>
            <button onClick={() => setRemove(a)}>Remove</button>
          </div>
        ))}
        {!assignments.length && <Empty />}
      </div>
      {person && (
        <Modal drawer title={person.name} onClose={() => setPerson(null)}>
          <p>
            {person.role} · {person.status}
          </p>
          <p>
            {person.email}
            <br />
            {person.phone}
          </p>
          <h3>
            {workload(db, person.id)}% · {availability(workload(db, person.id))}
          </h3>
          {db.projects
            .filter(
              (p) =>
                db.tasks.some(
                  (t) => t.projectId === p.id && t.assigneeId === person.id,
                ) ||
                db.assignments.some(
                  (a) =>
                    a.projectId === p.id &&
                    a.personId === person.id &&
                    a.status === "Active",
                ),
            )
            .map((p) => (
              <p key={p.id}>
                {p.name} ·{" "}
                {db.tasks
                  .filter(
                    (t) =>
                      t.projectId === p.id &&
                      t.assigneeId === person.id &&
                      t.status !== "Completed",
                  )
                  .reduce((s, t) => s + t.allocation, 0)}
                %
                <small>
                  {db.assignments
                    .filter(
                      (a) =>
                        a.projectId === p.id &&
                        a.personId === person.id &&
                        a.status === "Active",
                    )
                    .map((a) => a.role)
                    .join(", ")}
                </small>
              </p>
            ))}
          <h3>Current & upcoming tasks</h3>
          <TaskList
            tasks={db.tasks.filter(
              (t) => t.assigneeId === person.id && t.status !== "Completed",
            )}
            onTask={(t) => {
              setPerson(null);
              onTask(t);
            }}
          />
        </Modal>
      )}
      {draft && (
        <Modal title="Project Assignment" onClose={() => setDraft(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.end < draft.start)
                return mutate(() => {
                  throw Error("Assignment end date must follow start.");
                });
              if (
                mutate((d) => {
                  const old = d.assignments.find((a) => a.id === draft.id);
                  if (old && old.personId !== replacement) {
                    old.status = "Replaced";
                    d.assignments.push({
                      ...draft,
                      id: uid(),
                      personId: replacement,
                      status: "Active",
                    });
                    if (reassign)
                      d.tasks
                        .filter(
                          (t) =>
                            t.projectId === draft.projectId &&
                            t.assigneeId === old.personId &&
                            t.status !== "Completed",
                        )
                        .forEach((t) =>
                          saveTask(d, { ...t, assigneeId: replacement }),
                        );
                  } else if (old)
                    Object.assign(old, { ...draft, personId: replacement });
                  else d.assignments.push({ ...draft, personId: replacement });
                  if (draft.role === "Project Manager") {
                    d.assignments
                      .filter(
                        (a) =>
                          a.projectId === draft.projectId &&
                          a.role === "Project Manager" &&
                          a.personId !== replacement &&
                          a.status === "Active",
                      )
                      .forEach((a) => {
                        a.status = "Replaced";
                      });
                    d.projects.find(
                      (p) => p.id === draft.projectId,
                    )!.managerId = replacement;
                  }
                  record(
                    d,
                    draft.projectId,
                    "Assignment",
                    draft.id,
                    "Person assigned",
                    personName(d, replacement) + " · " + draft.role,
                  );
                })
              )
                setDraft(null);
            }}
          >
            <Field label="Project">
              <select
                value={draft.projectId}
                onChange={(e) =>
                  setDraft({ ...draft, projectId: e.target.value })
                }
              >
                {db.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Person">
              <select
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
              >
                {db.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {workload(db, p.id)}% ·{" "}
                    {availability(workload(db, p.id))}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project role">
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              >
                {roles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Start">
                <input
                  type="date"
                  value={draft.start}
                  required
                  onChange={(e) =>
                    setDraft({ ...draft, start: e.target.value })
                  }
                />
              </Field>
              <Field label="Expected end">
                <input
                  type="date"
                  value={draft.end}
                  min={draft.start}
                  required
                  onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Responsibility">
              <textarea
                value={draft.responsibility}
                onChange={(e) =>
                  setDraft({ ...draft, responsibility: e.target.value })
                }
              />
            </Field>
            <label className="choice">
              <input
                type="checkbox"
                checked={reassign}
                onChange={(e) => setReassign(e.target.checked)}
              />{" "}
              Reassign active tasks when replacing this person
            </label>
            <p className="muted">
              Previous assignments and completed task history are retained.
            </p>
            <button className="primary">Save Assignment</button>
          </form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="Remove project assignment?"
          onClose={() => setRemove(null)}
          onConfirm={() => {
            if (
              mutate((d) => {
                d.assignments.find((a) => a.id === remove.id)!.status =
                  "Removed";
                if (
                  remove.role === "Project Manager" &&
                  d.projects.find((p) => p.id === remove.projectId)!
                    .managerId === remove.personId
                )
                  d.projects.find((p) => p.id === remove.projectId)!.managerId =
                    "";
                record(
                  d,
                  remove.projectId,
                  "Assignment",
                  remove.id,
                  "Assignment removed",
                  personName(d, remove.personId),
                );
              })
            )
              setRemove(null);
          }}
        >
          Task assignments and historical work remain available.
        </Confirm>
      )}
    </>
  );
}
