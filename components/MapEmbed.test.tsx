// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import site from "@/content/site.json";
import MapEmbed from "@/components/MapEmbed";
import { getDictionary } from "@/lib/dictionary";
import { locales } from "@/lib/i18n";

describe.each(locales)("MapEmbed(%s)", (locale) => {
  const d = getDictionary(locale).map;

  it("一開始不載入第三方 iframe,只顯示載入按鈕", () => {
    const { container } = render(<MapEmbed locale={locale} />);
    expect(screen.getByRole("button", { name: d.load })).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("按下按鈕後載入 OpenStreetMap iframe,且有該語系的 title", async () => {
    render(<MapEmbed locale={locale} />);
    await userEvent.click(screen.getByRole("button", { name: d.load }));
    const frame = screen.getByTitle(site.map.embedTitle[locale]);
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.getAttribute("src")).toMatch(/^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?/);
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(screen.queryByRole("button", { name: d.load })).toBeNull();
  });

  it("不載入也提供外部地圖連結", () => {
    render(<MapEmbed locale={locale} />);
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- 測試內固定字串,非使用者輸入
    const link = screen.getByRole("link", { name: new RegExp(d.openExternal) });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/www\.openstreetmap\.org\//);
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
