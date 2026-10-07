import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(r.status() + " " + r.url());
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:5173");
await page.getByRole("heading", { name: "Executive Overview" }).waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "docs/dashboard-desktop.png", fullPage: true });
const sizes = [
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [430, 932],
  [390, 844],
];
const routes = [
  "dashboard",
  "projects",
  "planning",
  "tasks",
  "team",
  "site-updates",
  "snags-qa",
  "documents",
  "handover",
  "reports",
  "settings",
];
const checks = [];
for (const [width, height] of sizes) {
  await page.setViewportSize({ width, height });
  for (const route of routes) {
    await page.goto("http://127.0.0.1:5173/#/" + route);
    await page.locator("main h1").first().waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    checks.push({ width, height, route, overflow });
    if (overflow) throw Error(`Overflow: ${route} at ${width}`);
  }
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "docs/settings-mobile.png", fullPage: true });
await page.goto("http://127.0.0.1:5173/#/dashboard");
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "docs/dashboard-mobile.png", fullPage: true });
await page.setViewportSize({ width: 1440, height: 900 });
await page.getByRole("button", { name: "+ New Project", exact: true }).click();
let dialog = page.getByRole("dialog");
await dialog
  .getByLabel("Project name", { exact: true })
  .fill("QA Dubai Office");
await dialog
  .getByLabel("Client name", { exact: true })
  .fill("QA Fictional Client");
await dialog
  .getByLabel("Client contact", { exact: true })
  .fill("Demo representative");
await dialog.getByLabel("Contract value AED").fill("450000");
await dialog.getByRole("button", { name: "Continue →" }).click();
await dialog
  .getByLabel("Project location", { exact: true })
  .fill("Dubai Marina");
await dialog.getByLabel("Interior Design", { exact: true }).check();
await dialog.getByLabel("MEP", { exact: true }).check();
await dialog.getByRole("button", { name: "Continue →" }).click();
await dialog
  .getByLabel("Site Engineer", { exact: true })
  .selectOption("person-3");
await dialog.getByRole("button", { name: "Continue →" }).click();
await dialog.getByRole("button", { name: "Continue →" }).click();
await dialog
  .getByRole("button", { name: "Create Project", exact: true })
  .click();
await page
  .getByRole("heading", { name: "QA Dubai Office", exact: true })
  .waitFor();
const projectId = await page.evaluate(
  () =>
    JSON.parse(localStorage.getItem("azzora-demo-v1")).projects.find(
      (p) => p.name === "QA Dubai Office",
    ).id,
);
await page.goto("http://127.0.0.1:5173/#/projects/" + projectId + "/timeline");
await page
  .getByRole("button", { name: /Site Survey/ })
  .first()
  .click();
dialog = page.getByRole("dialog");
await dialog.getByLabel("Progress %", { exact: true }).fill("50");
await dialog
  .getByLabel("Assigned to", { exact: true })
  .selectOption("person-3");
await dialog
  .getByLabel("Finish-to-start predecessors")
  .selectOption({ label: "Project Kickoff" });
await dialog.getByRole("button", { name: "Save Changes" }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
const computed = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem("azzora-demo-v1"));
  const p = d.projects.find((p) => p.name === "QA Dubai Office");
  return {
    tasks: d.tasks.filter((t) => t.projectId === p.id).length,
    assignments: d.assignments.filter((a) => a.projectId === p.id).length,
    task: d.tasks.find((t) => t.projectId === p.id && t.name === "Site Survey"),
  };
});
if (
  computed.tasks !== 37 ||
  computed.task.progress !== 50 ||
  computed.task.dependencies.length !== 1
)
  throw Error("Planning changes did not persist");
await page.goto("http://127.0.0.1:5173/#/projects/" + projectId + "/overview");
await page.getByText("1%", { exact: true }).first().waitFor();
await page.goto("http://127.0.0.1:5173/#/projects/" + projectId + "/team");
await page.getByRole("heading", { name: "Omar Faris", exact: true }).count();
await page.goto(
  "http://127.0.0.1:5173/#/projects/" + projectId + "/site-updates",
);
await page.getByRole("button", { name: "+ Post Site Update" }).click();
dialog = page.getByRole("dialog");
await dialog
  .getByLabel("Work completed", { exact: true })
  .fill("QA site survey completed");
await dialog.getByLabel("Manpower count").fill("12");
await dialog
  .getByLabel("Upload photos")
  .setInputFiles("public/assets/azzora-logo.png");
await dialog.locator(".photo-grid img").waitFor();
await dialog.getByRole("button", { name: "Post Update", exact: true }).click();
await page.getByText("QA site survey completed", { exact: true }).waitFor();

