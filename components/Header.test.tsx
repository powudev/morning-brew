// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import Header from "@/components/Header";

const mainNav = () => screen.getByRole("navigation", { name: /Main menu|主選單/ });

describe("Header(英文)", () => {
  beforeEach(() => {
    pathname.value = "/";
  });

  it("英文選單連結不加語系前綴,目前頁面標示 aria-current", () => {
    pathname.value = "/menu/";
    render(<Header />);
    const nav = mainNav();
    expect(nav).toHaveAccessibleName("Main menu");
    const current = nav.querySelector('[aria-current="page"]');
    expect(current?.textContent).toBe("Menu");
    expect(current).toHaveAttribute("href", "/menu/");
  });

  it("首頁只在 / 時標示", () => {
    pathname.value = "/about/";
    render(<Header />);
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
  });

  it("語言切換器連到同一頁的繁中版", () => {
    pathname.value = "/menu/";
    render(<Header />);
    const link = screen.getByRole("link", { name: "繁體中文版本" });
    expect(link).toHaveAttribute("href", "/zh-tw/menu/");
    expect(link).toHaveAttribute("hreflang", "zh-Hant-TW");
    expect(link).toHaveAttribute("lang", "zh-Hant-TW");
    expect(link).toHaveTextContent("中文");
  });
});

describe("Header(繁中)", () => {
  it("中文選單連結加 /zh-tw 前綴,子頁面標示所屬選單", () => {
    pathname.value = "/zh-tw/reserve/done/";
    render(<Header />);
    expect(mainNav()).toHaveAccessibleName("主選單");
    const reserve = screen.getByRole("link", { name: "線上訂位" });
    expect(reserve).toHaveAttribute("aria-current", "page");
    expect(reserve).toHaveAttribute("href", "/zh-tw/reserve/");
    expect(screen.getByRole("link", { name: "首頁" })).toHaveAttribute("href", "/zh-tw/");
  });

  it("中文首頁標示首頁", () => {
    pathname.value = "/zh-tw/";
    render(<Header />);
    expect(screen.getByRole("link", { name: "首頁" })).toHaveAttribute("aria-current", "page");
  });

  it("語言切換器連到同一頁的英文版", () => {
    pathname.value = "/zh-tw/menu/";
    render(<Header />);
    const link = screen.getByRole("link", { name: "English version" });
    expect(link).toHaveAttribute("href", "/menu/");
    expect(link).toHaveAttribute("hreflang", "en");
  });
});

describe("Header(後台)", () => {
  it("後台沒有中文版,不顯示語言切換器", () => {
    pathname.value = "/admin/";
    render(<Header />);
    expect(screen.queryByRole("link", { name: "繁體中文版本" })).toBeNull();
  });
});
