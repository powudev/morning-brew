"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteContent } from "@/lib/content";

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/menu/", label: "菜單" },
  { href: "/about/", label: "關於我們" },
  { href: "/reserve/", label: "線上訂位" },
];

const withSlash = (path: string) => (path.endsWith("/") ? path : `${path}/`);

function isCurrent(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return withSlash(pathname).startsWith(href);
}

export default function Header() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-20 border-b border-espresso/10 bg-cream">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4 py-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-display text-2xl font-bold text-espresso"
        >
          {siteContent.name}
        </Link>
        <nav aria-label="主選單" className="-mx-2 w-full sm:mx-0 sm:w-auto">
          <ul className="flex justify-between sm:gap-1">
            {navItems.map((item) => {
              const current = isCurrent(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full px-3 font-medium hover:bg-espresso/5 ${
                      current ? "text-espresso underline decoration-caramel decoration-2 underline-offset-8" : "text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
