import type { Database } from "../domain/model";
import type { Quotation, QuotationLineItem, QuotationStatus } from "./model";
import { quotationStatuses, pricingTypes } from "./model";
import { blankQuotation, referenceQuotation } from "./seed";
import {
  decimal,
  totals,
  paymentPercentage,
  paymentAmount,
} from "./calculations";
import { today, uid } from "../domain/logic";
export function initializeQuotations(db: Database, seedReference = false) {
  if (db.quotations && !seedReference) return;
  db.quotations = [referenceQuotation()];
  db.quotationNumbering = { prefix: "QTN-AF-", next: 26050 };
  const client = db.clients.find((c) => c.name === "Mr. Roshan Lanesol");
  const clientId = client?.id || "client-roshan";
  if (!client)
    db.clients.push({
      id: clientId,
      name: "Mr. Roshan Lanesol",
      contact: "Mr. Roshan Lanesol",
    });
  db.quotations[0].customerId = clientId;
  const existing = db.projects.find(
    (p) => p.clientId === clientId && p.unit === "M801",
  );
  if (!existing) {
    db.projects.push({
      id: "project-m801",
      code: "AZ-M801",
      name: "Apartment Renovation",
      clientId,
      location: "M801 Apartment, Business bay, Dubai, UAE",
      emirate: "Dubai",
      building: "Executive tower",
      unit: "M801",
      area: 198,
      scope: "Apartment Renovation",
      disciplines: ["Civil", "MEP"],
      type: "Apartment",
      value: 210336.79,
      start: "2026-09-30",
      due: "2026-10-30",
      managerId: "person-0",
      priority: "Normal",
      status: "Draft",
    });
    db.phases.push({
      id: "phase-m801",
      projectId: "project-m801",
      name: "Planning",
      order: 0,
      weight: 100,
    });
  }
  db.quotations[0].projectId = existing?.id || "project-m801";
}
export function newQuotation(db: Database): Quotation {
  const { prefix, next } = db.quotationNumbering;
  let n = next;
  while (db.quotations.some((q) => q.number === prefix + n)) n++;
  const q = blankQuotation(prefix + n);
  db.quotationNumbering.next = n + 1;
  db.quotations.push(q);
  return q;
}
export function blankLine(
  number = "1.1",
  parentId?: string,
): QuotationLineItem {
  return {
    id: uid(),
    parentId,
    number,
    description: "",
    location: "",
    quantity: "1",
    unit: "LS",
    rate: "0",
    pricingType: "Normal Rate",
    notes: "",
  };
}
export function validationErrors(q: Quotation): string[] {
  const errors: string[] = [];
  for (const [label, value] of [
    ["Customer", q.customer.name],
    ["Quotation number", q.number],
    ["Job", q.project.name],
    ["Location", q.project.location],
  ])
    if (!value.trim()) errors.push(label + " is required.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(q.date) ||
    !Number.isFinite(Date.parse(q.date)) ||
    new Date(q.date).toISOString().slice(0, 10) !== q.date
  )
    errors.push("A valid date is required.");
  if (!quotationStatuses.includes(q.status))
    errors.push("Invalid quotation status.");
  try {
    const v = decimal(q.vatPercentage);
    if (v.n > 100n * v.d) errors.push("VAT must be between 0 and 100%.");
  } catch {
    errors.push("VAT must be a non-negative decimal.");
  }
  if (!q.sections.length) errors.push("Add at least one scope section.");
  for (const s of q.sections) {
    if (!s.title.trim()) errors.push("Section description is required.");
    if (!s.rows.length) errors.push("Each section needs at least one item.");
    for (const r of s.rows) {
      if (!r.description.trim())
        errors.push("Item " + r.number + ": description is required.");
      if (!pricingTypes.includes(r.pricingType))
        errors.push("Unsupported pricing type.");
      try {
        if (r.pricingType === "Normal Rate") {
          decimal(r.quantity);
          decimal(r.rate);
          if (!r.unit.trim())
            errors.push("Item " + r.number + ": unit is required.");
        } else if (r.quantity) decimal(r.quantity);
        if (r.amountOverride) {
          decimal(r.amountOverride);
          if (!r.overrideReason?.trim())
            errors.push(
              "Item " + r.number + ": amount override requires a reason.",
            );
        }
      } catch {
        errors.push(
          "Item " +
            r.number +
            ": quantity, rate and amount must be non-negative decimals.",
        );
      }
    }
  }
  try {
    const t = totals(q);
    for (const p of q.payments) {
      const v = decimal(p.percentage);
      if (v.n > 100n * v.d)
        errors.push("Payment percentage must be between 0 and 100%.");
      paymentAmount(p, t.grand);
      if (!p.description.trim())
        errors.push("Payment description is required.");
    }
    if (paymentPercentage(q) !== 100000000n)
      errors.push("Payment percentages must total 100%.");
  } catch {
    errors.push("Check payment percentages and financial values.");
  }
  if (q.terms.some((t) => !t.text.trim()))
    errors.push("Terms cannot be empty.");
  return [...new Set(errors)];
}
export function saveQuotation(db: Database, q: Quotation, validate = false) {
  const old = db.quotations.find((x) => x.id === q.id);
  if (old && old.status !== "Draft")
    throw Error(
      "Issued revisions are immutable. Create a revision or return to draft with a reason.",
    );
  if (q.status !== "Draft")
    throw Error("Use the controlled finalization action.");
  if (
    db.quotations.some(
      (x) =>
        x.id !== q.id && x.number === q.number && x.revision === q.revision,
    )
  )
    throw Error("Quotation number and revision must be unique.");
  if (q.customerId && !db.clients.some((c) => c.id === q.customerId))
    throw Error("Linked customer does not exist.");
  if (q.projectId && !db.projects.some((p) => p.id === q.projectId))
    throw Error("Linked project does not exist.");
  if (validate) {
    const errors = validationErrors(q);
    if (errors.length) throw Error(errors.join(" "));
  }
  const next = structuredClone(q);
  next.updatedAt = new Date().toISOString();
  db.quotations = old
    ? db.quotations.map((x) => (x.id === q.id ? next : x))
    : [...db.quotations, next];
}
export function changeQuotationStatus(
  db: Database,
  id: string,
  status: QuotationStatus,
  notes = "",
) {
  const q = db.quotations.find((x) => x.id === id);
  if (!q) throw Error("Quotation not found.");
  if (!quotationStatuses.includes(status)) throw Error("Invalid status.");
  if (status === q.status) return;
  if (status === "Draft" && !notes.trim())
    throw Error("Enter a reason to return this quotation to draft.");
  if (status !== "Draft") {
    const errors = validationErrors(q);
    if (errors.length) throw Error(errors.join(" "));
  }
  if (q.status === "Draft" && status !== "Finalized")
    throw Error("Finalize the draft before recording delivery status.");
  q.history.push({
    date: new Date().toISOString(),
    action: q.status + " → " + status,
    notes,
    snapshot:
      status === "Draft" ? JSON.stringify({ ...q, history: [] }) : undefined,
  });
  q.status = status;
  q.updatedAt = new Date().toISOString();
  if (status === "Finalized") q.finalizedAt = q.updatedAt;
}
export function copyQuotation(
  db: Database,
  id: string,
  revision = false,
  notes = "",
) {
  const source = db.quotations.find((q) => q.id === id);
  if (!source) throw Error("Quotation not found.");
  const q = structuredClone(source);
  q.id = uid();
  q.status = "Draft";
  delete q.finalizedAt;
  q.createdAt = q.updatedAt = new Date().toISOString();
  q.date = today();
  if (revision) {
    q.revision =
      Math.max(
        ...db.quotations
          .filter((x) => x.familyId === source.familyId)
          .map((x) => x.revision),
      ) + 1;
    q.revisionDetails = { date: today(), notes, sourceId: source.id };
  } else {
    const allocated = newQuotation(db);
    db.quotations = db.quotations.filter((x) => x.id !== allocated.id);
    q.number = allocated.number;
    q.familyId = q.id;
    q.revision = 0;
    q.revisionDetails = {
      date: today(),
      notes: "Duplicated from " + source.number,
      sourceId: source.id,
    };
  }
  q.history = [
    {
      date: q.createdAt,
      action: revision ? "Revision created" : "Duplicated",
      notes: source.number + " Rev " + source.revision + " " + notes,
    },
  ];
  db.quotations.push(q);
  return q;
}
export function deleteDraft(db: Database, id: string) {
  const q = db.quotations.find((x) => x.id === id);
  if (
    !q ||
    q.status !== "Draft" ||
    q.finalizedAt ||
    db.quotations.some((x) => x.revisionDetails.sourceId === id)
  )
    throw Error(
      "Only unissued drafts without dependent revisions can be deleted.",
    );
  db.quotations = db.quotations.filter((x) => x.id !== id);
}
export function reorder<T>(items: T[], index: number, direction: number): T[] {
  const result = [...items],
    target = index + direction;
  if (target < 0 || target >= items.length) return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
