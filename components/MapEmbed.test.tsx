// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MapEmbed from "@/components/MapEmbed";

describe("MapEmbed", () => {
  it("一開始不載入第三方 iframe,只顯示載入按鈕", () => {
    const { container } = render(<MapEmbed />);
    expect(screen.getByRole("button", { name: "載入地圖" })).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("按下按鈕後載入 OpenStreetMap iframe,且有 title", async () => {
    render(<MapEmbed />);
    await userEvent.click(screen.getByRole("button", { name: "載入地圖" }));
    const frame = screen.getByTitle("Morning Brew 示範地圖位置");
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.getAttribute("src")).toMatch(/^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?/);
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(screen.queryByRole("button", { name: "載入地圖" })).toBeNull();
  });

  it("不載入也提供外部地圖連結", () => {
    render(<MapEmbed />);
    const link = screen.getByRole("link", { name: /在 OpenStreetMap 開啟/ });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/www\.openstreetmap\.org\//);
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
