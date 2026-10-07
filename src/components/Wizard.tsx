import { useState } from "react";
import { useStore } from "../store";
import type { Project } from "../domain/model";
import {
  roles,
  trades,
  projectTypes,
  emirates,
  priorities,
} from "../domain/model";
import {
  addDays,
  today,
  uid,
  workload,
  availability,
  money,
} from "../domain/logic";
import { createProject } from "../domain/repository";
import { templates } from "../domain/seed";
import { Modal, Field, personName } from "./ui";
export function Wizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { db, mutate } = useStore();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Project>({
    id: uid(),
    code:
      "AZ-" +
      String(
        Math.max(
          0,
          ...db.projects.map((p) => Number(p.code.replace(/\D/g, ""))),
        ) + 1,
      ).padStart(3, "0"),
    name: "",
    clientId: uid(),
    location: "",
    emirate: "Dubai",
    building: "",
    unit: "",
    area: 0,
    scope: "",
    disciplines: [],
    type: "Office Fit-Out",
    value: 0,
    start: today(),
    due: addDays(today(), 90),
    managerId: db.people[0]?.id || "",
    priority: "Normal",
    status: "Active",
  });
  const [client, setClient] = useState("");
  const [contact, setContact] = useState("");
  const [team, setTeam] = useState<Record<string, string>>({});
  const [standard, setStandard] = useState(true);
  const [error, setError] = useState("");
  const set = <K extends keyof Project>(k: K, v: Project[K]) =>
    setP({ ...p, [k]: v });
  function next() {
    if (
      step === 0 &&
      (!p.name.trim() ||
        !client.trim() ||
        !p.code.trim() ||
        p.value < 0 ||
        p.due < p.start)
    ) {
      setError("Enter project name, client, unique code and valid dates.");
      return;
    }
    if (step === 1 && (!p.location.trim() || !p.disciplines.length)) {
      setError("Enter the location and select at least one scope discipline.");
      return;
    }
    setError("");
    setStep(step + 1);
  }
  function create(draft = false) {
    if (
      mutate(
        (d) =>
          createProject(
            d,
            { ...p, status: draft ? "Draft" : "Active" },
            client,
            contact,
            team,
            standard,
          ),
        draft
          ? "Project draft saved"
          : "Project created with connected plan and team",
      )
    )
      onCreated(p.id);
  }
  return (
    <Modal title="New Project" onClose={onClose}>
      <div className="wizard-steps">
        {[
          "Details",
          "Scope & Location",
          "Project Team",
          "Project Plan",
          "Review",
        ].map((s, i) => (
          <span key={s} className={i === step ? "active" : ""}>
            {i + 1}. {s}
          </span>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 4) next();
          else create();
        }}
      >
        {step === 0 && (
          <div className="form-grid">
            <Field label="Project name">
              <input
                required
                value={p.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="Project code">
              <input
                required
                value={p.code}
                onChange={(e) => set("code", e.target.value)}
              />
            </Field>
            <Field label="Client name">
              <input
                required
                value={client}
                onChange={(e) => setClient(e.target.value)}
              />
            </Field>
            <Field label="Client contact">
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </Field>
            <Field label="Project type">
              <select
                value={p.type}
                onChange={(e) => set("type", e.target.value)}
              >
                {projectTypes.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Contract value AED">
              <input
                type="number"
                min={0}
                value={p.value}
                onChange={(e) => set("value", Number(e.target.value))}
              />
            </Field>
            <Field label="Start date">
              <input
                required
                type="date"
                value={p.start}
                onChange={(e) => set("start", e.target.value)}
              />
            </Field>
            <Field label="Target completion">
              <input
                required
                type="date"
                min={p.start}
                value={p.due}
                onChange={(e) => set("due", e.target.value)}
              />
            </Field>
            <Field label="Project manager">
              <select
                value={p.managerId}
                onChange={(e) => set("managerId", e.target.value)}
              >
                {db.people.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} · {x.role}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={p.priority}
                onChange={(e) =>
                  set("priority", e.target.value as Project["priority"])
                }
              >
                {priorities.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {step === 1 && (
          <>
            <div className="form-grid">
              <Field label="Project location">
                <input
                  required
                  value={p.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </Field>
              <Field label="Emirate">
                <select
                  value={p.emirate}
                  onChange={(e) => set("emirate", e.target.value)}
                >
                  {emirates.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Building / Community">
                <input
                  value={p.building}
                  onChange={(e) => set("building", e.target.value)}
                />
              </Field>
              <Field label="Floor / Unit">
                <input
                  value={p.unit}
                  onChange={(e) => set("unit", e.target.value)}
                />
              </Field>
              <Field label="Approximate area m²">
                <input
                  type="number"
                  min={0}
                  value={p.area}
                  onChange={(e) => set("area", Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label="Scope summary">
              <textarea
                value={p.scope}
                onChange={(e) => set("scope", e.target.value)}
              />
            </Field>
            <h3>Scope disciplines</h3>
            <div className="check-grid">
              {trades.map((s) => (
                <label key={s}>
                  <input
                    type="checkbox"
                    checked={p.disciplines.includes(s)}
                    onChange={(e) =>
                      set(
                        "disciplines",
                        e.target.checked
                          ? [...p.disciplines, s]
                          : p.disciplines.filter((x) => x !== s),
                      )
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            {roles.map((role) => (
              <Field key={role} label={role}>
                <select
                  value={
                    role === "Project Manager" ? p.managerId : team[role] || ""
                  }
                  onChange={(e) =>
                    role === "Project Manager"
                      ? set("managerId", e.target.value)
                      : setTeam({ ...team, [role]: e.target.value })
                  }
                >
                  {role !== "Project Manager" && (
                    <option value="">Assign later</option>
                  )}
                  {db.people.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {x.role} ·{" "}
                      {
                        db.assignments.filter(
                          (a) => a.personId === x.id && a.status === "Active",
                        ).length
                      }{" "}
                      projects · {workload(db, x.id)}% ·{" "}
                      {availability(workload(db, x.id))}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </>
        )}
        {step === 3 && (
          <>
            <label className="choice">
              <input
                type="radio"
                checked={standard}
                onChange={() => setStandard(true)}
              />{" "}
              Use Standard Fit-Out Template{" "}
              <small>
                37 tasks, eight weighted phases and selected MEP construction
                dependencies.
              </small>
            </label>
            <label className="choice">
              <input
                type="radio"
                checked={!standard}
                onChange={() => setStandard(false)}
              />{" "}
              Create Custom Plan{" "}
              <small>Eight configurable phases; add tasks yourself.</small>
            </label>
            <div className="panel">
              {templates.map((t) => (
                <p className="between" key={t.name}>
                  {t.name}
                  <span>{t.weight}%</span>
                </p>
              ))}
            </div>
          </>
        )}
        {step === 4 && (
          <div className="review">
            <h2>
              {p.code} · {p.name}
            </h2>
            <p>
              {client} · {contact}
            </p>
            <p>
              {p.type} · {money(p.value)} · {p.priority}
            </p>
            <p>
              {p.start} → {p.due}
            </p>
            <p>
              {p.location}, {p.emirate} · {p.building} · {p.unit} · {p.area} m²
            </p>
            <p>{p.scope}</p>
            <p>{p.disciplines.join(", ")}</p>
            <h3>Project team</h3>
            <p>Project Manager: {personName(db, p.managerId)}</p>
            {Object.entries(team)
              .filter(([, id]) => id)
              .map(([role, id]) => (
                <p key={role}>
                  {role}: {personName(db, id)}
                </p>
              ))}
            <p>{standard ? "Standard Fit-Out Template" : "Custom Plan"}</p>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="sticky-actions">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step === 4 && (
            <button type="button" onClick={() => create(true)}>
              Save as Draft
            </button>
          )}
          <button className="primary">
            {step === 4 ? "Create Project" : "Continue →"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
