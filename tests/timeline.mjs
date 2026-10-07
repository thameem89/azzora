import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
const BASE_URL = process.env.AZZORA_TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox"],
});
// Each run uses a fresh incognito context, separate from saved customer data.
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
await page.goto(BASE_URL + "/#/projects/project-0/timeline");
await page
  .getByRole("heading", { name: "Dependencies / Timeline", exact: true })
  .waitFor();
const checks = [];
const check = (label) => checks.push(label);
const editor = () => page.locator(".timeline-editor-panel");
const openLinks = async (name) => {
  await page
    .getByRole("button", { name: `Dependencies for ${name}`, exact: true })
    .click();
};
const choose = async (name) =>
  editor().getByLabel("Add dependency").selectOption({ label: name });
const count = () => page.locator(".timeline-connectors > path").count();
assert.equal(await page.locator(".timeline-bar").count(), 37);
check("Existing 37 activities rendered");
const geometry = await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem("azzora-demo-v1") || "null");
  return [...document.querySelectorAll(".timeline-bar")].map((bar) => ({
    id: bar.dataset.taskId,
    width: parseFloat(bar.style.width),
    left: parseFloat(bar.style.left),
    rowY: bar.getBoundingClientRect().y,
    task: db?.tasks.find((t) => t.id === bar.dataset.taskId),
  }));
});
// Initial seed is saved by the first edit; date geometry is also checked against drawer values below.
assert(geometry.every((g) => g.width >= 32));
await openLinks("MEP First-Fix");
await choose("MEP First-Fix");
await editor()
  .getByRole("alert")
  .getByText("An activity cannot depend on itself.")
  .waitFor();
check("Self dependency rejected");
await choose("Drawing Approval (already added)");
await editor()
  .getByRole("alert")
  .getByText("This dependency already exists.")
  .waitFor();
check("Duplicate rejected");
await choose("Ceiling Closure");
await editor()
  .getByRole("alert")
  .getByText(/circular dependency/)
  .waitFor();
check("Indirect cycle rejected");
await choose("Inspection");
await editor()
  .getByRole("alert")
  .getByText(/circular dependency/)
  .waitFor();
check("Direct cycle rejected");
const preserved = () =>
  page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("azzora-demo-v1"));
    return JSON.stringify({
      projects: db.projects,
      tasks: db.tasks.filter((t) => t.projectId !== "project-0"),
      quotations: db.quotations,
    });
  });
const before = await count();
await choose("Material Delivery");
assert.equal(await count(), before + 1);
await editor()
  .getByText("Blocked by: Material Delivery", { exact: true })
  .waitFor();
check("Add updates arrow and blocker immediately");
const originalRecords = await preserved();
await page.screenshot({ path: "docs/timeline-add.png", fullPage: true });
await editor()
  .getByRole("button", {
    name: "Remove dependency Material Delivery",
    exact: true,
  })
  .click();
assert.equal(await count(), before);
check("Remove updates arrow immediately");
await page.screenshot({ path: "docs/timeline-remove.png", fullPage: true });
await editor().getByRole("button", { name: "Close", exact: true }).click();
await openLinks("Installation");
await editor()
  .getByText("Blocked by: MEP First-Fix, Material Delivery", { exact: true })
  .waitFor();
check("Multiple predecessors and blockers shown");
await editor().getByRole("button", { name: "Close", exact: true }).click();
await page
  .locator(".timeline-open")
  .filter({ has: page.locator("strong", { hasText: /^Drawing Approval$/ }) })
  .click();
let dialog = page.getByRole("dialog");
await dialog.getByLabel("Task name", { exact: true }).waitFor();
check("Activity opens existing TaskDrawer");
const due = await dialog.getByLabel("Due", { exact: true }).inputValue();
const later = new Date(due + "T12:00Z");
later.setUTCDate(later.getUTCDate() + 8);
await dialog
  .getByLabel("Due", { exact: true })
  .fill(later.toISOString().slice(0, 10));
