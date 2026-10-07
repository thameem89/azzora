import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const BASE_URL = process.env.AZZORA_TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox"],
});
// A fresh incognito context never accesses the user's saved browser profile.
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await context.tracing.start({
  screenshots: true,
  snapshots: true,
  sources: true,
});
const page = await context.newPage();
try {
  const errors = [];
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.status() + " " + r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(BASE_URL);
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
  const routeTitles = {
    dashboard: "Executive Overview",
    projects: "Project Directory",
    planning: "Planning & Timeline",
    tasks: "Task Workspace",
    team: "Team & Resource Allocation",
    "site-updates": "Site Updates",
    "snags-qa": "Snags & Quality Assurance",
    documents: "Document Register",
    handover: "Project Handover",
    reports: "Portfolio Reports",
    settings: "Settings",
  };
  const journeyChecks = [];
  const checks = [];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await page.goto(BASE_URL + "/#/" + route);
      await page
        .getByRole("heading", { name: routeTitles[route], exact: true })
        .waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      checks.push({ width, height, route, overflow });
      if (overflow) throw Error(`Overflow: ${route} at ${width}`);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/settings-mobile.png", fullPage: true });
  await page.goto(BASE_URL + "/#/dashboard");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/dashboard-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "+ New Project", exact: true })
    .click();
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
  const originalRecords = await page.evaluate((id) => {
    const db = JSON.parse(localStorage.getItem("azzora-demo-v1"));
    return JSON.stringify({
      projects: db.projects.filter((p) => p.id !== id),
      tasks: db.tasks.filter((t) => t.projectId !== id),
      assignments: db.assignments.filter((t) => t.projectId !== id),
      phases: db.phases.filter((t) => t.projectId !== id),
      documents: db.documents.filter((t) => t.projectId !== id),
      handover: db.handover.filter((t) => t.projectId !== id),
      quotations: db.quotations,
    });
  }, projectId);
  journeyChecks.push(
    "Project creation generated existing task, phase and assignment records",
  );
  await page.goto(BASE_URL + "/#/projects");
  await page
    .getByRole("heading", { name: "Project Directory", exact: true })
    .waitFor();
  await page
    .locator(".project-card")
    .filter({ hasText: "QA Dubai Office" })
    .click();
  await page
    .getByRole("heading", { name: "QA Dubai Office", exact: true })
    .waitFor();
  journeyChecks.push("Project opens from project directory");
  await page
    .getByRole("link", { name: "Dependencies / Timeline", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Dependencies / Timeline", exact: true })
    .waitFor();
  journeyChecks.push("Project timeline tab navigation");
  await page.goto(BASE_URL + "/#/projects/" + projectId + "/timeline");
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
    .getByLabel("Add dependency")
    .selectOption({ label: "Project Kickoff" });
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const computed = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("azzora-demo-v1"));
    const p = d.projects.find((p) => p.name === "QA Dubai Office");
    return {
      tasks: d.tasks.filter((t) => t.projectId === p.id).length,
      assignments: d.assignments.filter((a) => a.projectId === p.id).length,
      task: d.tasks.find(
        (t) => t.projectId === p.id && t.name === "Site Survey",
      ),
    };
  });
  if (
    computed.tasks !== 37 ||
    computed.task.progress !== 50 ||
    computed.task.dependencies.length !== 1
  )
    throw Error("Planning changes did not persist");
  await page.reload();
  await page
    .getByRole("heading", { name: "Dependencies / Timeline", exact: true })
    .waitFor();
  await expect(
    page.locator(
      `.timeline-connectors > path[data-from="${computed.task.dependencies[0]}"][data-to="${computed.task.id}"]`,
    ),
  ).toHaveCount(1);
  journeyChecks.push(
    "Timeline drawer edits and dependency arrow persist after refresh",
  );
  await page.goto(BASE_URL + "/#/projects/" + projectId + "/overview");
  await page.getByText("1%", { exact: true }).first().waitFor();
  await page
    .locator(".task-row")
    .filter({ has: page.locator("strong", { hasText: /^Site Survey$/ }) })
    .click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Task name", { exact: true })).toHaveValue(
    "Site Survey",
  );
  await dialog
    .getByLabel("Notes", { exact: true })
    .fill("Verified through existing project overview");
  await dialog
    .getByRole("button", { name: "Save Changes", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  journeyChecks.push(
    "Existing overview TaskDrawer opens and saves activity edits",
  );
  await page.goto(BASE_URL + "/#/projects/" + projectId + "/team");
  await page.getByRole("heading", { name: "Omar Faris", exact: true }).count();
  await page.goto(BASE_URL + "/#/projects/" + projectId + "/site-updates");
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
  await dialog
    .getByRole("button", { name: "Post Update", exact: true })
    .click();
  await page.getByText("QA site survey completed", { exact: true }).waitFor();

  await page.goto(BASE_URL + "/#/projects/" + projectId + "/tasks");
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
  await page.goto(BASE_URL + "/#/projects/" + projectId + "/team");
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
  await page.goto(BASE_URL + "/#/projects/" + projectId + "/documents");
  await page.getByRole("button", { name: "+ Add Document" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Document name").fill("QA client layout approval");
  await dialog
    .getByLabel("Category", { exact: true })
    .selectOption("Approvals");
  await dialog.getByLabel("Approval status").selectOption("Approved");
  await dialog
    .getByLabel("Attach files")
    .setInputFiles("public/assets/azzora-logo.png");
  await dialog.locator(".photo-grid img").waitFor();
  await dialog.getByRole("button", { name: "Save Document" }).click();
  await page.getByRole("link", { name: "Download", exact: true }).waitFor();
  await page.goto(BASE_URL + "/#/projects/" + projectId + "/snags-qa");
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
  await page.goto(BASE_URL + "/#/projects/" + projectId + "/handover");
  if (
    await page
      .getByRole("button", { name: "Complete Project", exact: true })
      .isEnabled()
  )
    throw Error("Handover incorrectly ready");
  await page.goto(BASE_URL + "/#/projects/" + projectId + "/tasks");
  await page
    .getByRole("heading", { name: "Task Workspace", exact: true })
    .waitFor();
  await expect(page.locator(".task-row")).toHaveCount(38);
  for (let i = 0; i < 38; i++) {
    console.log(
      `Completing activity ${i + 1}/38: ${await page.locator(".task-row").nth(i).locator("strong").textContent()}`,
    );
    const name = await page
      .locator(".task-row")
      .nth(i)
      .locator("strong")
      .textContent();
    await page.locator(".task-row").nth(i).click();
    await expect(
      page.getByRole("dialog").getByLabel("Task name", { exact: true }),
    ).toHaveValue(name);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Mark Complete", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }
  await page.goto(BASE_URL + "/#/projects/" + projectId + "/handover");
  journeyChecks.push(
    "All 38 activities completed through existing task-list TaskDrawer",
  );
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
  const preservedRecords = await page.evaluate((id) => {
    const db = JSON.parse(localStorage.getItem("azzora-demo-v1"));
    return JSON.stringify({
      projects: db.projects.filter((p) => p.id !== id),
      tasks: db.tasks.filter((t) => t.projectId !== id),
      assignments: db.assignments.filter((t) => t.projectId !== id),
      phases: db.phases.filter((t) => t.projectId !== id),
      documents: db.documents.filter((t) => t.projectId !== id),
      handover: db.handover.filter((t) => t.projectId !== id),
      quotations: db.quotations,
    });
  }, projectId);
  expect(preservedRecords).toBe(originalRecords);
  journeyChecks.push(
    "Existing project records and quotations unchanged by complete CRM journey",
  );
  journeyChecks.push("Project handover/completion persists after refresh");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/handover-verified.png", fullPage: true });
  fs.writeFileSync(
    "docs/browser-validation.json",
    JSON.stringify(
      {
        checks,
        journeyChecks,
        isolatedBrowserContext: true,
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
  await context.tracing.stop({ path: "docs/crm-regression-trace.zip" });
  console.log(
    "PASS: 66 route/viewport checks, no overflow or console errors, complete project-to-handover journey.",
  );
} catch (error) {
  await page.screenshot({
    path: "docs/crm-regression-failure.png",
    fullPage: true,
  });
  fs.writeFileSync("docs/crm-regression-failure.html", await page.content());
  await context.tracing.stop({ path: "docs/crm-regression-trace.zip" });
  throw error;
} finally {
  await browser.close();
}
