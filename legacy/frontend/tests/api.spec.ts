import { test, expect } from "@playwright/test";
import type { Route } from "@playwright/test";
function fixture(now = Date.now()) {
  return [
    {
      id: 101,
      lineCode: "line-2",
      capOk: false,
      labelOk: false,
      liquidLevelOk: false,
      overallResult: "FAIL",
      imagePath: "C:\\captures\\bottle.jpg",
      inspectedAt: new Date(now).toISOString().replace("Z", ""),
    },
  ];
}
test.beforeEach(async ({ page }) => {
  await page.route("**/actuator/health", (route) =>
    route.fulfill({ json: { status: "UP" } }),
  );
});
test("real Nivect routes recover from HTTP errors and expose exact failure checks", async ({
  page,
}) => {
  let failed = true;
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(request.url());
  });
  await page.route("**/api/v1/inspections/failures", (route) =>
    failed
      ? route.fulfill({ status: 503, json: { detail: "Unavailable" } })
      : route.fulfill({ json: fixture() }),
  );
  await page.goto("/monitoring");
  await expect(page.getByRole("alert")).toContainText("API 503");
  await expect(page.getByText("LIVE API MODE", { exact: true })).toBeVisible();
  await expect(page.getByText("DEMO MODE · SIMULATED DATA")).toHaveCount(0);
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByLabel("Select line").selectOption("line-2");
  await expect(page.locator(".decision-panel")).toContainText(
    "Multiple defects",
  );
  await expect(page.locator(".decision-panel")).not.toContainText("%94");
  await page.getByRole("button", { name: "Open inspection details" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "C:\\captures\\bottle.jpg",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Cap defect · Label defect · Fill level defect",
  );
  await expect(
    page.getByRole("button", { name: "Save review" }),
  ).toBeDisabled();
  expect(writes).toEqual([]);
});
test("failure-only coverage never implies total production, 100 percent defects or camera FPS", async ({
  page,
}) => {
  await page.route("**/api/v1/inspections/failures", (route) =>
    route.fulfill({ json: fixture() }),
  );
  await page.goto("/");
  await expect(page.locator(".metric-value").nth(0)).toContainText("—");
  await expect(page.locator(".metric-value").nth(1)).toContainText("1");
  await expect(page.locator(".metric-value").nth(2)).toContainText("—");
  await expect(page.locator(".metric-value").nth(3)).toContainText("—");
  await expect(page.locator(".quality-ring")).toContainText(
    "Total unavailable",
  );
  await expect(page.locator(".health-headline")).toContainText("UP");
  await expect(page.getByText("0/0 active", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Failure records by line" }),
  ).toBeVisible();
  await expect(page.locator(".distribution")).toContainText("Cap defect");
  await expect(page.locator(".distribution")).toContainText("Label defect");
  await expect(page.locator(".distribution")).toContainText(
    "Fill level defect",
  );
});
test("empty failures mean no recent FAIL records and do not fabricate camera records", async ({
  page,
}) => {
  await page.route("**/api/v1/inspections/failures", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/stations");
  await expect(page.getByText("No station records")).toBeVisible();
  await expect(page.getByText(/camera, or heartbeat endpoint/)).toBeVisible();
  await page.goto("/monitoring");
  await expect(page.getByText("No inspection image")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause view", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("PRODUCT DETECTED")).toHaveCount(0);
});
test("data freshness ages while a subsequent request is pending", async ({
  page,
}) => {
  const now = Date.now();
  await page.clock.install({ time: new Date(now) });
  let count = 0;
  const held: Route[] = [];
  await page.route("**/api/v1/inspections/failures", async (route) => {
    count++;
    if (count > 1) {
      held.push(route);
      return;
    }
    await route.fulfill({ json: fixture(now) });
  });
  await page.goto("/");
  await expect(
    page.getByText("Data up to date", { exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(17000);
  await expect(
    page.locator(".page-heading").getByText("Data delayed", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".health-headline")).toContainText("Data delayed");
  await expect(page.locator(".health-headline .badge.success")).toHaveCount(0);
  await Promise.all(held.map((route) => route.abort()));
});
test("invalid failure records surface a schema error and never load a synthetic snapshot endpoint", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.route("**/api/v1/inspections/failures", (route) =>
    route.fulfill({ json: [{ id: "bad" }] }),
  );
  await page.goto("/history");
  await expect(page.getByRole("alert")).toContainText("expected data contract");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  expect(requests.some((url) => url.includes("/snapshot"))).toBe(false);
});
test("individual defect filters and search retain multi-defect records", async ({
  page,
}) => {
  await page.route("**/api/v1/inspections/failures", (route) =>
    route.fulfill({ json: fixture() }),
  );
  await page.goto("/history");
  for (const category of ["Cap defect", "Label defect", "Fill level defect"]) {
    await page
      .getByLabel("Defect type", { exact: true })
      .selectOption(category);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody")).toContainText("NIV-101");
  }
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByLabel("Search events or products").fill("CAP DEFECT");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByLabel("Defect type", { exact: true })
    .selectOption("Underfill");
  await expect(page.getByText("No records found")).toBeVisible();
});
test("untrusted API text stays inert and server image paths are never fetched", async ({
  page,
}) => {
  const payload = fixture();
  payload[0].lineCode = "<img src=x onerror=alert(1)>";
  payload[0].imagePath = "https://example.invalid/private-image.jpg";
  const dialogs: string[] = [];
  const unexpected: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  page.on("request", (request) => {
    if (
      request.url().includes("example.invalid") ||
      request.url().endsWith("/x")
    )
      unexpected.push(request.url());
  });
  await page.route("**/api/v1/inspections/failures", (route) =>
    route.fulfill({ json: payload }),
  );
  await page.goto("/history");
  await expect(page.locator("tbody")).toContainText(payload[0].lineCode);
  await expect(page.locator("tbody img")).toHaveCount(0);
  await page.getByRole("button", { name: "NIV-101", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(payload[0].imagePath);
  await expect(page.getByRole("dialog").locator("img")).toHaveCount(0);
  expect(dialogs).toEqual([]);
  expect(unexpected).toEqual([]);
});
test("unknown backend health is not rendered as UP while failure data remains usable", async ({
  page,
}) => {
  await page.route("**/actuator/health", (route) =>
    route.fulfill({ status: 503, json: { status: "DOWN" } }),
  );
  await page.route("**/api/v1/inspections/failures", (route) =>
    route.fulfill({ json: fixture() }),
  );
  await page.goto("/");
  await expect(page.locator(".health-headline")).toContainText("DOWN");
  await expect(page.locator(".metric-value").nth(1)).toContainText("1");
});

test("same-origin Vite proxy reads the confirmed contract over HTTP without CORS changes", async ({
  page,
}) => {
  await page.unroute("**/actuator/health");
  const paths: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/") || request.url().includes("/actuator/"))
      paths.push(request.url());
  });
  const received = page.waitForResponse("**/api/v1/inspections/failures");
  await page.goto("/history");
  expect((await received).headers()["cache-control"]).toBe("no-store");
  await expect(
    page.getByRole("button", { name: "NIV-321", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody")).toContainText("line-proxy");
  expect(paths.every((url) => url.startsWith("http://127.0.0.1:5198/"))).toBe(
    true,
  );
  await page.screenshot({
    path: "test-results/nivect-api-history.png",
    fullPage: true,
  });
});
import AxeBuilder from "@axe-core/playwright";
test("Nivect read-only screens stay accessible on desktop and mobile", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.route("**/api/v1/inspections/failures", (route) =>
    route.fulfill({ json: fixture() }),
  );
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1080 });
    for (const path of [
      "/",
      "/monitoring",
      "/history",
      "/stations",
      "/reports",
      "/settings",
    ]) {
      await page.goto(path);
      await expect(page.getByText("Loading inspection data…")).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}`,
      ).toBe(true);
      if (width === 1440) {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          result.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
          path,
        ).toEqual([]);
      }
      if (path === "/" && (width === 1440 || width === 390))
        await page.screenshot({
          path: `test-results/nivect-api-${width}.png`,
          fullPage: true,
        });
    }
  }
});