const originalSuccessor = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("azzora-demo-v1")).tasks.find(
    (t) => t.name === "MEP First-Fix",
  ),
);
await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();
await dialog.waitFor({ state: "hidden" });
await openLinks("MEP First-Fix");
await editor()
  .getByText(/Date conflict: MEP First-Fix starts before Drawing Approval/)
  .waitFor();
const successor = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("azzora-demo-v1")).tasks.find(
    (t) => t.name === "MEP First-Fix",
  ),
);
assert.equal(successor.start, originalSuccessor.start);
assert.equal(successor.due, originalSuccessor.due);
check("Date edit recalculates conflict without rescheduling");
await editor().getByRole("button", { name: "Close", exact: true }).click();
await page.reload();
await page
  .getByRole("heading", { name: "Dependencies / Timeline", exact: true })
  .waitFor();
assert.deepEqual(
  await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("azzora-demo-v1")).tasks.find(
        (t) => t.name === "Installation",
      ).dependencies,
  ),
  await page
    .locator(
      '.timeline-connectors > path[data-to="' +
        (await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("azzora-demo-v1")).tasks.find(
              (t) => t.name === "Installation",
            ).id,
        )) +
        '"]',
    )
    .evaluateAll((paths) => paths.map((p) => p.dataset.from)),
);
check("Saved multiple predecessors and their arrows persist after reload");
const sizes = [
  [1440, 1000],
  [1024, 900],
  [768, 1000],
  [390, 844],
];
for (const [width, height] of sizes) {
  await page.setViewportSize({ width, height });
  const measurements = await page.evaluate(() => {
    const cal = document.querySelector(".timeline-calendar"),
      left = document.querySelector(".timeline-activities");
    cal.scrollLeft = 500;
    cal.scrollTop = 400;
    const canvas = document.querySelector(".timeline-canvas");
    const bars = [...document.querySelectorAll(".timeline-bar")];
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      scroll: cal.scrollLeft,
      barRows: bars.map((b) => ({
        id: b.dataset.taskId,
        y: b.getBoundingClientRect().top - canvas.getBoundingClientRect().top,
      })),
      paths: [...document.querySelectorAll(".timeline-connectors > path")].map(
        (p) => ({
          id: p.dataset.from,
          y: Number(p.getAttribute("d").split(" ")[1]),
        }),
      ),
      leftTop: left.scrollTop,
    };
  });
  assert.equal(measurements.overflow, false);
  assert(measurements.scroll > 0);
  for (const p of measurements.paths) {
    const bar = measurements.barRows.find((b) => b.id === p.id);
    assert(Math.abs(bar.y + 14 - p.y) < 1);
  }
  await page.waitForFunction(
    () =>
      document.querySelector(".timeline-activities").scrollTop ===
      document.querySelector(".timeline-calendar").scrollTop,
  );
  assert.equal(
    await page.locator(".timeline-activities").evaluate((e) => e.scrollTop),
    await page.locator(".timeline-calendar").evaluate((e) => e.scrollTop),
  );
  await page
    .locator(".timeline-activities")
    .evaluate((e) => (e.scrollTop = 600));
  await page.waitForFunction(
    () =>
      document.querySelector(".timeline-activities").scrollTop ===
      document.querySelector(".timeline-calendar").scrollTop,
  );
  assert.equal(
    await page.locator(".timeline-activities").evaluate((e) => e.scrollTop),
    await page.locator(".timeline-calendar").evaluate((e) => e.scrollTop),
  );
  check(
    `${width}px: contained horizontal scroll, aligned arrows, bidirectional vertical sync`,
  );
  const endpoints = await page.evaluate(() =>
    [...document.querySelectorAll(".timeline-connectors > path")].map(
      (path) => {
        const bars = [...document.querySelectorAll(".timeline-bar")];
        const a = bars.find((b) => b.dataset.taskId === path.dataset.from),
          b = bars.find((b) => b.dataset.taskId === path.dataset.to);
        const coordinates = path
          .getAttribute("d")
          .match(/-?\d+(?:\.\d+)?/g)
          .map(Number);
        return {
          start: coordinates[0],
          finish: coordinates.at(-1),
          aEnd: parseFloat(a.style.left) + parseFloat(a.style.width),
          bStart: parseFloat(b.style.left),
        };
      },
    ),
  );
  assert(endpoints.every((p) => p.start === p.aEnd && p.finish === p.bStart));
  await openLinks("MEP First-Fix");
  const previousArrows = await count();
  await choose("Material Delivery");
  assert.equal(await count(), previousArrows + 1);
  await choose("MEP First-Fix");
  await editor()
    .getByRole("alert")
    .getByText("An activity cannot depend on itself.")
    .waitFor();
  await editor()
    .getByRole("button", {
      name: "Remove dependency Material Delivery",
      exact: true,
    })
    .click();
  assert.equal(await count(), previousArrows);
  await editor().getByRole("button", { name: "Close", exact: true }).click();
  check(`${width}px: touch-friendly add/remove and self-link rejection`);
  await page.locator(".timeline-calendar").evaluate((e) => {
    e.scrollTop = e.scrollHeight;
    e.scrollLeft = e.scrollWidth;
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".timeline-activities").scrollTop ===
      document.querySelector(".timeline-calendar").scrollTop,
  );
  await page.screenshot({ path: `docs/timeline-${width}.png`, fullPage: true });
}
// Geometry must follow scale and filtered activity visibility.
for (const scale of [16, 56, 32]) {
  await page.getByLabel("Timeline scale").selectOption(String(scale));
  const aligned = await page.evaluate(() => {
    const bars = [...document.querySelectorAll(".timeline-bar")];
    return [...document.querySelectorAll(".timeline-connectors > path")].every(
      (path) => {
        const a = bars.find((b) => b.dataset.taskId === path.dataset.from),
          b = bars.find((b) => b.dataset.taskId === path.dataset.to);
        const n = path
          .getAttribute("d")
          .match(/-?\d+(?:\.\d+)?/g)
          .map(Number);
        return (
          n[0] === parseFloat(a.style.left) + parseFloat(a.style.width) &&
          n.at(-1) === parseFloat(b.style.left)
        );
      },
    );
  });
  assert(aligned);
}
check("Arrow endpoints remain attached at compact, day and expanded scales");
const installationAssignee = await page.evaluate(
  () =>
    JSON.parse(localStorage.getItem("azzora-demo-v1")).tasks.find(
      (t) => t.name === "Installation",
    ).assigneeId,
);
await page.getByLabel("Timeline assignee").selectOption(installationAssignee);
assert(
  await page.evaluate(() => {
    const visible = new Set(
      [...document.querySelectorAll(".timeline-bar")].map(
        (b) => b.dataset.taskId,
      ),
    );
    return [...document.querySelectorAll(".timeline-connectors > path")].every(
      (p) => visible.has(p.dataset.from) && visible.has(p.dataset.to),
    );
  }),
);
check(
  "Assignee filtering removes connectors whose endpoints are no longer visible",
);
await page.getByLabel("Timeline assignee").selectOption("");
// Return to fit-out chain for a readable screenshot.
await page.setViewportSize({ width: 1440, height: 1000 });
await page
  .locator(".timeline-open")
  .filter({ has: page.locator("strong", { hasText: /^Drawing Approval$/ }) })
  .click();
