// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import Header from "@/components/Header";

describe("Header", () => {
  beforeEach(() => {
    pathname.value = "/";
  });

  it("目前頁面的選單項目標示 aria-current", () => {
    pathname.value = "/menu/";
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: "主選單" });
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe("菜單");
  });

  it("子頁面也標示所屬選單(/reserve/done/ → 線上訂位)", () => {
    pathname.value = "/reserve/done/";
    render(<Header />);
    expect(screen.getByRole("link", { name: "線上訂位" })).toHaveAttribute("aria-current", "page");
  });

  it("首頁只在 / 時標示,不會在每頁都標", () => {
    pathname.value = "/about/";
    render(<Header />);
    expect(screen.getByRole("link", { name: "首頁" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "關於我們" })).toHaveAttribute("aria-current", "page");
  });
});
