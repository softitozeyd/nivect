import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(new URL("../../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const screenshotDir =
  process.env.NIVECT_SCREENSHOTS || "/workspace/.nivect-setup";
async function login(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Operasyon paneli" }).click();
  await page
    .getByLabel("Parola", { exact: true })
    .fill(env.QC_OPERATOR_PASSWORD);
  await page.getByRole("button", { name: "Çalışma alanına gir" }).click();
  await expect(
    page.getByRole("heading", { name: "Üretime bir bakış." }),
  ).toBeVisible();
}
test("landing reference layout, FAQ and mobile navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Her şişede. Aynı özen." }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".hero-film")
        .evaluate((v) => v.readyState >= 2 && !v.paused),
    )
    .toBeTruthy();
  await page
    .getByRole("button", { name: "Videoları duraklat", exact: true })
    .click();
  await expect
    .poll(() => page.locator(".hero-film").evaluate((v) => v.paused))
    .toBeTruthy();
  await page
    .getByRole("button", { name: "Videoları oynat", exact: true })
    .click();
  await expect
    .poll(() => page.locator(".hero-film").evaluate((v) => !v.paused))
    .toBeTruthy();
  await page.screenshot({ path: screenshotDir + "/landing-desktop.png" });
  await page
    .getByRole("link", { name: "Merak edilenler", exact: true })
    .click();
  const question = page.getByRole("button", {
    name: "PC kameramla başlayabilir miyim?",
  });
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("Evet. Operasyon panelinde Kamera"),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForTimeout(1500);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: screenshotDir + "/landing-mobile.png" });
});
test("operator session, real records, CSV, simulated webcam preview, model-not-ready and logout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await expect(
    page.getByText("Görüntüye hazır. Modelinizi bekliyor."),
  ).toBeVisible();
  await page.screenshot({ path: screenshotDir + "/workspace-desktop.png" });
  await page.getByRole("button", { name: "Manuel test", exact: true }).click();
  const line = "ui-" + Date.now();
  await page.getByLabel("Hat kodu").fill(line);
  await page.getByLabel("Düşük dolum", { exact: true }).check();
  await page.getByRole("button", { name: "Test kaydını oluştur" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("cell", { name: line + " manual" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /olay detayı/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "İnceleme detayı" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("nivect-inspections.csv");
  await page.getByRole("button", { name: "Kamera", exact: true }).click();
  await page
    .getByRole("button", { name: "Kamerayı aç", exact: true })
    .first()
    .click();
  await expect(page.getByText("Önizleme açık", { exact: true })).toBeVisible();
  await expect(page.locator("video")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kaydı başlat" }),
  ).toBeDisabled();
  await page.screenshot({ path: screenshotDir + "/camera-preview.png" });
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page.getByRole("button", { name: "Genel bakış", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await expect
    .poll(() =>
      page
        .locator(".sidebar")
        .evaluate((e) => Math.round(e.getBoundingClientRect().right)),
    )
    .toBeLessThanOrEqual(0);
  await page.screenshot({ path: screenshotDir + "/workspace-mobile.png" });
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page.getByRole("button", { name: "Güvenli çıkış" }).click();
  await expect(
    page.getByRole("heading", { name: "Yeniden hoş geldiniz." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("reduced motion uses a poster until the user explicitly plays footage", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Videoları oynat", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".hero-film")).not.toHaveAttribute("src");
  expect(
    await page.locator(".hero-film").evaluate((v) => v.paused),
  ).toBeTruthy();
});

test("reference controls morph without layout shifts and preserve native semantics", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const action = page.getByRole("button", {
    name: "Nivect’i keşfet",
    exact: true,
  });
  const orb = action.locator(".action-orb");
  await expect(orb).toHaveCSS("background-color", "rgb(182, 198, 157)");
  await expect(orb).toHaveCSS("color", "rgb(38, 60, 43)");
  await expect(orb).toHaveCSS("border-radius", "50%");
  const before = await action.boundingBox();
  await action.hover();
  await expect(orb).toHaveCSS("border-radius", "0px");
  const after = await action.boundingBox();
  expect(Math.abs(before.width - after.width)).toBeLessThan(1);
  expect(Math.abs(before.height - after.height)).toBeLessThan(1);
  await action.screenshot({ path: screenshotDir + "/button-hover.png" });
  await page.mouse.move(0, 0);
  await expect(orb).toHaveCSS("border-radius", "50%");
  await action.screenshot({ path: screenshotDir + "/button-rest.png" });
  await action.focus();
  await expect(orb).toHaveCSS("border-radius", "0px");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await login(page);
  expect(
    await page
      .locator("button:not(.action):not(.brand-button):not(.nav-scrim)")
      .count(),
  ).toBe(0);
  expect(
    await page
      .locator("select")
      .evaluateAll((elements) =>
        elements.every((e) => e.closest(".select-control")),
      ),
  ).toBeTruthy();
  await page.getByLabel("Kayıt kaynağı").selectOption("MANUAL");
  await expect(page.getByLabel("Kayıt kaynağı")).toHaveValue("MANUAL");
  await expect(page.getByLabel("Sonuç filtresi")).toHaveCSS(
    "color",
    "rgb(241, 240, 230)",
  );
  await expect(page.locator(".sidebar .selected .action-label")).toHaveCSS(
    "color",
    "rgb(241, 240, 230)",
  );
  await page.getByRole("button", { name: "Manuel test", exact: true }).click();
  await expect(page.getByLabel("Düşük dolum", { exact: true })).toHaveCSS(
    "accent-color",
    "rgb(182, 198, 157)",
  );
  const checkbox = page.getByLabel("Düşük dolum", { exact: true });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toHaveCSS("border-radius", "0px");
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  const range = page.getByRole("slider");
  await range.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(range).toHaveValue("0.89");
});
