import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const url = process.env.QUOTATION_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const failures = [],
  checks = [];
fs.mkdirSync("output/pdf", { recursive: true });
fs.mkdirSync("tmp/quotation-qa", { recursive: true });
try {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    await context.addInitScript(() => {
      window.print = () => {
        window.__printed = true;
      };
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => failures.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") failures.push(m.text());
    });
    await page.goto(url + "/#/quotations");
    await page
      .getByRole("heading", { name: "Quotations", exact: true })
      .waitFor();
    await page.getByLabel("Search quotations").fill("Roshan");
    await expect(page.locator(".quote-card")).toHaveCount(1);
    await page.getByLabel("Quotation status filter").selectOption("Finalized");
    await expect(page.locator(".quote-card")).toHaveCount(0);
    await page.getByLabel("Quotation status filter").selectOption("Draft");
    await expect(page.locator(".quote-card")).toHaveCount(1);
    await page
      .locator(".quote-card")
      .getByRole("button", { name: "Preview", exact: true })
      .click();
    await expect(page.locator(".quote-sheet")).toHaveCount(7);
    if (width === 1440) {
      const dl = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Download PDF", exact: true })
        .click();
      await (await dl).saveAs("output/pdf/QTN-AF-26049.pdf");
    }
    await page
      .getByRole("link", { name: "Quotation list", exact: true })
      .click();
    await page
      .getByRole("button", { name: "New quotation", exact: true })
      .click();
    const quoteId = await page.evaluate(() => location.hash.split("/")[2]);
    await page.getByLabel("Linked Project", exact()).selectOption("project-0");
    await page.getByLabel("Customer", exact()).fill("QA Quotation " + width);
    await page
      .getByLabel("Job / Project Name", exact())
      .fill("QA Renovation " + width);
    await page
      .getByLabel("Project Location", exact())
      .fill("Dubai test apartment");
    await page
      .getByRole("button", { name: "Add section", exact: true })
      .click();
    let section = page.getByTestId("quote-section").first();
    await section
      .getByLabel("Section description", exact())
      .fill("Civil works");
    await section
      .getByRole("button", { name: "Add main item", exact: true })
      .click();
    let rows = section.getByTestId("quote-line");
    await rows
      .nth(0)
      .getByLabel("Description", exact())
      .fill("Renovation scope");
    await section
      .getByRole("button", { name: "Add line", exact: true })
      .click();
    await rows
      .nth(1)
      .getByLabel("Description", exact())
      .fill("Tiling installation");
    await rows.nth(1).getByLabel("Quantity", exact()).fill("2.5");
    await rows.nth(1).getByLabel("Unit", exact()).fill("M2");
    await rows.nth(1).getByLabel("Rate / Unit", exact()).fill("90");
    await expect(page.getByTestId("grand-total")).toHaveText("AED 236.25");
    await rows
      .nth(1)
      .getByRole("button", { name: "Add sub-line", exact: true })
      .click();
    await rows
      .nth(2)
      .getByLabel("Description", exact())
      .fill("Complimentary cleanup");
    await rows.nth(2).getByLabel("Pricing Type", exact()).selectOption("FOC");
    await rows
      .nth(2)
      .getByRole("button", { name: "Duplicate row", exact: true })
      .click();
    await rows
      .nth(3)
      .getByLabel("Pricing Type", exact())
      .selectOption("By Client");
    await rows
      .nth(3)
      .getByRole("button", { name: "Duplicate row", exact: true })
      .click();
    await rows
      .nth(4)
      .getByLabel("Pricing Type", exact())
      .selectOption("Excluded");
    await rows
      .nth(4)
      .getByRole("button", { name: /Move row .* up/ })
      .click();
    await rows
      .nth(3)
      .getByRole("button", { name: /Move row .* down/ })
      .click();
    await rows
      .nth(4)
      .getByRole("button", { name: "Duplicate row", exact: true })
      .click();
    await rows
      .nth(5)
      .getByRole("button", { name: "Delete row", exact: true })
      .click();
    await section
      .getByRole("button", { name: "Duplicate section", exact: true })
      .click();
    await page
      .getByTestId("quote-section")
      .nth(1)
      .getByRole("button", { name: /Move section .* up/ })
      .click();
    await page
      .getByTestId("quote-section")
      .nth(0)
      .getByRole("button", { name: /Move section .* down/ })
      .click();
    await page
      .getByTestId("quote-section")
      .nth(1)
      .getByRole("button", { name: "Delete section", exact: true })
      .click();
    await section
      .getByRole("button", { name: "Add subsection", exact: true })
      .click();
    await page
      .getByTestId("quote-section")
      .nth(1)
      .getByRole("button", { name: "Delete section", exact: true })
      .click();
    await page.getByLabel("VAT percentage", exact()).fill("10");
    await expect(page.getByTestId("grand-total")).toHaveText("AED 247.50");
    await page.getByLabel("VAT percentage", exact()).fill("5");
    await page
      .getByRole("button", { name: "Add payment term", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Delete payment term", exact: true })
      .last()
      .click();
    await page.getByLabel("Payment percentage", exact()).first().fill("40");
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Payment percentages must total 100%." }),
    ).toBeVisible();
    await page.getByLabel("Payment percentage", exact()).first().fill("50");
    await page
      .getByLabel("Term text", exact())
      .first()
      .fill("QA preserved commercial condition");
    await page
      .getByRole("button", { name: "Move term 1 down", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Move term 1 up", exact: true })
      .click();
    await page.getByRole("button", { name: "Add term", exact: true }).click();
    await page
      .getByLabel("Term text", exact())
      .last()
      .fill("QA additional condition");
    await page
      .getByRole("button", { name: "Delete term", exact: true })
      .last()
      .click();
    await page.getByRole("button", { name: "Save Draft", exact: true }).click();
    await page.reload();
    await expect(page.getByLabel("Customer", exact())).toHaveValue(
      "QA Quotation " + width,
    );
    await expect(page.getByTestId("quote-line")).toHaveCount(5);
    await expect(page.getByLabel("Term text", exact()).first()).toHaveValue(
      "QA preserved commercial condition",
    );
    await expect(page.getByTestId("grand-total")).toHaveText("AED 236.25");
    await page.screenshot({ path: `tmp/quotation-qa/editor-${width}.png` });
    await page.getByTestId("quote-line").nth(1).scrollIntoViewIfNeeded();
    await page
      .getByTestId("quote-line")
      .nth(1)
      .screenshot({ path: `tmp/quotation-qa/boq-${width}.png` });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Editor overflow " + width);
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(page.locator(".quote-sheet").first()).toBeVisible();
    const expectedPages = await page.locator(".quote-sheet").count();
    expect(expectedPages).toBeGreaterThanOrEqual(2);
    const pdf = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download PDF", exact: true })
      .click();
    const downloaded = await pdf;
    await downloaded.saveAs(`tmp/quotation-qa/workflow-${width}.pdf`);
    if (
      !fs
        .readFileSync(`tmp/quotation-qa/workflow-${width}.pdf`)
        .subarray(0, 4)
        .equals(Buffer.from("%PDF"))
    )
      throw Error("Invalid PDF download");
    const popup = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Print", exact: true }).click();
    const printWindow = await popup;
    await printWindow.waitForLoadState();
    await expect(printWindow.locator(".sheet")).toHaveCount(expectedPages);
    await printWindow.close();
    await page
      .getByRole("button", { name: "Open / Edit", exact: true })
      .click();
    await page.getByRole("button", { name: "Finalize", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm", exact: true })
      .click();
    await expect(page.getByLabel("Customer", exact())).toBeDisabled();
    await page.getByLabel("Issued quotation status").selectOption("Sent");
    await expect(page.locator(".quote-toolbar .badge")).toHaveText("Sent");
    await page
      .getByRole("button", { name: "Create Revision", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Revision notes", exact())
      .fill("QA scope revision");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create draft revision", exact: true })
      .click();
    await expect(page.getByLabel("Revision Number", exact())).toHaveValue("1");
    await expect(page.getByLabel("Customer", exact())).toBeEnabled();
    await page
      .getByRole("button", { name: "Duplicate Quotation", exact: true })
      .click();
    await expect(page.getByLabel("Revision Number", exact())).toHaveValue("0");
    const duplicateId = await page.evaluate(() => location.hash.split("/")[2]);
    await page.goto(url + "/#/quotations/" + quoteId + "/edit");
    await expect(page.getByLabel("Customer", exact())).toBeDisabled();
    await page
      .getByRole("button", { name: "Return to draft", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Reason for returning to draft", exact())
      .fill("QA controlled correction");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Return to draft", exact: true })
      .click();
    await expect(page.getByLabel("Customer", exact())).toBeEnabled();
    await page.goto(url + "/#/quotations");
    const duplicateCard = page
      .locator(".quote-card")
      .filter({
        has: page.locator(`a[href="#/quotations/${duplicateId}/edit"]`),
      });
    await duplicateCard
      .getByRole("button", { name: "Delete Draft", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm", exact: true })
      .click();
    await expect(duplicateCard).toHaveCount(0);
    await page.goto(url + "/#/projects/project-0/quotations");
    await expect(
      page.getByRole("heading", { name: "Quotations", exact: true }),
    ).toBeVisible();
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("List overflow " + width);
    checks.push({
      width,
      journey:
        "create → relationships → nested BOQ/edit/reorder/duplicate/delete → VAT → milestones → terms → autosave/reload → preview → PDF → print → finalize/lock → sent → revision → duplicate → controlled return → project history",
    });
    await context.close();
  }
  if (failures.length) throw Error(failures.join("\n"));
  fs.writeFileSync(
    "tmp/quotation-qa/browser-results.json",
    JSON.stringify({ checks, failures }, null, 2),
  );
  console.log(
    "PASS: desktop and mobile quotation workflows, PDF downloads, print, lifecycle and persistence.",
  );
} finally {
  await browser.close();
}
function exact() {
  return { exact: true };
}