dialog = page.getByRole("dialog");
await dialog.getByLabel("Due", { exact: true }).fill(due);
await dialog.getByRole("button", { name: "Save Changes", exact: true }).click();
await dialog.waitFor({ state: "hidden" });
await openLinks("MEP First-Fix");
assert.equal(
  await editor()
    .getByText(/Date conflict:/)
    .count(),
  0,
);
await editor().getByRole("button", { name: "Close", exact: true }).click();
check("Restoring predecessor finish removes its date conflict immediately");
await page.locator(".timeline-calendar").evaluate((e) => {
  const bar = [...document.querySelectorAll(".timeline-bar")].find(
    (b) => b.textContent === "Drawing Approval",
  );
  e.scrollTop = bar.parentElement.offsetTop - 56;
  e.scrollLeft = Math.max(0, parseFloat(bar.style.left) - 32);
});
await page.waitForFunction(
  () =>
    document.querySelector(".timeline-activities").scrollTop ===
    document.querySelector(".timeline-calendar").scrollTop,
);
await page.screenshot({ path: "docs/timeline-chain.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(250);
await page.screenshot({
  path: "docs/timeline-mobile-chain.png",
  fullPage: true,
});
const bars = await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem("azzora-demo-v1"));
  return [...document.querySelectorAll(".timeline-bar")].map((b) => {
    const t = db.tasks.find((t) => t.id === b.dataset.taskId);
    return {
      width: parseFloat(b.style.width),
      days: (Date.parse(t.due) - Date.parse(t.start)) / 86400000 + 1,
    };
  });
});
assert(bars.every((b) => b.width === b.days * 32));
check("All bar widths match inclusive date durations");
// Complete each predecessor through the existing project/task details views.
const installationDates = await page.evaluate(() => {
  const t = JSON.parse(localStorage.getItem("azzora-demo-v1")).tasks.find(
    (t) => t.name === "Installation",
  );
  return [t.start, t.due];
});
await page.goto(BASE_URL + "/#/projects/project-0/tasks");
await page
  .getByRole("heading", { name: "Task Workspace", exact: true })
  .waitFor();
