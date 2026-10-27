import { test, expect } from "@playwright/test";
test("complete operator workflow and connectivity recovery", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("DEMO MODE · SIMULATED DATA")).toBeVisible();
  await page.getByRole("link", { name: "Inspection History" }).click();
  await page.getByLabel("Decision", { exact: true }).selectOption("reject");
  await page.getByLabel("Station", { exact: true }).selectOption("CAM-01");
  await expect(page.locator("tbody tr").first()).toContainText("Fail");
  await page
    .getByRole("button", { name: /VQC-.*open details/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Operator note").fill("Packaging inspected.");
  await page.getByRole("button", { name: "Save review" }).click();
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(
    page.getByText("Defect confirmed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByText("Operator confirmed").first()).toBeVisible();
  await page
    .getByRole("link", { name: "Live Monitoring", exact: true })
    .click();
  await page.getByLabel("Select station").selectOption("CAM-02");
  await expect(
    page.getByRole("heading", { name: "CAM-02 · Visual simulation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause view", exact: true }).click();
  await expect(page.getByText("View paused", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume view" }).click();
  await page.getByRole("link", { name: "Stations", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "CAM-01", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  expect((await downloadPromise).suggestedFilename()).toContain(".csv");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Simulate connection outage" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Data is out of date");
  await page
    .getByRole("button", { name: "Restore connection", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByLabel("Time zone").selectOption("UTC");
  await page.reload();
  await expect(page.getByLabel("Time zone")).toHaveValue("UTC");
  expect(errors).toEqual([]);
});
test("filter empty state, pagination, dates and real-time arrival", async ({
  page,
}) => {
  await page.goto("/history");
  const first = await page.locator("tbody tr").first().textContent();
  await page.getByRole("button", { name: "Next page" }).click();
  expect(await page.locator("tbody tr").first().textContent()).not.toBe(first);
  await page.getByLabel("Search events or products").fill("no-result-xyz");
  await expect(page.getByText("No records found")).toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByLabel("Start date", { exact: true }).fill("2099-01-01");
  await expect(page.getByText("No records found")).toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  const id = await page.locator(".event-id").first().textContent();
  await expect
    .poll(() => page.locator(".event-id").first().textContent(), {
      timeout: 10000,
    })
    .not.toBe(id);
});
for (const width of [1440, 1024, 768, 390])
  test(`responsive ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/overview-${width}.png`,
      fullPage: true,
    });
    if (width === 390) {
      await page.getByRole("button", { name: "Open menu" }).click();
    }
    await page
      .getByRole("link", { name: "Inspection History", exact: true })
      .click();
    await expect(page.getByLabel("Search events or products")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
import AxeBuilder from "@axe-core/playwright";
test("keyboard, dialog focus and accessibility audit", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("table")).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "VisionQC home" })).toBeFocused();
  await page
    .getByRole("button", { name: /VQC-.*open details/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("all modules fit mobile and tablet", async ({ page }) => {
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1080 });
    for (const path of ["/monitoring", "/stations", "/reports", "/settings"]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("body")).not.toContainText(/[çğıöşüÇĞİÖŞÜ]/);
      await expect(page.getByText("Loading inspection data…")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}`,
      ).toBe(true);
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: `test-results/${path.slice(1)}-${width}.png`,
          fullPage: true,
        });
    }
  }
});
test("accessibility across remaining modules and event dialog", async ({
  page,
}) => {
  for (const path of [
    "/history",
    "/monitoring",
    "/stations",
    "/reports",
    "/settings",
  ]) {
    await page.goto(path);
    await expect(page.getByText("Loading inspection data…")).toHaveCount(0);
    const r = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      r.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      path,
    ).toEqual([]);
  }
  await page.goto("/history");
  await page
    .getByRole("button", { name: /VQC-.*open details/ })
    .first()
    .click();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("station links retain selection, display pause freezes only the displayed event", async ({
  page,
}) => {
  await page.goto("/stations");
  await page
    .locator(".station-card")
    .filter({ has: page.getByRole("heading", { name: "CAM-02", exact: true }) })
    .getByRole("link", { name: "Go to monitoring" })
    .click();
  await expect(page.getByLabel("Select station")).toHaveValue("CAM-02");
  await page.reload();
  await expect(page.getByLabel("Select station")).toHaveValue("CAM-02");
  await page.getByRole("button", { name: "Pause view", exact: true }).click();
  const id = await page.locator(".decision-panel>.muted").textContent();
  await page.waitForTimeout(6500);
  expect(await page.locator(".decision-panel>.muted").textContent()).toBe(id);
  await page.getByRole("button", { name: "Resume view" }).click();
  await expect(page.locator(".decision-panel>.muted")).not.toHaveText(id || "");
});
test("saved false-positive review reopens, supports flagged outcome and cancel", async ({
  page,
}) => {
  await page.goto("/history");
  await page.getByLabel("Decision", { exact: true }).selectOption("reject");
  const id = await page.locator(".event-id").first().textContent();
  await page.getByRole("button", { name: id || "", exact: true }).click();
  await page
    .getByLabel("Review outcome", { exact: true })
    .selectOption("false-positive");
  await page.getByLabel("Operator note").fill("Test review");
  await page.getByRole("button", { name: "Save review" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByText("Not reviewed yet", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save review" }).click();
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(
    page.getByText("False positive", { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: id || "", exact: true }).click();
  await expect(page.getByLabel("Review outcome", { exact: true })).toHaveValue(
    "false-positive",
  );
  await page
    .getByLabel("Review outcome", { exact: true })
    .selectOption("flagged");
  await page.getByRole("button", { name: "Save review" }).click();
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(
    page.getByText("Flagged for review", { exact: true }).last(),
  ).toBeVisible();
});
test("demo works when every non-local request is blocked", async ({ page }) => {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:5197") return route.continue();
    external.push(url.href);
    return route.abort();
  });
  await page.goto("/");
  await expect(page.locator(".metric-value").first()).toContainText("240");
  await expect(page.getByRole("img", { name: /Inspected:/ })).toBeVisible();
  for (const path of [
    "/monitoring",
    "/history",
    "/stations",
    "/reports",
    "/settings",
  ]) {
    await page.goto(path);
    await expect(page.getByText("DEMO MODE · SIMULATED DATA")).toBeVisible();
    await expect(page.getByText("Loading inspection data…")).toHaveCount(0);
  }
  expect(external).toEqual([]);
});

test("dashboard queue filters preserve event details and summary cards", async ({
  page,
}) => {
  await page.goto("/");
  const filters = page.getByRole("group", {
    name: "Inspection queue filter",
  });
  await filters.getByRole("button", { name: "Fail", exact: true }).click();
  await expect(
    filters.getByRole("button", { name: "Fail", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(5);
  for (const row of await rows.all()) await expect(row).toContainText("Fail");
  await filters.getByRole("button", { name: "Pass", exact: true }).click();
  for (const row of await rows.all()) await expect(row).toContainText("Pass");
  await filters.getByRole("button", { name: "Pending", exact: true }).click();
  await page
    .getByRole("button", { name: /VQC-.*open details/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("AI prediction");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByRole("heading", { name: "Inspection summary", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Station health", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Inspection activity", exact: true }),
  ).toBeVisible();
  await page.getByText("Workspace information", { exact: true }).click();
  await expect(
    page.getByText("Quality, at every step.", { exact: true }),
  ).toBeVisible();
});
