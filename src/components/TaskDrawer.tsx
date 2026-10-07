import { useState } from "react";
import type { Task } from "../domain/model";
import { priorities, taskStatuses, trades } from "../domain/model";
import { useStore } from "../store";
import { saveTask } from "../domain/repository";
import { uid } from "../domain/logic";
import { Modal, Field, Empty, personName } from "./ui";
import { Attachments } from "./uploads";
import { DependencyEditor } from "./DependencyEditor";
export function TaskDrawer({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const { db, mutate } = useStore();
  const [draft, setDraft] = useState(structuredClone(task));
  const [comment, setComment] = useState("");
  const children = db.tasks.filter((t) => t.parentId === task.id);
  const set = <K extends keyof Task>(key: K, value: Task[K]) =>
    setDraft({ ...draft, [key]: value });
  function save(complete = false) {
    const updated = {
      ...draft,
      status: complete ? ("Completed" as const) : draft.status,
      progress: complete ? 100 : draft.progress,
    };
    if (comment.trim())
      updated.comments = [
        ...updated.comments,
        {
          id: uid(),
          authorId: "person-0",
          text: comment,
          createdAt: new Date().toISOString(),
        },
      ];
    if (children.length && complete) {
      if (
        mutate((d) => {
          d.tasks
            .filter((t) => t.parentId === task.id)
            .forEach((t) =>
              saveTask(d, { ...t, status: "Completed", progress: 100 }),
            );
          saveTask(d, updated);
        })
      )
        onClose();
    } else if (mutate((d) => saveTask(d, updated))) onClose();
  }
  return (
    <Modal
      drawer
      title={
        db.tasks.some((t) => t.id === task.id)
          ? "Task specification"
          : "Create task"
      }
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Task name">
          <input
            required
            minLength={2}
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <p className="muted">
          {db.projects.find((p) => p.id === task.projectId)?.name}
        </p>
        <Field label="Phase">
          <select
            value={draft.phaseId}
            onChange={(e) => {
              setDraft({
                ...draft,
                phaseId: e.target.value,
                parentId: undefined,
              });
            }}
          >
            {db.phases
              .filter((p) => p.projectId === task.projectId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Parent task (optional)">
          <select
            value={draft.parentId || ""}
            onChange={(e) => set("parentId", e.target.value || undefined)}
          >
            <option value="">Top-level task</option>
            {db.tasks
              .filter(
                (t) =>
                  t.phaseId === draft.phaseId &&
                  !t.parentId &&
                  t.id !== task.id &&
                  !children.length,
              )
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Description">
          <textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field label="Assigned to">
          <select
            value={draft.assigneeId}
            onChange={(e) => set("assigneeId", e.target.value)}
          >
            <option value="">Unassigned</option>
            {db.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.role}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Start">
            <input
              type="date"
              required
              value={draft.start}
              onChange={(e) => set("start", e.target.value)}
            />
          </Field>
          <Field label="Due">
            <input
              type="date"
              required
              min={draft.start}
              value={draft.due}
              onChange={(e) => set("due", e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) => set("status", e.target.value as Task["status"])}
            >
              {taskStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={draft.priority}
              onChange={(e) =>
                set("priority", e.target.value as Task["priority"])
              }
            >
              {priorities.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Progress %">
            <input
              type="number"
              min={0}
              max={100}
              disabled={children.length > 0}
              value={draft.progress}
              onChange={(e) => set("progress", Number(e.target.value))}
            />
          </Field>
          <Field label="Allocation %">
            <input
              type="number"
              min={0}
              max={100}
              value={draft.allocation}
              onChange={(e) => set("allocation", Number(e.target.value))}
            />
          </Field>
        </div>
        {children.length > 0 && (
          <p>
            Parent progress derives from subtasks. Mark complete completes its
            subtasks.
          </p>
        )}
        <Field label="Trade">
          <select
            value={draft.trade}
            onChange={(e) => set("trade", e.target.value)}
          >
            {trades.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <DependencyEditor
          task={draft}
          onChange={(ids) => set("dependencies", ids)}
        />
        <Field label="Notes">
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
        <Attachments
          files={draft.attachments}
          onChange={(files) => set("attachments", files)}
        />
        <h3>Comments</h3>
        {draft.comments.map((c) => (
          <p key={c.id}>
            <b>{personName(db, c.authorId)}</b> · {c.text}
          </p>
        ))}
        <Field label="Add comment">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>
        <h3>Activity</h3>
        {db.activities
          .filter((a) => a.entityId === task.id)
          .map((a) => (
            <p key={a.id}>
              {a.summary}
              <small>
                {new Date(a.timestamp).toLocaleString("en-GB", {
                  timeZone: "Asia/Dubai",
                })}
              </small>
            </p>
          ))}
        {!db.activities.some((a) => a.entityId === task.id) && (
          <Empty>No activity recorded yet.</Empty>
        )}
        <div className="sticky-actions">
          <button type="button" onClick={() => save(true)}>
            Mark Complete
          </button>
          <button className="primary">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}
