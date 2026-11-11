// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import Header from "@/components/Header";

const mainNav = () => screen.getByRole("navigation", { name: /Main menu|主選單/ });

describe("Header (English)", () => {
  beforeEach(() => {
    pathname.value = "/";
  });

  it("English nav links have no locale prefix and mark the current page with aria-current", () => {
    pathname.value = "/menu/";
    render(<Header />);
    const nav = mainNav();
    expect(nav).toHaveAccessibleName("Main menu");
    const current = nav.querySelector('[aria-current="page"]');
    expect(current?.textContent).toBe("Menu");
    expect(current).toHaveAttribute("href", "/menu/");
  });

  it("Home is marked current only on /", () => {
    pathname.value = "/about/";
    render(<Header />);
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
  });

  it("language switcher links to the same page in Traditional Chinese", () => {
    pathname.value = "/menu/";
    render(<Header />);
    const link = screen.getByRole("link", { name: "繁體中文版本" });
    expect(link).toHaveAttribute("href", "/zh-tw/menu/");
    expect(link).toHaveAttribute("hreflang", "zh-Hant-TW");
    expect(link).toHaveAttribute("lang", "zh-Hant-TW");
    expect(link).toHaveTextContent("中文");
  });
});

describe("Header (Traditional Chinese)", () => {
  it("Chinese nav links use the /zh-tw prefix and sub-pages mark their parent menu item", () => {
    pathname.value = "/zh-tw/reserve/done/";
    render(<Header />);
    expect(mainNav()).toHaveAccessibleName("主選單");
    const reserve = screen.getByRole("link", { name: "線上訂位" });
    expect(reserve).toHaveAttribute("aria-current", "page");
    expect(reserve).toHaveAttribute("href", "/zh-tw/reserve/");
    expect(screen.getByRole("link", { name: "首頁" })).toHaveAttribute("href", "/zh-tw/");
  });

  it("Chinese home page marks Home as current", () => {
    pathname.value = "/zh-tw/";
    render(<Header />);
    expect(screen.getByRole("link", { name: "首頁" })).toHaveAttribute("aria-current", "page");
  });

  it("language switcher links to the same page in English", () => {
    pathname.value = "/zh-tw/menu/";
    render(<Header />);
    const link = screen.getByRole("link", { name: "English version" });
    expect(link).toHaveAttribute("href", "/menu/");
    expect(link).toHaveAttribute("hreflang", "en");
  });
});

describe("Header (staff area)", () => {
  it("staff area has no Chinese version, so no language switcher", () => {
    pathname.value = "/admin/";
    render(<Header />);
    expect(screen.queryByRole("link", { name: "繁體中文版本" })).toBeNull();
  });
});
