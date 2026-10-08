import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
fs.mkdirSync("docs/boq", { recursive: true });
for (const width of [1440, 1024, 768, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.goto("http://127.0.0.1:5173/#/quotations");
  await page
    .getByRole("button", { name: "New quotation", exact: true })
    .click();
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  const section = page.getByTestId("quote-section").first();
  await section
    .getByLabel("Section description", { exact: true })
    .fill("Civil works");
  await section
    .getByRole("button", { name: "Add main item", exact: true })
    .click();
  await section.getByRole("button", { name: "Add line", exact: true }).click();
  const rows = section.getByTestId("quote-line");
  await rows
    .nth(0)
    .getByLabel("Description", { exact: true })
    .fill("Floor finishes");
  await rows
    .nth(1)
    .getByLabel("Description", { exact: true })
    .fill("Supply and install porcelain tiles");
  await rows.nth(1).getByLabel("Quantity", { exact: true }).fill("2.5");
  await rows.nth(1).getByLabel("Rate / Unit", { exact: true }).fill("90");
  await section
    .getByRole("button", { name: "Add subsection", exact: true })
    .click();
  await expect(
    page.getByTestId("quote-section").nth(1).getByLabel("Parent section"),
  ).not.toHaveValue("");
  const parent = page
    .getByTestId("quote-section")
    .nth(1)
    .getByLabel("Parent section");
  const parentId = await parent.inputValue();
  await parent.selectOption("");
  await expect(page.getByTestId("quote-section").nth(1)).not.toHaveClass(
    /boq-subsection/,
  );
  await parent.selectOption(parentId);
  await expect(page.getByTestId("grand-total")).toHaveText("AED 236.25");
  const more = section.locator(".boq-more summary");
  await more.focus();
  await more.press("Enter");
  await expect(
    section.getByRole("button", { name: "Duplicate section", exact: true }),
  ).toBeVisible();
  await more.press("Escape");
  await expect(more).toBeFocused();
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `docs/boq/${process.env.BOQ_PHASE || "after"}-${width}.png`,
    fullPage: true,
  });
  await page
    .locator(".boq-builder")
    .screenshot({
      style: ".topbar, .mobile-nav { visibility: hidden !important; }",
      path: `docs/boq/${process.env.BOQ_PHASE || "after"}-boq-${width}.png`,
    });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
  await page.close();
}
await browser.close();
