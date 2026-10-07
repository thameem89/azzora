import { useState } from "react";
import type { Attachment } from "../domain/model";
import { uid } from "../domain/logic";
export function Attachments({
  files,
  onChange,
  photos = false,
}: {
  files: Attachment[];
  onChange: (files: Attachment[]) => void;
  photos?: boolean;
}) {
  const [error, setError] = useState("");
  const [category, setCategory] = useState("Progress");
  const [busy, setBusy] = useState(false);
  async function read(list: FileList | null) {
    if (!list) return;
    setBusy(true);
    try {
      const next: Attachment[] = [];
      for (const file of Array.from(list)) {
        if (file.size > 750000)
          throw Error(
            "Please use files smaller than 750 KB in this browser demo.",
          );
        if (photos && !file.type.startsWith("image/"))
          throw Error("Choose image files.");
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(Error("File could not be read."));
          reader.readAsDataURL(file);
        });
        next.push({
          id: uid(),
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          category,
        });
      }
      onChange([...files, ...next]);
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="uploads">
      <p className="muted">
        Browser demo attachments · under 750 KB each. No cloud storage or
        backup.
      </p>
      {photos && (
        <label>
          Photo category{" "}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["Before", "Progress", "Completed", "Issue", "Inspection"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
      )}
      <input
        aria-label={photos ? "Upload photos" : "Attach files"}
        type="file"
        accept={photos ? "image/*" : undefined}
        multiple
        disabled={busy}
        onChange={(e) => {
          void read(e.target.files);
          e.target.value = "";
        }}
      />
      {busy && <p role="status">Reading files…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="photo-grid">
        {files.map((f) => (
          <div key={f.id}>
            {f.dataUrl && f.type.startsWith("image/") && (
              <img src={f.dataUrl} alt={f.name} />
            )}
            <span>
              {f.name} · {f.category}
            </span>
            <button
              type="button"
              onClick={() => onChange(files.filter((x) => x.id !== f.id))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
