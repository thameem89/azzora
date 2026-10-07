import { useState } from "react";
import type { Task } from "../domain/model";
import { dependencyError, dependencyState } from "../domain/logic";
import { useStore } from "../store";
export function DependencyEditor({
  task,
  onChange,
}: {
  task: Task;
  onChange: (ids: string[]) => void;
}) {
  const { db } = useStore();
  const [error, setError] = useState("");
  const { blockers, conflicts } = dependencyState(db, task);
  return (
    <div className="dependency-editor">
      <strong>Depends On</strong>
      <div className="dependency-chips">
        {task.dependencies.map((id) => (
          <button
            type="button"
            key={id}
            aria-label={`Remove dependency ${db.tasks.find((t) => t.id === id)?.name || id}`}
            onClick={() => {
              setError("");
              onChange(task.dependencies.filter((d) => d !== id));
            }}
          >
            {db.tasks.find((t) => t.id === id)?.name || "Unavailable activity"}{" "}
            ×
          </button>
        ))}
      </div>
      <select
        aria-label="Add dependency"
        value=""
        onChange={(e) => {
          const ids = [...task.dependencies, e.target.value];
          const message = dependencyError(db, task, ids);
          setError(message || "");
          if (!message) onChange(ids);
        }}
      >
        <option value="">+ Add dependency</option>
        {db.tasks
          .filter((t) => t.projectId === task.projectId)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {task.dependencies.includes(t.id) ? " (already added)" : ""}
            </option>
          ))}
      </select>
      {error && (
        <p role="alert" className="timeline-warning">
          {error}
        </p>
      )}
      {blockers.length > 0 && (
        <p className="timeline-warning">
          Blocked by: {blockers.map((t) => t.name).join(", ")}
        </p>
      )}
      {conflicts.map((t) => (
        <p className="timeline-conflict" key={t.id}>
          Date conflict: {task.name} starts before {t.name} is scheduled to
          finish.
        </p>
      ))}
      <small>
        Dependencies never move dates. Edit dates explicitly in activity
        details.
      </small>
    </div>
  );
}
