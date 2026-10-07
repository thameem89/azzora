import { describe, it, expect, vi } from "vitest";
import { seed } from "../domain/seed";
import { localRepository } from "../domain/repository";
import { blankQuotation, referenceQuotation, defaultTermTexts } from "./seed";
import {
  blankLine,
  saveQuotation,
  copyQuotation,
  changeQuotationStatus,
  deleteDraft,
  initializeQuotations,
  validationErrors,
  newQuotation,
} from "./repository";
import {
  lineAmount,
  sectionAmount,
  totals,
  paymentAmount,
  paymentPercentage,
  amountInWords,
  displayAmount,
} from "./calculations";
import { layoutQuotation } from "./document";
describe("quotation financial and lifecycle rules", () => {
  it("multiplies rates using decimal-safe rounding", () => {
    const r = { ...blankLine(), quantity: "0.1", rate: "0.2" };
    expect(lineAmount(r)).toBe(2n);
    expect(lineAmount({ ...r, quantity: "6.125", rate: "90" })).toBe(55125n);
    expect(lineAmount({ ...r, quantity: "1.005", rate: "1" })).toBe(101n);
  });
  it.each(["FOC", "By Client", "Excluded"] as const)(
    "%s preserves text pricing without numeric rates",
    (pricingType) => {
      const r = { ...blankLine(), pricingType, rate: "" };
      expect(lineAmount(r)).toBe(0n);
      expect(displayAmount(r)).toBe(pricingType);
    },
  );
  it("calculates every reference section and the exact totals", () => {
    const q = referenceQuotation();
    expect(q.sections.map((s) => sectionAmount(s))).toEqual([
      1610000n,
      2152825n,
      1158000n,
      1437000n,
      453050n,
      1445400n,
      3252000n,
      125000n,
      3063800n,
      1750000n,
      1450000n,
      1730000n,
      405000n,
    ]);
    expect(totals(q)).toEqual({
      subtotal: 20032075n,
      vat: 1001604n,
      grand: 21033679n,
    });
    expect(q.sections.flatMap((s) => s.rows)).toHaveLength(110);
  });
  it("documents source inconsistencies without hardcoding totals", () => {
    const q = referenceQuotation();
    const r = q.sections[1].rows.find((r) => r.number === "3.1.2")!;
    expect(r.quantity).toBe("6.1");
    expect(r.overrideReason).toContain("Source PDF");
    delete r.amountOverride;
    expect(totals(q).subtotal).toBe(20031850n);
  });
  it("calculates editable VAT and disabled VAT", () => {
    const q = referenceQuotation();
    q.vatPercentage = "7.5";
    expect(totals(q).vat).toBe(1502406n);
    q.vatEnabled = false;
    expect(totals(q).grand).toBe(20032075n);
  });
  it("calculates milestones with explicit source rounding override", () => {
    const q = referenceQuotation(),
      grand = totals(q).grand;
    expect(q.payments.map((p) => paymentAmount(p, grand))).toEqual([
      10516839n,
      9465155n,
      1051684n,
    ]);
    delete q.payments[0].amountOverride;
    expect(paymentAmount(q.payments[0], grand)).toBe(10516840n);
    expect(paymentPercentage(q)).toBe(100000000n);
    q.payments[0].percentage = "49.999999";
    expect(paymentPercentage(q)).not.toBe(100000000n);
  });
  it("preserves historical words and generates new words including fils", () => {
    expect(referenceQuotation().amountWordsOverride).toContain(
      "Seventy Eight Fills",
    );
    expect(amountInWords(21033679n)).toBe(
      "Two Hundred Ten Thousand Three Hundred Thirty Six Dirhams and Seventy Nine Fils",
    );
  });
  it("rejects invalid negatives, percentages and required data", () => {
    const q = blankQuotation("");
    q.vatPercentage = "-1";
    q.payments[0].percentage = "101";
    q.sections = [
      {
        id: "s",
        number: "1",
        title: "",
        rows: [{ ...blankLine(), quantity: "-1", rate: "-1" }],
      },
    ];
    expect(validationErrors(q).join(" ")).toMatch(
      /Customer.*Quotation number.*Job.*Location/,
    );
    expect(validationErrors(q).join(" ")).toContain("non-negative");
  });
  it("allows non-priced states without rate validation", () => {
    const q = referenceQuotation();
    q.sections[0].rows[0].rate = "";
    expect(validationErrors(q)).toEqual([]);
  });
  it("validates payment total on finalization", () => {
    const db = seed();
    db.quotations[0].payments[0].percentage = "20";
    expect(() =>
      changeQuotationStatus(db, db.quotations[0].id, "Finalized"),
    ).toThrow("100%");
  });
  it("edits and persists BOQ and terms through the existing repository", () => {
    const db = seed(),
      q = structuredClone(db.quotations[0]);
    q.sections[0].rows[3].rate = "1200";
    q.terms[0].text = "Stored term";
    saveQuotation(db, q);
    const memory = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memory.get(k) || null,
      setItem: (k: string, v: string) => memory.set(k, v),
    });
    localRepository.save(db);
    const loaded = localRepository.load();
    expect(loaded.quotations[0].terms[0].text).toBe("Stored term");
    expect(totals(loaded.quotations[0]).subtotal).toBe(20042075n);
    vi.unstubAllGlobals();
  });
  it("migrates older demo data once without replacing projects", () => {
    const db = seed();
    const original = db.projects.map((p) => p.id);
    delete (db as Partial<typeof db>).quotations;
    initializeQuotations(db);
    initializeQuotations(db);
    expect(db.quotations).toHaveLength(1);
    expect(db.projects.map((p) => p.id)).toEqual(original);
  });
  it("duplicates with distinct number, IDs and independent data", () => {
    const db = seed(),
      source = db.quotations[0],
      copy = copyQuotation(db, source.id);
    expect(copy.number).not.toBe(source.number);
    expect(copy.familyId).not.toBe(source.familyId);
    copy.sections[0].rows[0].description = "Changed";
    expect(source.sections[0].rows[0].description).not.toBe("Changed");
    expect(copy.status).toBe("Draft");
  });
  it("creates monotonic revisions preserving finalized originals", () => {
    const db = seed(),
      source = db.quotations[0];
    changeQuotationStatus(db, source.id, "Finalized");
    const original = JSON.stringify(source);
    const a = copyQuotation(db, source.id, true, "Scope change");
    const b = copyQuotation(db, source.id, true);
    expect(a.revision).toBe(1);
    expect(b.revision).toBe(2);
    expect(a.number).toBe(source.number);
    expect(a.revisionDetails.notes).toBe("Scope change");
    expect(JSON.stringify(source)).toBe(original);
  });
  it("rejects changes to every issued status", () => {
    const db = seed(),
      q = db.quotations[0];
    changeQuotationStatus(db, q.id, "Finalized");
    for (const status of [
      "Finalized",
      "Sent",
      "Accepted",
      "Rejected",
      "Expired",
      "Revised",
    ] as const) {
      changeQuotationStatus(db, q.id, status);
      expect(() =>
        saveQuotation(db, { ...q, status: "Draft", number: "Tampered" }),
      ).toThrow("immutable");
    }
  });
  it("requires controlled return to draft and preserves issued snapshot", () => {
    const db = seed(),
      q = db.quotations[0];
    changeQuotationStatus(db, q.id, "Finalized");
    expect(() => changeQuotationStatus(db, q.id, "Draft")).toThrow("reason");
    changeQuotationStatus(db, q.id, "Draft", "Client correction");
    expect(q.history.at(-1)?.snapshot).toBeTruthy();
    expect(JSON.parse(q.history.at(-1)!.snapshot!).status).toBe("Finalized");
  });
  it("rejects deletion of issued or referenced drafts", () => {
    const db = seed(),
      q = db.quotations[0];
    copyQuotation(db, q.id, true);
    expect(() => deleteDraft(db, q.id)).toThrow();
    const copy = copyQuotation(db, q.id);
    deleteDraft(db, copy.id);
    expect(db.quotations.some((q) => q.id === copy.id)).toBe(false);
  });
  it("uses numbering settings while avoiding collisions", () => {
    const db = seed();
    db.quotationNumbering.next = 26049;
    expect(newQuotation(db).number).toBe("QTN-AF-26050");
  });
  it("keeps all source terms outside renderer code", () => {
    expect(referenceQuotation().terms.map((t) => t.text)).toEqual(
      defaultTermTexts,
    );
    expect(defaultTermTexts[10]).toContain("unforeseen circumstances");
  });
  it("renders seven reference pages with full company footer", () => {
    const pages = layoutQuotation(referenceQuotation());
    for (const p of pages)
      expect(
        p.commands.some(
          (c) => c.kind === "image" && c.src.endsWith("/logo.png"),
        ),
      ).toBe(true);
    expect(pages).toHaveLength(7);
    for (const p of pages)
      expect(
        p.commands.some(
          (c) => c.kind === "text" && c.text === "Email: info@azzora.ae",
        ),
      ).toBe(true);
  });
  it("paginates oversized item descriptions without clipping or empty pages", () => {
    const q = referenceQuotation();
    q.sections = [
      {
        id: "long",
        number: "1",
        title: "Long section",
        rows: [
          {
            ...blankLine(),
            description: Array.from(
              { length: 160 },
              (_, i) => "Long description line " + i,
            ).join("\n"),
            quantity: "1",
            rate: "10",
          },
        ],
      },
    ];
    q.terms = [];
    const pages = layoutQuotation(q);
    expect(pages.length).toBeGreaterThan(3);
    for (const p of pages) {
      const content = p.commands.filter(
        (c) => c.kind === "text" && !c.text.startsWith("Page ") && c.y < 728,
      );
      expect(content.length).toBeGreaterThan(0);
      for (const c of content)
        if (c.kind === "text") expect(c.y).toBeLessThanOrEqual(722);
    }
  });
});
