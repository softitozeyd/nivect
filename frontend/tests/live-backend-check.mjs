/* global fetch */
import process from "node:process";
import console from "node:console";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");

async function main() {
  const origin = process.env.LIVE_API_URL || "http://127.0.0.1:5197";
  const response = await fetch(`${origin}/api/v1/inspections/failures`);
  if (!response.ok) throw new Error(`Failures API returned ${response.status}`);
  const records = await response.json();
  if (!Array.isArray(records)) throw new Error("Failures API did not return an array");
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => localStorage.setItem("visionqc.language", "en"));
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/history`, { waitUntil: "networkidle" });
    await page.getByText("LIVE API MODE", { exact: true }).waitFor();
    if ((await page.locator("body").innerText()).includes("DEMO MODE · SIMULATED DATA")) {
      throw new Error("Demo data shown in API mode");
    }
    if (records.length) {
      const id = `NIV-${records[0].id}`;
      await page.getByRole("button", { name: id, exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByText(records[0].inspectedAt, { exact: true }).waitFor();
      if (!(await dialog.getByLabel("Review outcome").isDisabled()) ||
          !(await dialog.getByLabel("Operator note").isDisabled())) {
        throw new Error("Live review controls are unexpectedly enabled");
      }
      console.log(`PASS API record ${id} and its details are visible`);
    } else {
      console.log("PASS Empty failure list; record detail was not checked");
    }
    for (const path of ["/", "/monitoring", "/history", "/stations", "/reports", "/settings"]) {
      await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
      await page.getByText("LIVE API MODE", { exact: true }).waitFor();
      if (errors.length) throw new Error(`Browser errors on ${path}: ${errors.join(", ")}`);
    }
    console.log("PASS Six routes use API mode without browser errors");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/history`, { waitUntil: "networkidle" });
    await page.getByText("LIVE API MODE", { exact: true }).waitFor();
    if (records.length) await page.getByText(`NIV-${records[0].id}`, { exact: true }).first().waitFor();
    console.log("PASS API mode renders on a mobile viewport");
    await page.route("**/api/v1/inspections/failures", (route) => route.abort());
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("alert").first().waitFor();
    if ((await page.locator("body").innerText()).includes("DEMO MODE · SIMULATED DATA")) {
      throw new Error("API failure fell back to demo data");
    }
    console.log("PASS API failure is shown without demo fallback");
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
