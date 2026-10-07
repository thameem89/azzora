import fonts from "./fonts.json";
import { jsPDF } from "jspdf";
import type { Quotation, QuotationLineItem } from "./model";
import {
  amountInWords,
  displayAmount,
  formatMoney,
  paymentAmount,
  sectionAmount,
  totals,
  cents,
} from "./calculations";
export type Draw =
  | {
      kind: "text";
      x: number;
      y: number;
      text: string;
      size: number;
      style: "normal" | "bold" | "italic";
      color: string;
      align: "left" | "center" | "right";
    }
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
      stroke: string;
    }
  | {
      kind: "line";
      x: number;
      y: number;
      x2: number;
      y2: number;
      color: string;
    }
  | {
      kind: "image";
      x: number;
      y: number;
      width: number;
      height: number;
      src: string;
    };
export interface DocumentPage {
  commands: Draw[];
}
function registerFonts(doc: jsPDF) {
  for (const style of ["bold", "italic"] as const) {
    doc.addFileToVFS("cera-" + style + ".ttf", fonts[style].data);
    doc.addFont("cera-" + style + ".ttf", "Cera", style);
  }
}
function fontFor(value: string, style: "normal" | "bold" | "italic") {
  return style !== "normal" &&
    [...value].every((c) => fonts[style].characters.includes(c) || c === "\n")
    ? "Cera"
    : "helvetica";
}
const measure = new jsPDF({ unit: "pt" });
registerFonts(measure);
const LEFT = 81,
  RIGHT = 531,
  WIDTH = 450,
  BOTTOM = 710;
