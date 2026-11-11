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

  it("does not load the third-party iframe until asked; shows a load button", () => {
    const { container } = render(<MapEmbed locale={locale} />);
    expect(screen.getByRole("button", { name: d.load })).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("loads the OpenStreetMap iframe on click with a localized title", async () => {
    render(<MapEmbed locale={locale} />);
    await userEvent.click(screen.getByRole("button", { name: d.load }));
    const frame = screen.getByTitle(site.map.embedTitle[locale]);
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.getAttribute("src")).toMatch(/^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?/);
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(screen.queryByRole("button", { name: d.load })).toBeNull();
  });

  it("offers an external map link without loading the iframe", () => {
    render(<MapEmbed locale={locale} />);
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- fixed test strings, not user input
    const link = screen.getByRole("link", { name: new RegExp(d.openExternal) });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/www\.openstreetmap\.org\//);
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
