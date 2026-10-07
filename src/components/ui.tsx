import {
  useEffect,
  useRef,
  useId,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import type { Database } from "../domain/model";
export function Badge({ children }: { children: ReactNode }) {
  const text = String(children);
  return (
    <span
      className={
        "badge " +
        (/Delayed|Blocked|Critical|Over/.test(text)
          ? "bad"
          : /Risk|Pending|Waiting|Near/.test(text)
            ? "warn"
            : /Track|Complete|Closed|Approved|Healthy|Available/.test(text)
              ? "good"
              : "")
      }
    >
      {children}
    </span>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div className="progress-wrap">
      <div className="track">
        <i style={{ width: value + "%" }} />
      </div>
      <span>{Math.round(value)}%</span>
    </div>
  );
}
export function Empty({
  children = "No items match these filters.",
}: {
  children?: ReactNode;
}) {
  return <div className="empty">{children}</div>;
}
export function Header({
  eyebrow = "Project execution",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <small>{eyebrow}</small>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="actions">{action}</div>
    </header>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" title={name}>
      {name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function personName(db: Database, id: string) {
  return db.people.find((p) => p.id === id)?.name || "Unassigned";
}
export function Modal({
  title,
  children,
  onClose,
  drawer = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={drawer ? "drawer" : ""}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  children,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p>{children}</p>
      <div className="actions">
        <button onClick={onClose}>Cancel</button>
        <button className="primary" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </Modal>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id: string }>, { id })
        : children}
    </div>
  );
}