export function layoutQuotation(q: Quotation): DocumentPage[] {
  const pages: DocumentPage[] = [];
  let page: DocumentPage;
  let y = 72;
  const text = (
    value: string,
    x: number,
    top: number,
    size = 8.2,
    style: "normal" | "bold" | "italic" = "italic",
    align: "left" | "center" | "right" = "left",
    color = "#000000",
  ) =>
    page.commands.push({
      kind: "text",
      x,
      y: top + size,
      text: value,
      size,
      style,
      align,
      color,
    });
  const rect = (
    x: number,
    top: number,
    width: number,
    height: number,
    fill = "#bfbfbf",
    stroke = "",
  ) =>
    page.commands.push({
      kind: "rect",
      x,
      y: top,
      width,
      height,
      fill,
      stroke,
    });
  const line = (
    x: number,
    top: number,
    x2: number,
    y2: number,
    color = "#aaaaaa",
  ) => page.commands.push({ kind: "line", x, y: top, x2, y2, color });
  const image = (
    src: string,
    x: number,
    top: number,
    width: number,
    height: number,
  ) => page.commands.push({ kind: "image", src, x, y: top, width, height });
  const wrap = (
    value: string,
    width: number,
    size = 8.2,
    style: "normal" | "bold" | "italic" = "italic",
  ): string[] => {
    measure.setFont(fontFor(value, style), style);
    measure.setFontSize(size);
    return value
      .split("\n")
      .flatMap(
        (part) => measure.splitTextToSize(part || " ", width) as string[],
      );
  };
  const newPage = (logo = true) => {
    page = { commands: [] };
    pages.push(page);
    y = 72;
    image("/assets/quotation/watermark.png", 162.6, 195.84, 317.4, 411.6);
    if (logo) image("/assets/quotation/logo.png", 81, 21.6, 153.84, 32.64);
  };
  const ensure = (height: number) => {
    if (y + height > BOTTOM && y > 105) {
      newPage();
      return true;
    }
    return false;
  };
  const paragraph = (
    value: string,
    size = 9.3,
    width = WIDTH,
    x = 83,
    spacing = 12.1,
  ) => {
    const lines = wrap(value, width, size);
    for (const value of lines) {
      ensure(spacing);
      text(value, x, y, size);
      y += spacing;
    }
  };
  const bar = (title: string, height = 14) => {
    ensure(height + 14);
    rect(LEFT, y, WIDTH, height, "#bfbfbf", "#000000");
    text(title, 306, y + 2, 9, "bold", "center", "#ffffff");
    y += height;
  };
  newPage(true);
  y = 70.7;
  rect(LEFT, y, WIDTH, 17, "#bfbfbf", "#000000");
  text("QUOTATION", 306, y + 2, 13, "bold", "center");
  y = 118;
  const customerLines = wrap("Client: " + q.customer.name, 218, 9, "bold");
  const infoHeight = Math.max(44, customerLines.length * 12 + 6);
  rect(LEFT, y, WIDTH, infoHeight, "#bfbfbf", "#000000");
  customerLines.forEach((s, i) => text(s, 83, y + 3 + i * 12, 9, "bold"));
  line(312, y, 312, y + infoHeight, "#ffffff");
  line(350, y, 350, y + infoHeight, "#ffffff");
  const date = new Date(q.date + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dubai",
  });
  [
    ["Q.No:", q.number + (q.revision ? " Rev " + q.revision : "")],
    ["Date:", date],
    ["Ref:", q.reference],
  ].forEach(([label, value], i) => {
    const top = y + (i * infoHeight) / 3;
    text(label, 332, top + 3, 8.2, "bold", "center");
    wrap(value, 177, 9).forEach((s, j) => text(s, 352, top + 3 + j * 10, 9));
    if (i < 2)
      line(312, top + infoHeight / 3, RIGHT, top + infoHeight / 3, "#ffffff");
  });
  y += infoHeight + 15;
  paragraph(q.introduction.attention);
  y += 17;
  paragraph(q.introduction.opening);
  y += 18;
  rect(LEFT, y, WIDTH, 14, "#bfbfbf", "#000000");
  text("SCOPE OF WORK", 306, y + 2, 9, "bold", "center");
  y += 14;
  for (const [label, value] of [
    ["JOB", q.project.name],
    ["LOCATION", q.project.location],
  ]) {
    const ls = wrap(value, 215, 9.3);
    const h = Math.max(14, ls.length * 12 + 4);
    rect(LEFT, y, WIDTH, h, "#bfbfbf", "#000000");
    line(312, y, 312, y + h, "#ffffff");
    text(label, 83, y + 2, 9, "bold");
    ls.forEach((s, i) => text(s, 314, y + 2 + i * 12, 9.3));
    y += h;
  }
  y += 28;
  paragraph(q.introduction.proposal);
  y += 14;
  paragraph(q.introduction.quality);
  y += 14;
  paragraph(q.introduction.clarification);
  y += 30;
  paragraph(q.introduction.closing);
  y += 17;
  const signature = q.introduction.signature.split("\n");
  signature.forEach((s, i) => {
    ensure(13);
    if (i === 0 && s.startsWith("AZZORA")) {
      text("AZZORA", 83, y, 8.8, "bold", "left", "#bc8b00");
      text(s.slice(6).trim(), 123, y, 8.8, "bold");
      y += 13;
    } else {
      paragraph(s, 9.3, WIDTH, 83, 12.1);
    }
  });
  newPage();
  const tableHeader = () => {
    rect(LEFT, y, WIDTH, 14);
    [
      ["Sl.No", 96],
      ["ITEM DESCRIPTION", 218],
      ["QTY", 333],
      ["UNIT", 369],
      ["RATE/UNIT", 416],
      ["AMOUNT", 511],
    ].forEach(([s, x]) =>
      text(String(s), Number(x), y + 3, 8, "bold", "center", "#ffffff"),
    );
    y += 14;
  };
  tableHeader();
  const rowLines = (r: QuotationLineItem) =>
    wrap(
      r.description + (r.location ? "\n" + r.location : ""),
      199,
      8.2,
      r.pricingType === "Heading" ? "bold" : "italic",
    );
  const rowHeight = (r: QuotationLineItem) =>
    Math.max((r.minHeight || 14.52) * 0.95, rowLines(r).length * 10.2 + 0.2);
  const sectionHeader = (number: string, title: string) => {
    const ls = wrap(title, 199, 8.2, "bold");
    const h = Math.max(10.6, ls.length * 10.2 + 0.2);
    rect(LEFT, y, WIDTH, h);
    text(number, 88, y + 2, 8.2, "bold", "left", "#ffffff");
    ls.forEach((s, i) =>
      text(s, 213, y + 2 + i * 10.2, 8.2, "bold", "center", "#ffffff"),
    );
    y += h + 2;
  };
  for (const section of q.sections) {
    if (section.rows[0]?.pageBreakBefore && y > 95)
      newPage(section.rows[0].pageLogo !== false);
    const first = section.rows[0],
      second = section.rows[1];
    const openingHeight =
      15 +
      (first ? rowHeight(first) : 0) +
      (first?.pricingType === "Heading" && second ? rowHeight(second) : 0);
    if (ensure(openingHeight)) tableHeader();
    sectionHeader(section.number, section.title);
    for (let i = 0; i < section.rows.length; i++) {
      const r = section.rows[i],
        ls = rowLines(r),
        h = rowHeight(r);
      if (i > 0 && r.pageBreakBefore && y > 95) newPage(r.pageLogo !== false);
      const keep =
        h +
        (r.pricingType === "Heading" && section.rows[i + 1]
          ? rowHeight(section.rows[i + 1])
          : 0) +
        (i === section.rows.length - 1 ? 18 : 0);
      if (ensure(keep)) {
        tableHeader();
        sectionHeader(section.number, section.title + " (continued)");
      }
      // Keep ordinary rows intact. Oversized descriptions continue in deliberate chunks.
      let offset = 0;
      while (offset < ls.length) {
        const availableLines = Math.max(
          1,
          Math.floor((BOTTOM - y - 12) / 10.2),
        );
        const count =
          h <= BOTTOM - y
            ? ls.length
            : Math.min(availableLines, ls.length - offset);
        const segment = ls.slice(offset, offset + count);
        const segmentHeight =
          offset === 0 && count === ls.length ? h : segment.length * 10.2 + 4;
        if (r.pricingType === "Heading")
          rect(LEFT, y, WIDTH, segmentHeight, "#f2f2f2");
        else if (section.number !== "1")
          for (const x of [320, 356, 443]) line(x, y, x, y + segmentHeight);
        text(
          r.number,
          96,
          y + 2,
          8.2,
          r.pricingType === "Heading" ? "bold" : "italic",
          "center",
        );
        segment.forEach((s, j) =>
          text(
            s,
            114.9,
            y + 2 + j * 10.2,
            8.2,
            r.pricingType === "Heading" ? "bold" : "italic",
          ),
        );
        if (
          offset === 0 &&
          r.pricingType !== "Heading" &&
          r.pricingType !== "Included"
        ) {
          const spanHeight =
            (r.priceSpanRows || 1) > 1
              ? section.rows
                  .slice(i + 1, i + (r.priceSpanRows || 1))
                  .reduce((sum, next) => sum + rowHeight(next), 0)
              : 0;
          const middle =
            section.number === "1"
              ? y + 2
              : y + Math.max(2, (segmentHeight + spanHeight - 10) / 2);
          text(r.quantity, 331, middle, 8.2, "italic", "center");
          text(r.unit, 369, middle, 8.2, "italic", "center");
          text(
            r.pricingType === "Normal Rate"
              ? formatMoney(cents(r.rate))
              : r.pricingType,
            440,
            middle,
            8.2,
            "italic",
            "right",
          );
          text(displayAmount(r), 526, middle, 8.2, "italic", "right");
        }
        y += segmentHeight;
        offset += count;
        if (offset < ls.length) {
          newPage();
          tableHeader();
          sectionHeader(section.number, section.title + " (continued)");
        }
      }
    }
    ensure(14);
    rect(LEFT, y, WIDTH, 13);
    text(
      "Sub total For  " + section.title,
      306,
      y + 2,
      8.4,
      "bold",
      "center",
      "#ffffff",
    );
    text(
      formatMoney(sectionAmount(section)),
      526,
      y + 2,
      8.4,
      "bold",
      "right",
      "#ffffff",
    );
    y += 16.3;
  }
  const t = totals(q);
  const totalBlock = (height = 22.6) => {
    ensure(height * 3);
    [
      ["SUB TOTAL (AED)", t.subtotal],
      ["TAX " + (q.vatEnabled ? q.vatPercentage : "0") + "% (AED)", t.vat],
      ["GRAND TOTAL (AED)", t.grand],
    ].forEach(([label, value]) => {
      rect(LEFT, y, WIDTH, height);
      line(LEFT, y, RIGHT, y, "#ffffff");
      line(445, y, 445, y + height, "#ffffff");
      text(
        String(label),
        443,
        y + (height - 9) / 2,
        9,
        "bold",
        "right",
        "#ffffff",
      );
      text(
        formatMoney(value as bigint),
        526,
        y + (height - 9) / 2,
        9,
        "bold",
        "right",
        "#ffffff",
      );
      y += height;
    });
  };
  y += 16;
  totalBlock();
  y += 22;
  const wordLines = wrap(
    q.amountWordsOverride || amountInWords(t.grand),
    WIDTH,
    9,
    "bold",
  );
  ensure(wordLines.length * 12 + 18);
  wordLines.forEach((s, i) => text(s, 306, y + i * 12, 9, "bold", "center"));
  y += wordLines.length * 12 + 18;
  bar("SUMMARY OF COST");
  rect(LEFT, y, WIDTH, 14, "#f2f2f2");
  text("SL #", 96, y + 2, 8.2, "bold", "center");
  text("ITEM DESCRIPTION", 281, y + 2, 8.2, "bold", "center");
  text("AMOUNT (AED)", 488, y + 2, 8.2, "bold", "center");
  y += 14;
  for (const s of q.sections) {
    const ls = wrap(s.title, 300, 9.3);
    const h = Math.max(14.52, ls.length * 11.2 + 3);
    ensure(h);
    text(s.number.replace(/\.00$/, ""), 96, y + 2, 9.3, "italic", "center");
    ls.forEach((v, i) =>
      text(v, 275, y + 2 + i * 11.2, 9.3, "italic", "center"),
    );
    text(formatMoney(sectionAmount(s)), 526, y + 2, 8.2, "italic", "right");
    y += h;
  }
  totalBlock(18.5);
  y += 14;
  bar("PAYMENT TERMS & CONDITION");
  for (const p of q.payments) {
    const ls = wrap(
      "Term " +
        p.number +
        " - " +
        p.description +
        (p.notes ? "\n" + p.notes : ""),
      273,
      8.2,
    );
    const h = Math.max(21.2, ls.length * 11.2 + 7);
    ensure(h);
    ls.forEach((v, i) => text(v, 83, y + 4 + i * 11.2));
    text(p.percentage + "%", 369, y + 4, 8.2, "italic", "center");
    text(
      formatMoney(paymentAmount(p, t.grand), true),
      526,
      y + 4,
      8.2,
      "italic",
      "right",
    );
    y += h;
    line(LEFT, y, RIGHT, y, "#000000");
  }
  y += 14;
  bar("TERMS & CONDITION");
  y += 14;
  for (const term of q.terms) {
    if (term.pageBreakBefore && y > 95) newPage();
    const ls = wrap(term.text, 412, 8.2);
    const h = Math.max(14.52, ls.length * 11.2 + 3);
    ensure(Math.min(h, BOTTOM - 72));
    text(term.number, 96, y + 2, 8.2, "italic", "center");
    for (const v of ls) {
      if (ensure(11.2))
        text(term.number + " (cont.)", 96, y + 2, 7, "italic", "center");
      text(v, 114.9, y + 2);
      y += 11.2;
    }
    y += Math.max(3, h - ls.length * 11.2);
  }
  pages.forEach((p, index) => {
    page = p;
    text("Page " + (index + 1), 81, 756.8, 11, "italic");
    const company = q.company.name;
    measure.setFont(fontFor(company, "bold"), "bold");
    measure.setFontSize(11);
    const w = measure.getTextWidth(company);
    if (company.startsWith("AZZORA")) {
      text("AZZORA", 560 - w, 728, 11, "bold", "left", "#bc8b00");
      text(company.slice(6).trim(), 560, 728, 11, "bold", "right");
    } else text(company, 560, 728, 11, "bold", "right");
    text("Email: " + q.company.email, 560, 742.9, 11, "italic", "right");
    text("Mob : " + q.company.phone, 560, 757.4, 11, "italic", "right");
  });
  return pages;
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function pageSvg(page: DocumentPage): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792" preserveAspectRatio="none" role="img" aria-label="Quotation page"><defs><style>@font-face{font-family:Cera;src:url(/assets/quotation/cera-bold.ttf);font-weight:700}@font-face{font-family:Cera;src:url(/assets/quotation/cera-italic.ttf);font-style:italic}</style></defs>' +
    page.commands
      .map((c) => {
        if (c.kind === "text")
          return `<text x="${c.x}" y="${c.y}" font-family="${fontFor(c.text, c.style) === "Cera" ? "Cera" : "Arial, sans-serif"}" font-size="${c.size}" font-weight="${c.style === "bold" ? "700" : "400"}" font-style="${c.style === "italic" ? "italic" : "normal"}" fill="${c.color}" text-anchor="${c.align === "right" ? "end" : c.align === "center" ? "middle" : "start"}">${escape(c.text)}</text>`;
        if (c.kind === "rect")
          return `<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" fill="${c.fill}" stroke="${c.stroke || "none"}" stroke-width=".6"/>`;
        if (c.kind === "line")
          return `<line x1="${c.x}" y1="${c.y}" x2="${c.x2}" y2="${c.y2}" stroke="${c.color}" stroke-width=".45"/>`;
        return `<image href="${c.src}" x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}"/>`;
      })
      .join("") +
    "</svg>"
  );
}
export async function generatePdf(q: Quotation): Promise<jsPDF> {
  const pages = layoutQuotation(q);
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  registerFonts(doc);
  const sx = doc.internal.pageSize.getWidth() / 612,
    sy = doc.internal.pageSize.getHeight() / 792;
  const assets: Record<string, Uint8Array> = {};
  for (const src of [
    "/assets/quotation/logo.png",
    "/assets/quotation/watermark.png",
  ]) {
    const r = await fetch(src);
    if (!r.ok) throw Error("Quotation stationery could not be loaded.");
    assets[src] = new Uint8Array(await r.arrayBuffer());
  }
  pages.forEach((page, index) => {
    if (index) doc.addPage();
    page.commands.forEach((c) => {
      if (c.kind === "image")
        doc.addImage(
          assets[c.src],
          "PNG",
          c.x * sx,
          c.y * sy,
          c.width * sx,
          c.height * sy,
          undefined,
          "FAST",
        );
      if (c.kind === "text") {
        doc.setFont(fontFor(c.text, c.style), c.style);
        doc.setFontSize(c.size * sy);
        doc.setTextColor(c.color);
        measure.setFont(fontFor(c.text, c.style), c.style);
        measure.setFontSize(c.size);
        const width = measure.getTextWidth(c.text);
        const left =
          c.x -
          (c.align === "right" ? width : c.align === "center" ? width / 2 : 0);
        doc.text(c.text, left * sx, c.y * sy, {
          align: "left",
          horizontalScale: sx / sy,
        });
      }
      if (c.kind === "rect") {
        doc.setFillColor(c.fill);
        doc.setLineWidth(0.6);
        if (c.stroke) doc.setDrawColor(c.stroke);
        doc.rect(
          c.x * sx,
          c.y * sy,
          c.width * sx,
          c.height * sy,
          c.stroke ? "FD" : "F",
        );
      }
      if (c.kind === "line") {
        doc.setDrawColor(c.color);
        doc.setLineWidth(0.45);
        doc.line(c.x * sx, c.y * sy, c.x2 * sx, c.y2 * sy);
      }
    });
  });
  doc.setProperties({
    title: q.number + (q.revision ? " Rev " + q.revision : ""),
    subject: q.project.name,
    author: q.company.name,
  });
  return doc;
}
export async function downloadPdf(q: Quotation) {
  (await generatePdf(q)).save(
    q.number + (q.revision ? " Rev " + q.revision : "") + ".pdf",
  );
}
export function printQuotation(q: Quotation) {
  const win = window.open("", "_blank");
  if (!win) throw Error("Allow the print window to open, then try again.");
  win.document.write(
    "<!doctype html><html><head><title>" +
      escape(q.number) +
      '</title><base href="' +
      escape(location.origin) +
      '/"><style>@page{size:A4;margin:0}body{margin:0}.sheet{width:210mm;height:297mm;break-after:page}.sheet:last-child{break-after:auto}svg{width:100%;height:100%}</style></head><body>' +
      layoutQuotation(q)
        .map((p) => '<div class="sheet">' + pageSvg(p) + "</div>")
        .join("") +
      "</body></html>",
  );
  win.document.close();
  win.onload = () => {
    void win.document.fonts.ready.then(() => {
      win.focus();
      win.print();
    });
  };
}