await page
  .locator(".task-row")
  .filter({ has: page.locator("strong", { hasText: /^Material Delivery$/ }) })
  .click();
dialog = page.getByRole("dialog");
await dialog
  .getByRole("button", { name: "Mark Complete", exact: true })
  .click();
await dialog.waitFor({ state: "hidden" });
await page.goto(BASE_URL + "/#/projects/project-0/timeline");
await page
  .getByRole("heading", { name: "Dependencies / Timeline", exact: true })
  .waitFor();
await openLinks("Installation");
await editor()
  .getByText("Blocked by: MEP First-Fix", { exact: true })
  .waitFor();
assert.equal(
  await editor()
    .getByText(/Blocked by:.*Material Delivery/)
    .count(),
  0,
);
check(
  "Completing one predecessor from existing task view removes only its blocker",
);
await editor().getByRole("button", { name: "Close", exact: true }).click();
await page
  .getByRole("button", { name: "Open activity MEP First-Fix", exact: true })
  .click();
dialog = page.getByRole("dialog");
await dialog
  .getByRole("button", { name: "Mark Complete", exact: true })
  .click();
await dialog.waitFor({ state: "hidden" });
await openLinks("Installation");
assert.equal(
  await editor()
    .getByText(/Blocked by:/)
    .count(),
  0,
);
assert.equal(
  await page
    .locator(".timeline-open")
    .filter({ has: page.locator("strong", { hasText: /^Installation$/ }) })
    .getByText(/Blocked by:/)
    .count(),
  0,
);
check(
  "Completing remaining predecessor from timeline clears all blockers immediately",
);
await editor().getByRole("button", { name: "Close", exact: true }).click();
await openLinks("Inspection");
await editor()
  .getByText(/Date conflict: Inspection starts before MEP First-Fix/)
  .waitFor();
assert.equal(
  await editor()
    .getByText(/Blocked by:/)
    .count(),
  0,
);
check(
  "Date conflict remains visible after predecessor completion when dates still overlap",
);
assert.deepEqual(
  await page.evaluate(() => {
    const t = JSON.parse(localStorage.getItem("azzora-demo-v1")).tasks.find(
      (t) => t.name === "Installation",
    );
    return [t.start, t.due];
  }),
  installationDates,
);
check("Predecessor completion does not move successor dates");
await page.reload();
await page
  .getByRole("heading", { name: "Dependencies / Timeline", exact: true })
  .waitFor();
await openLinks("Installation");
assert.equal(
  await editor()
    .getByText(/Blocked by:/)
    .count(),
  0,
);
check(
  "Completed predecessor states and unblocked activity persist after refresh",
);
assert.equal(await preserved(), originalRecords);
check("All project records, other project activities and quotations preserved");
assert.equal(errors.length, 0);
fs.writeFileSync(
  "docs/timeline-validation.json",
  JSON.stringify({ checks, errors, isolatedBrowserContext: true }, null, 2),
);
await browser.close();
console.log("PASS", checks);
