import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "../i18n";

function Example() {
  const { language, setLanguage, t } = useLanguage();
  return <><span>{t("Overview")}</span><button onClick={() => setLanguage(language === "tr" ? "en" : "tr")}>Switch</button></>;
}
afterEach(() => localStorage.removeItem("visionqc.language"));
describe("language preference", () => {
  it("starts in Turkish, switches to English and persists across remounts", async () => {
    localStorage.removeItem("visionqc.language");
    const view = render(<LanguageProvider><Example /></LanguageProvider>);
    expect(screen.getByText("Genel Bakış")).toBeVisible();
    expect(document.documentElement.lang).toBe("tr");
    fireEvent.click(screen.getByText("Switch"));
    expect(screen.getByText("Overview")).toBeVisible();
    expect(document.documentElement.lang).toBe("en");
    await waitFor(() => expect(localStorage.getItem("visionqc.language")).toBe("en"));
    view.unmount();
    render(<LanguageProvider><Example /></LanguageProvider>);
    expect(screen.getByText("Overview")).toBeVisible();
  });
});