await page.goto("http://127.0.0.1:5173/#/projects/" + projectId + "/tasks");
await page.getByRole("button", { name: "+ Create Task" }).click();
dialog = page.getByRole("dialog");
await dialog
  .getByLabel("Task name", { exact: true })
  .fill("QA supplemental inspection");
await dialog
  .getByLabel("Assigned to", { exact: true })
  .selectOption("person-3");
await dialog.getByRole("button", { name: "Save Changes" }).click();
await page
  .getByRole("button")
  .filter({ hasText: "QA supplemental inspection" })
  .waitFor();
await page.goto("http://127.0.0.1:5173/#/projects/" + projectId + "/team");
await page
  .locator(".list-row")
  .filter({ hasText: "Site Engineer" })
  .getByRole("button", { name: "Edit / replace" })
  .click();
dialog = page.getByRole("dialog");
await dialog.getByLabel("Person", { exact: true }).selectOption("person-4");
await dialog
  .getByLabel("Reassign active tasks when replacing this person")
  .check();
await dialog.getByRole("button", { name: "Save Assignment" }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
const replacement = await page.evaluate((id) => {
  const db = JSON.parse(localStorage.getItem("azzora-demo-v1"));
  return {
    historic: db.assignments.some(
      (a) =>
        a.projectId === id &&
        a.personId === "person-3" &&
        a.status === "Replaced",
    ),
    task: db.tasks.find(
      (t) => t.projectId === id && t.name === "QA supplemental inspection",
    ).assigneeId,
  };
}, projectId);
if (!replacement.historic || replacement.task !== "person-4")
  throw Error("Replacement did not retain history/reassign tasks");
await page.goto("http://127.0.0.1:5173/#/projects/" + projectId + "/documents");
await page.getByRole("button", { name: "+ Add Document" }).click();
dialog = page.getByRole("dialog");
await dialog.getByLabel("Document name").fill("QA client layout approval");
await dialog.getByLabel("Category", { exact: true }).selectOption("Approvals");
await dialog.getByLabel("Approval status").selectOption("Approved");
await dialog
  .getByLabel("Attach files")
  .setInputFiles("public/assets/azzora-logo.png");
await dialog.locator(".photo-grid img").waitFor();
await dialog.getByRole("button", { name: "Save Document" }).click();
await page.getByRole("link", { name: "Download", exact: true }).waitFor();
await page.goto("http://127.0.0.1:5173/#/projects/" + projectId + "/snags-qa");
await page.getByRole("button", { name: "+ Create Snag" }).click();
dialog = page.getByRole("dialog");
await dialog.getByLabel("Area / Room").fill("Reception");
await dialog
  .getByLabel("Description", { exact: true })
  .fill("QA ceiling alignment");
await dialog.getByLabel("Responsible person").selectOption("person-3");
await dialog.getByRole("button", { name: "Save Snag" }).click();
for (const status of [
  "Assigned",
  "Rectification",
  "Ready for Inspection",
  "Closed",
]) {
  await page
    .getByRole("button")
    .filter({ hasText: "QA ceiling alignment" })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Status", { exact: true }).selectOption(status);
  if (status === "Closed")
    await dialog
      .getByLabel("Inspection notes")
      .fill("Verified alignment against approved drawing");
  await dialog.getByRole("button", { name: "Save Snag" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}
await page.goto("http://127.0.0.1:5173/#/projects/" + projectId + "/handover");
if (
  await page
    .getByRole("button", { name: "Complete Project", exact: true })
    .isEnabled()
)
  throw Error("Handover incorrectly ready");
await page.goto("http://127.0.0.1:5173/#/projects/" + projectId + "/tasks");
for (let i = 0; i < 38; i++) {
  await page.locator(".task-row").nth(i).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Mark Complete", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}
await page.goto("http://127.0.0.1:5173/#/projects/" + projectId + "/handover");
const boxes = page.locator("main input[type=checkbox]:not([disabled])");
for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).check();
await page.getByText("Ready for Handover", { exact: true }).waitFor();
await page
  .getByRole("button", { name: "Complete Project", exact: true })
  .click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Confirm", exact: true })
  .click();
await page.getByText("Completed", { exact: true }).first().waitFor();
await page.reload();
await page.getByText("Completed", { exact: true }).first().waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "docs/handover-verified.png", fullPage: true });
fs.writeFileSync(
  "docs/browser-validation.json",
  JSON.stringify(
    {
      checks,
      errors,
      journey:
        "project creation → planning edit/dependency → team → site update → snag inspection/closure → 38 task completions + task creation/team replacement/photo upload/document approval → handover confirmation → reload persistence",
      computed,
    },
    null,
    2,
  ),
);
if (errors.length) throw Error(errors.join("\n"));
await browser.close();
console.log(
  "PASS: 66 route/viewport checks, no overflow or console errors, complete project-to-handover journey.",
);
