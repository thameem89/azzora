import { useState } from "react";
import { useStore } from "../store";
import { Header, Field, Badge, Confirm, Modal, Empty } from "../components/ui";
import type { Quotation, QuotationLineItem } from "./model";
import { pricingTypes, quotationStatuses } from "./model";
import {
  blankLine,
  newQuotation,
  saveQuotation,
  copyQuotation,
  changeQuotationStatus,
  deleteDraft,
  reorder,
  validationErrors,
} from "./repository";
import { defaultTerms } from "./seed";
import {
  amountInWords,
  displayAmount,
  formatMoney,
  totals,
  sectionAmount,
  paymentAmount,
  paymentPercentage,
} from "./calculations";
import {
  layoutQuotation,
  pageSvg,
  downloadPdf,
  printQuotation,
} from "./document";
import { uid } from "../domain/logic";
const open = (id: string, mode = "edit") => {
  location.hash = "/quotations/" + id + "/" + mode;
};
const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};
function Order({
  index,
  length,
  move,
  label,
}: {
  index: number;
  length: number;
  move: (d: number) => void;
  label: string;
}) {
  return (
    <>
      <button
        aria-label={"Move " + label + " up"}
        disabled={index === 0}
        onClick={() => move(-1)}
      >
        ↑
      </button>
      <button
        aria-label={"Move " + label + " down"}
        disabled={index === length - 1}
        onClick={() => move(1)}
      >
        ↓
      </button>
    </>
  );
}
export function Quotations({
  id,
  mode,
  projectId,
}: {
  id?: string;
  mode?: string;
  projectId?: string;
}) {
  const { db, mutate } = useStore();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [client, setClient] = useState(""),
    [project, setProject] = useState(projectId || "");
  const [confirmation, setConfirmation] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  const [revision, setRevision] = useState(false),
    [returnDraft, setReturnDraft] = useState(false),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const q = db.quotations.find((q) => q.id === id);
  function create() {
    let created = "";
    if (
      mutate((d) => {
        const n = newQuotation(d);
        if (projectId) {
          const p = d.projects.find((p) => p.id === projectId)!;
          const c = d.clients.find((c) => c.id === p.clientId)!;
          Object.assign(n, {
            projectId: p.id,
            customerId: c.id,
            project: { name: p.name, location: p.location },
            customer: { ...n.customer, name: c.name, contact: c.contact },
            introduction: { ...n.introduction, attention: "Dear: " + c.name },
          });
        }
        created = n.id;
      }, "Quotation draft created")
    )
      open(created);
  }
  function update(fn: (copy: Quotation) => void) {
    if (!q) return;
    const next = structuredClone(q);
    fn(next);
    mutate((d) => saveQuotation(d, next), "");
  }
  function duplicate(id: string, rev = false) {
    let next = "";
    if (
      mutate(
        (d) => {
          next = copyQuotation(d, id, rev, notes).id;
        },
        rev ? "New draft revision created" : "Quotation duplicated",
      )
    ) {
      setRevision(false);
      setNotes("");
      open(next);
    }
  }
  async function download(value: Quotation) {
    setBusy(true);
    setError("");
    try {
      await downloadPdf(value);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const print = (value: Quotation) => {
    setError("");
    try {
      printQuotation(value);
    } catch (e) {
      setError(String(e));
    }
  };
  const confirm = (title: string, action: () => void) =>
    setConfirmation({ title, action });
  const confirmations = (
    <>
      {confirmation && (
        <Confirm
          title={confirmation.title}
          onClose={() => setConfirmation(null)}
          onConfirm={() => {
            confirmation.action();
            setConfirmation(null);
          }}
        >
          This action is recorded in this browser.
        </Confirm>
      )}
      {revision && q && (
        <Modal title="Create revision" onClose={() => setRevision(false)}>
          <p>
            The previous revision is preserved. The new revision starts as a
            draft.
          </p>
          <Field label="Revision notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <button className="primary" onClick={() => duplicate(q.id, true)}>
            Create draft revision
          </button>
        </Modal>
      )}
      {returnDraft && q && (
        <Modal title="Return to draft" onClose={() => setReturnDraft(false)}>
          <p>
            Record why this issued quotation needs to be reopened. The issued
            snapshot remains in quotation history.
          </p>
          <Field label="Reason for returning to draft">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <button
            disabled={!notes.trim()}
            onClick={() => {
              if (
                mutate((d) => changeQuotationStatus(d, q.id, "Draft", notes))
              ) {
                setReturnDraft(false);
                setNotes("");
              }
            }}
          >
            Return to draft
          </button>
        </Modal>
      )}
    </>
  );
  if (!id) {
    const list = db.quotations
      .filter(
        (q) =>
          (
            q.number +
            " " +
            q.customer.name +
            " " +
            q.project.name +
            " " +
            q.project.location
          )
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (!status || q.status === status) &&
          (!client || q.customerId === client) &&
          (!project || q.projectId === project),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return (
      <div className="quotation-module">
        <Header
          eyebrow="Commercial management"
          title="Quotations"
          description="Scope, commercial terms and revision history."
          action={
            <button className="primary" onClick={create}>
              New quotation
            </button>
          }
        />
        <div className="filters">
          <input
            aria-label="Search quotations"
            placeholder="Search quotations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Quotation status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {quotationStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Quotation customer filter"
            value={client}
            onChange={(e) => setClient(e.target.value)}
          >
            <option value="">All customers</option>
            {db.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {!projectId && (
            <select
              aria-label="Quotation project filter"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <option value="">All projects</option>
              {db.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="stack">
          {list.map((q) => {
            const t = safe(() => totals(q), null);
            return (
              <article className="panel quote-card" key={q.id}>
                <div className="between">
                  <a href={"#/quotations/" + q.id + "/edit"}>
                    <h2>
                      {q.number}
                      {q.revision ? " Rev " + q.revision : ""}
                    </h2>
                  </a>
                  <Badge>{q.status}</Badge>
                </div>
                <dl className="quote-list-details">
                  {[
                    ["Date", q.date],
                    ["Customer", q.customer.name || "Not selected"],
                    ["Project / Job", q.project.name || "Not entered"],
                    ["Location", q.project.location || "Not entered"],
                    [
                      "Subtotal",
                      t ? formatMoney(t.subtotal, true) : "Check values",
                    ],
                    ["VAT", t ? formatMoney(t.vat, true) : "Check values"],
                    [
                      "Grand Total",
                      t ? formatMoney(t.grand, true) : "Check values",
                    ],
                    ["Revision", String(q.revision)],
                    [
                      "Last Updated",
                      new Date(q.updatedAt).toLocaleString("en-GB", {
                        timeZone: "Asia/Dubai",
                      }),
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="actions">
                  <button onClick={() => open(q.id)}>
                    Open{q.status === "Draft" ? " / Edit" : ""}
                  </button>
                  <button onClick={() => duplicate(q.id)}>Duplicate</button>
                  <button
                    onClick={() => {
                      open(q.id);
                      setRevision(true);
                    }}
                  >
                    Create Revision
                  </button>
                  <button onClick={() => open(q.id, "preview")}>Preview</button>
                  <button disabled={busy} onClick={() => void download(q)}>
                    Download PDF
                  </button>
                  {q.status === "Draft" &&
                    !q.finalizedAt &&
                    !db.quotations.some(
                      (x) => x.revisionDetails.sourceId === q.id,
                    ) && (
                      <button
                        onClick={() =>
                          confirm("Delete draft " + q.number + "?", () =>
                            mutate((d) => deleteDraft(d, q.id)),
                          )
                        }
                      >
                        Delete Draft
                      </button>
                    )}
                </div>
              </article>
            );
          })}
        </div>
        {!list.length && <Empty>No quotations match.</Empty>}
        {error && <p role="alert">{error}</p>}
        {confirmations}
      </div>
    );
  }
  if (!q)
    return (
      <Empty>
        Quotation not found. <a href="#/quotations">Open quotations</a>
      </Empty>
    );
  const locked = q.status !== "Draft",
    preview = mode === "preview";
  const t = safe(() => totals(q), null),
    errors = validationErrors(q);
  const pages = preview ? safe(() => layoutQuotation(q), null) : null;
  return (
    <div className="quotation-module">
      <Header
        eyebrow="Quotation management"
        title={q.number + (q.revision ? " Rev " + q.revision : "")}
        description={q.customer.name + " · " + q.project.name}
        action={
          <>
            <a className="button" href="#/quotations">
              Quotation list
            </a>
            <button onClick={() => open(q.id, preview ? "edit" : "preview")}>
              {preview ? "Open / Edit" : "Preview"}
            </button>
            <button disabled={busy || !t} onClick={() => void download(q)}>
              {busy ? "Generating…" : "Download PDF"}
            </button>
            <button disabled={!t} onClick={() => print(q)}>
              Print
            </button>
          </>
        }
      />
      <div className="panel quote-toolbar">
        <Badge>{q.status}</Badge>
        <span role="status">
          {locked
            ? "Issued content is locked"
            : "Draft autosave · " +
              new Date(q.updatedAt).toLocaleTimeString("en-GB", {
                timeZone: "Asia/Dubai",
              })}
        </span>
        <div className="actions">
          {!locked && (
            <>
              <button
                onClick={() =>
                  mutate((d) => {
                    saveQuotation(d, q);
                    d.quotations
                      .find((x) => x.id === q.id)!
                      .history.push({
                        date: new Date().toISOString(),
                        action: "Draft saved",
                        notes: "",
                      });
                  }, "Draft saved")
                }
              >
                Save Draft
              </button>
              <button
                className="primary"
                onClick={() =>
                  confirm("Finalize quotation?", () =>
                    mutate((d) => changeQuotationStatus(d, q.id, "Finalized")),
                  )
                }
              >
                Finalize
              </button>
            </>
          )}
          {locked && (
            <>
              <select
                aria-label="Issued quotation status"
                value={q.status}
                onChange={(e) =>
                  mutate((d) =>
                    changeQuotationStatus(
                      d,
                      q.id,
                      e.target.value as Quotation["status"],
                    ),
                  )
                }
              >
                {quotationStatuses
                  .filter((s) => s !== "Draft")
                  .map((s) => (
                    <option key={s}>{s}</option>
                  ))}
              </select>
              <button onClick={() => setReturnDraft(true)}>
                Return to draft
              </button>
            </>
          )}
          <button onClick={() => duplicate(q.id)}>Duplicate Quotation</button>
          <button onClick={() => setRevision(true)}>Create Revision</button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {preview ? (
        <>
          <p className="muted">
            A4 document · {pages?.length || 0} pages · Generated from this
            quotation’s structured data.
          </p>
          {pages ? (
            <div className="quotation-preview">
              {pages.map((p, i) => (
                <div
                  key={i}
                  className="quote-sheet"
                  dangerouslySetInnerHTML={{ __html: pageSvg(p) }}
                />
              ))}
            </div>
          ) : (
            <p role="alert">Correct invalid amounts before previewing.</p>
          )}
        </>
      ) : (
        <>
          <fieldset disabled={locked} className="quote-editor">
            <section className="panel">
              <h2>Customer / Project Details</h2>
              <div className="form-grid">
                <Field label="Quotation Number">
                  <input
                    value={q.number}
                    onChange={(e) =>
                      update((n) => {
                        n.number = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Quotation Date">
                  <input
                    type="date"
                    value={q.date}
                    onChange={(e) =>
                      update((n) => {
                        n.date = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Reference">
                  <input
                    value={q.reference}
                    onChange={(e) =>
                      update((n) => {
                        n.reference = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Revision Number">
                  <input type="number" value={q.revision} readOnly />
                </Field>
                <Field label="Linked Customer">
                  <select
                    value={q.customerId}
                    onChange={(e) =>
                      update((n) => {
                        n.customerId = e.target.value;
                        const c = db.clients.find(
                          (c) => c.id === e.target.value,
                        );
                        if (c) {
                          n.customer.name = c.name;
                          n.customer.contact = c.contact;
                          n.introduction.attention = "Dear: " + c.name;
                        }
                        if (
                          n.projectId &&
                          db.projects.find((p) => p.id === n.projectId)
                            ?.clientId !== e.target.value
                        )
                          n.projectId = "";
                      })
                    }
                  >
                    <option value="">Unlinked customer snapshot</option>
                    {db.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Linked Project">
                  <select
                    value={q.projectId}
                    onChange={(e) =>
                      update((n) => {
                        n.projectId = e.target.value;
                        const p = db.projects.find(
                          (p) => p.id === e.target.value,
                        );
                        if (p) {
                          n.project = { name: p.name, location: p.location };
                          n.customerId = p.clientId;
                          const c = db.clients.find((c) => c.id === p.clientId);
                          if (c) {
                            n.customer.name = c.name;
                            n.customer.contact = c.contact;
                            n.introduction.attention = "Dear: " + c.name;
                          }
                        }
                      })
                    }
                  >
                    <option value="">Unlinked project snapshot</option>
                    {db.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {Object.entries(q.customer).map(([key, value]) => (
                  <Field
                    key={key}
                    label={
                      {
                        name: "Customer",
                        contact: "Contact Person",
                        address: "Customer Address",
                        email: "Customer Email",
                        phone: "Customer Phone",
                      }[key] || key
                    }
                  >
                    <input
                      value={value}
                      onChange={(e) =>
                        update((n) => {
                          n.customer[key as keyof Quotation["customer"]] =
                            e.target.value;
                        })
                      }
                    />
                  </Field>
                ))}
                <Field label="Job / Project Name">
                  <input
                    value={q.project.name}
                    onChange={(e) =>
                      update((n) => {
                        n.project.name = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Project Location">
                  <input
                    value={q.project.location}
                    onChange={(e) =>
                      update((n) => {
                        n.project.location = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Salesperson / Prepared By">
                  <input
                    value={q.preparedBy}
                    onChange={(e) =>
                      update((n) => {
                        n.preparedBy = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Validity">
                  <input
                    value={q.validity}
                    onChange={(e) =>
                      update((n) => {
                        n.validity = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Revision Date">
                  <input
                    type="date"
                    value={q.revisionDetails.date}
                    onChange={(e) =>
                      update((n) => {
                        n.revisionDetails.date = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Revision Notes">
                  <textarea
                    value={q.revisionDetails.notes}
                    onChange={(e) =>
                      update((n) => {
                        n.revisionDetails.notes = e.target.value;
                      })
                    }
                  />
                </Field>
              </div>
            </section>
            <details className="panel">
              <summary>Introduction / Cover Content & Company Details</summary>
              <div className="form-grid">
                {Object.entries(q.introduction).map(([key, value]) => (
                  <Field
                    key={key}
                    label={
                      {
                        attention: "Dear / Attention line",
                        opening: "Opening paragraph",
                        proposal: "Project costing proposal paragraph",
                        quality: "Quality / safety / professionalism paragraph",
                        clarification: "Clarification paragraph",
                        closing: "Closing / thank-you text",
                        signature: "Company signature block",
                      }[key] || key
                    }
                  >
                    <textarea
                      rows={4}
                      value={value}
                      onChange={(e) =>
                        update((n) => {
                          n.introduction[
                            key as keyof Quotation["introduction"]
                          ] = e.target.value;
                        })
                      }
                    />
                  </Field>
                ))}
                {Object.entries(q.company).map(([key, value]) => (
                  <Field key={key} label={"Company " + key}>
                    <input
                      value={value}
                      onChange={(e) =>
                        update((n) => {
                          n.company[key as keyof Quotation["company"]] =
                            e.target.value;
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </details>
            <section className="panel boq-builder">
              <div className="between">
                <h2>Scope / BOQ Builder</h2>
                <button
                  className="primary"
                  onClick={() =>
                    update((n) => {
                      n.sections.push({
                        id: uid(),
                        number: String(n.sections.length + 1),
                        title: "New section",
                        rows: [],
                      });
                    })
                  }
                >
                  Add section
                </button>
              </div>
              <p className="muted">
                Item numbers are editable. Heading rows group sub-items without
                creating a charge.
              </p>
              {q.sections.map((s, si) => (
                <section
                  key={s.id}
                  className={
                    "quote-section" + (s.parentId ? " boq-subsection" : "")
                  }
                  data-testid="quote-section"
                >
                  <div className="boq-section-heading">
                    <span>
                      {s.parentId ? "Subsection" : "Section"} {s.number}
                    </span>
                    <strong className="boq-subtotal">
                      Section subtotal:{" "}
                      {safe(
                        () => formatMoney(sectionAmount(s), true),
                        "Check line values",
                      )}
                    </strong>
                  </div>
                  <div className="boq-section-header">
                    <div className="boq-section-fields">
                      <Field label="Section No.">
                        <input
                          value={s.number}
                          onChange={(e) =>
                            update((n) => {
                              n.sections[si].number = e.target.value;
                            })
                          }
                        />
                      </Field>
                      <Field label="Section description">
                        <input
                          value={s.title}
                          onChange={(e) =>
                            update((n) => {
                              n.sections[si].title = e.target.value;
                            })
                          }
                        />
                      </Field>
                      <Field label="Parent section">
                        <select
                          value={s.parentId || ""}
                          onChange={(e) =>
                            update((n) => {
                              n.sections[si].parentId =
                                e.target.value || undefined;
                            })
                          }
                        >
                          <option value="">Top level</option>
                          {q.sections.slice(0, si).map((parent) => (
                            <option key={parent.id} value={parent.id}>
                              {parent.number} {parent.title}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="boq-section-controls">
                      <Order
                        label={"section " + s.number}
                        index={si}
                        length={q.sections.length}
                        move={(d) =>
                          update((n) => {
                            n.sections = reorder(n.sections, si, d);
                          })
                        }
                      />
                      <details
                        className="boq-more"
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.currentTarget.open = false;
                            e.currentTarget.querySelector("summary")?.focus();
                          }
                        }}
                      >
                        <summary
                          aria-label={"More actions for section " + s.number}
                        >
                          •••
                        </summary>
                        <div
                          className="boq-more-options"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("button")) {
                              const details =
                                e.currentTarget.closest("details");
                              if (details) details.open = false;
                            }
                          }}
                        >
                          <button
                            onClick={() =>
                              update((n) => {
                                const copy = structuredClone(s);
                                copy.id = uid();
                                const ids = new Map(
                                  copy.rows.map((r) => [r.id, uid()]),
                                );
                                copy.rows = copy.rows.map((r) => ({
                                  ...r,
                                  id: ids.get(r.id)!,
                                  parentId: r.parentId
                                    ? ids.get(r.parentId)
                                    : undefined,
                                }));
                                n.sections.splice(si + 1, 0, copy);
                              })
                            }
                          >
                            Duplicate section
                          </button>
                          <button
                            onClick={() =>
                              update((n) => {
                                n.sections.splice(si, 1);
                                n.sections.forEach((x) => {
                                  if (x.parentId === s.id) delete x.parentId;
                                });
                              })
                            }
                          >
                            Delete section
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                  <div className="boq-section-toolbar">
                    <button
                      onClick={() =>
                        update((n) => {
                          n.sections.splice(si + 1, 0, {
                            id: uid(),
                            parentId: s.id,
                            number: s.number + ".1",
                            title: "New subsection",
                            rows: [],
                          });
                        })
                      }
                    >
                      <span aria-hidden="true">+ </span>Add subsection
                    </button>
                    <button
                      className="primary boq-add-main"
                      onClick={() =>
                        update((n) => {
                          n.sections[si].rows.push({
                            ...blankLine(
                              s.number.replace(/\.00$/, "") +
                                "." +
                                (s.rows.length + 1),
                            ),
                            pricingType: "Heading",
                            quantity: "",
                            rate: "",
                          });
                        })
                      }
                    >
                      <span aria-hidden="true">+ </span>Add main item
                    </button>
                    <button
                      onClick={() =>
                        update((n) => {
                          n.sections[si].rows.push(
                            blankLine(
                              s.number.replace(/\.00$/, "") +
                                "." +
                                (s.rows.length + 1),
                            ),
                          );
                        })
                      }
                    >
                      <span aria-hidden="true">+ </span>Add line
                    </button>
                  </div>
                  {s.rows.map((r, ri) => {
                    const edit = <K extends keyof QuotationLineItem>(
                      key: K,
                      value: QuotationLineItem[K],
                    ) =>
                      update((n) => {
                        const row = n.sections[si].rows[ri];
                        row[key] = value;
                        if (key === "quantity" || key === "rate") {
                          delete row.amountOverride;
                          delete row.overrideReason;
                        }
                      });
                    return (
                      <article
                        className={
                          "quote-line " +
                          (r.pricingType === "Heading" ? "heading-line" : "")
                        }
                        key={r.id}
                        data-testid="quote-line"
                      >
                        <div className="quote-line-fields">
                          <Field label="Item No.">
                            <input
                              value={r.number}
                              onChange={(e) => edit("number", e.target.value)}
                            />
                          </Field>
                          <Field label="Description">
                            <textarea
                              rows={Math.min(
                                6,
                                Math.max(2, r.description.split("\n").length),
                              )}
                              value={r.description}
                              onChange={(e) =>
                                edit("description", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Quantity">
                            <input
                              inputMode="decimal"
                              value={r.quantity}
                              onChange={(e) => edit("quantity", e.target.value)}
                              disabled={["Heading", "Included"].includes(
                                r.pricingType,
                              )}
                            />
                          </Field>
                          <Field label="Unit">
                            <input
                              list="quotation-units"
                              value={r.unit}
                              onChange={(e) => edit("unit", e.target.value)}
                              disabled={["Heading", "Included"].includes(
                                r.pricingType,
                              )}
                            />
                          </Field>
                          <Field label="Rate / Unit">
                            <input
                              inputMode="decimal"
                              value={r.rate}
                              onChange={(e) => edit("rate", e.target.value)}
                              disabled={r.pricingType !== "Normal Rate"}
                            />
                          </Field>
                          <Field label="Pricing Type">
                            <select
                              value={r.pricingType}
                              onChange={(e) =>
                                edit(
                                  "pricingType",
                                  e.target
                                    .value as QuotationLineItem["pricingType"],
                                )
                              }
                            >
                              {pricingTypes.map((p) => (
                                <option key={p}>{p}</option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <div className="between">
                          <output aria-label="Line amount">
                            {safe(
                              () => displayAmount(r),
                              "Check quantity / rate",
                            )}
                          </output>
                          <div className="actions">
                            <Order
                              label={"row " + r.number}
                              index={ri}
                              length={s.rows.length}
                              move={(d) =>
                                update((n) => {
                                  n.sections[si].rows = reorder(
                                    n.sections[si].rows,
                                    ri,
                                    d,
                                  );
                                })
                              }
                            />
                            <button
                              onClick={() =>
                                update((n) => {
                                  n.sections[si].rows.splice(
                                    ri + 1,
                                    0,
                                    blankLine(r.number + ".1", r.id),
                                  );
                                })
                              }
                            >
                              Add sub-line
                            </button>
                            <button
                              onClick={() =>
                                update((n) => {
                                  n.sections[si].rows.splice(ri + 1, 0, {
                                    ...structuredClone(r),
                                    id: uid(),
                                  });
                                })
                              }
                            >
                              Duplicate row
                            </button>
                            <button
                              onClick={() =>
                                update((n) => {
                                  n.sections[si].rows.splice(ri, 1);
                                  n.sections[si].rows.forEach((x) => {
                                    if (x.parentId === r.id) delete x.parentId;
                                  });
                                })
                              }
                            >
                              Delete row
                            </button>
                          </div>
                        </div>
                        <details>
                          <summary>Area, notes & document layout</summary>
                          <div className="form-grid">
                            <Field label="Location / Area">
                              <input
                                value={r.location}
                                onChange={(e) =>
                                  edit("location", e.target.value)
                                }
                              />
                            </Field>
                            <Field label="Notes">
                              <textarea
                                value={r.notes}
                                onChange={(e) => edit("notes", e.target.value)}
                              />
                            </Field>
                            <Field label="Parent item">
                              <select
                                value={r.parentId || ""}
                                onChange={(e) =>
                                  edit("parentId", e.target.value || undefined)
                                }
                              >
                                <option value="">No parent</option>
                                {s.rows.slice(0, ri).map((parent) => (
                                  <option key={parent.id} value={parent.id}>
                                    {parent.number}{" "}
                                    {parent.description.slice(0, 40)}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Start on a new document page">
                              <input
                                type="checkbox"
                                checked={!!r.pageBreakBefore}
                                onChange={(e) =>
                                  edit("pageBreakBefore", e.target.checked)
                                }
                              />
                            </Field>
                            {r.pricingType === "Normal Rate" && (
                              <>
                                <Field label="Source amount override (optional)">
                                  <input
                                    inputMode="decimal"
                                    value={r.amountOverride || ""}
                                    onChange={(e) =>
                                      edit(
                                        "amountOverride",
                                        e.target.value || undefined,
                                      )
                                    }
                                  />
                                </Field>
                                <Field label="Override reason">
                                  <textarea
                                    value={r.overrideReason || ""}
                                    onChange={(e) =>
                                      edit("overrideReason", e.target.value)
                                    }
                                  />
                                </Field>
                              </>
                            )}
                          </div>
                        </details>
                        {r.amountOverride && (
                          <p className="muted">
                            Source amount override: AED {r.amountOverride}.{" "}
                            {r.overrideReason} Changing quantity or rate clears
                            it.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </section>
              ))}
              <datalist id="quotation-units">
                {["LS", "M2", "RM", "Nos"].map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </section>
            <section className="panel">
              <h2>Commercial Terms</h2>
              <div className="form-grid">
                <Field label="VAT enabled">
                  <input
                    type="checkbox"
                    checked={q.vatEnabled}
                    onChange={(e) =>
                      update((n) => {
                        n.vatEnabled = e.target.checked;
                      })
                    }
                  />
                </Field>
                <Field label="VAT percentage">
                  <input
                    inputMode="decimal"
                    value={q.vatPercentage}
                    onChange={(e) =>
                      update((n) => {
                        n.vatPercentage = e.target.value;
                      })
                    }
                  />
                </Field>
                <Field label="Amount in Words — manual override">
                  <textarea
                    value={q.amountWordsOverride}
                    placeholder={t ? amountInWords(t.grand) : ""}
                    onChange={(e) =>
                      update((n) => {
                        n.amountWordsOverride = e.target.value;
                      })
                    }
                  />
                </Field>
              </div>
              <p>
                {q.amountWordsOverride ||
                  (t ? amountInWords(t.grand) : "Check financial values")}
              </p>
              <h3>Summary of Cost</h3>
              {q.sections.map((s) => (
                <div className="between" key={s.id}>
                  <span>
                    {s.number.replace(/\.00$/, "")} · {s.title}
                  </span>
                  <strong>
                    {safe(
                      () => formatMoney(sectionAmount(s), true),
                      "Check values",
                    )}
                  </strong>
                </div>
              ))}
              <div className="quote-totals">
                {t &&
                  [
                    ["Subtotal", t.subtotal],
                    ["VAT", t.vat],
                    ["Grand Total", t.grand],
                  ].map(([label, value]) => (
                    <div className="between" key={String(label)}>
                      <span>{String(label)}</span>
                      <strong
                        data-testid={
                          label === "Grand Total" ? "grand-total" : undefined
                        }
                      >
                        {formatMoney(value as bigint, true)}
                      </strong>
                    </div>
                  ))}
              </div>
              <h3>Payment Terms & Condition</h3>
              {t &&
                safe(
                  () =>
                    q.payments.reduce(
                      (sum, p) => sum + paymentAmount(p, t.grand),
                      0n,
                    ) !== t.grand,
                  false,
                ) && (
                  <p className="muted">
                    Payment amounts differ from the Grand Total because of
                    rounding or manual overrides. The reference schedule is
                    preserved as supplied.
                  </p>
                )}

              {safe(() => paymentPercentage(q) === 100000000n, false) ? null : (
                <p role="alert" className="error">
                  Payment percentages must total 100%.
                </p>
              )}
              {q.payments.map((p, i) => (
                <div className="quote-line" key={p.id}>
                  <div className="form-grid">
                    <Field label="Term number">
                      <input
                        value={p.number}
                        onChange={(e) =>
                          update((n) => {
                            n.payments[i].number = e.target.value;
                          })
                        }
                      />
                    </Field>
                    <Field label="Payment description">
                      <textarea
                        value={p.description}
                        onChange={(e) =>
                          update((n) => {
                            n.payments[i].description = e.target.value;
                          })
                        }
                      />
                    </Field>
                    <Field label="Payment percentage">
                      <input
                        inputMode="decimal"
                        value={p.percentage}
                        onChange={(e) =>
                          update((n) => {
                            n.payments[i].percentage = e.target.value;
                            delete n.payments[i].amountOverride;
                          })
                        }
                      />
                    </Field>
                    <Field label="Payment amount override">
                      <input
                        inputMode="decimal"
                        value={p.amountOverride || ""}
                        onChange={(e) =>
                          update((n) => {
                            n.payments[i].amountOverride =
                              e.target.value || undefined;
                          })
                        }
                      />
                    </Field>
                    <Field label="Due condition / Notes">
                      <textarea
                        value={p.notes}
                        onChange={(e) =>
                          update((n) => {
                            n.payments[i].notes = e.target.value;
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="between">
                    <strong>
                      {t
                        ? safe(
                            () => formatMoney(paymentAmount(p, t.grand), true),
                            "Check percentage",
                          )
                        : "Check values"}
                    </strong>
                    <div className="actions">
                      <Order
                        label={"payment " + p.number}
                        index={i}
                        length={q.payments.length}
                        move={(d) =>
                          update((n) => {
                            n.payments = reorder(n.payments, i, d);
                          })
                        }
                      />
                      <button
                        onClick={() =>
                          update((n) => {
                            n.payments.splice(i, 1);
                          })
                        }
                      >
                        Delete payment term
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  update((n) => {
                    n.payments.push({
                      id: uid(),
                      number: String(n.payments.length + 1),
                      description: "",
                      percentage: "0",
                      notes: "",
                    });
                  })
                }
              >
                Add payment term
              </button>
            </section>
            <section className="panel">
              <div className="between">
                <h2>Terms & Conditions</h2>
                <button
                  onClick={() =>
                    confirm("Replace terms with the default template?", () =>
                      update((n) => {
                        n.terms = defaultTerms();
                      }),
                    )
                  }
                >
                  Default template
                </button>
              </div>
              {q.terms.map((term, i) => (
                <div key={term.id} className="quote-line">
                  <div className="form-grid">
                    <Field label="Term No.">
                      <input
                        value={term.number}
                        onChange={(e) =>
                          update((n) => {
                            n.terms[i].number = e.target.value;
                          })
                        }
                      />
                    </Field>
                    <Field label="Term text">
                      <textarea
                        rows={Math.min(
                          8,
                          Math.max(2, Math.ceil(term.text.length / 90)),
                        )}
                        value={term.text}
                        onChange={(e) =>
                          update((n) => {
                            n.terms[i].text = e.target.value;
                          })
                        }
                      />
                    </Field>
                    <Field label="Start term on new page">
                      <input
                        type="checkbox"
                        checked={!!term.pageBreakBefore}
                        onChange={(e) =>
                          update((n) => {
                            n.terms[i].pageBreakBefore = e.target.checked;
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="actions">
                    <Order
                      label={"term " + term.number}
                      index={i}
                      length={q.terms.length}
                      move={(d) =>
                        update((n) => {
                          n.terms = reorder(n.terms, i, d);
                        })
                      }
                    />
                    <button
                      onClick={() =>
                        update((n) => {
                          n.terms.splice(i, 1);
                        })
                      }
                    >
                      Delete term
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  update((n) => {
                    n.terms.push({
                      id: uid(),
                      number: String(n.terms.length + 1),
                      text: "",
                    });
                  })
                }
              >
                Add term
              </button>
            </section>
          </fieldset>
          {errors.length > 0 && (
            <details className="panel">
              <summary>
                Before finalizing: {errors.length} validation issue(s)
              </summary>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      <details className="panel">
        <summary>Quotation History & Revisions</summary>
        <div className="stack">
          {db.quotations
            .filter((x) => x.familyId === q.familyId)
            .sort((a, b) => a.revision - b.revision)
            .map((x) => (
              <a key={x.id} href={"#/quotations/" + x.id + "/edit"}>
                {x.number} Rev {x.revision} · {x.status} ·{" "}
                {x.revisionDetails.date} · {x.revisionDetails.notes}
              </a>
            ))}
          {q.history.map((h, i) => (
            <p key={i}>
              {h.action} ·{" "}
              {new Date(h.date).toLocaleString("en-GB", {
                timeZone: "Asia/Dubai",
              })}
              <br />
              {h.notes}
              {h.snapshot && (
                <button
                  onClick={() =>
                    void download(JSON.parse(h.snapshot!) as Quotation)
                  }
                >
                  Download issued snapshot PDF
                </button>
              )}
            </p>
          ))}
        </div>
      </details>
      {confirmations}
    </div>
  );
}
