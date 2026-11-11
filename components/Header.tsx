"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteContent } from "@/lib/content";
import { getDictionary } from "@/lib/dictionary";
import { alternatePath, htmlLang, localePath, splitLocale, type Locale } from "@/lib/i18n";

const navPaths = [
  { path: "/", key: "home" },
  { path: "/menu/", key: "menu" },
  { path: "/about/", key: "about" },
  { path: "/reserve/", key: "reserve" },
] as const;

function isCurrent(navPath: string, path: string): boolean {
  return navPath === "/" ? path === "/" : path.startsWith(navPath);
}

export default function Header() {
  const pathname = usePathname() ?? "/";
  const { locale, path } = splitLocale(pathname);
  const d = getDictionary(locale);
  const other: Locale = locale === "en" ? "zh-tw" : "en";
  const showSwitch = !path.startsWith("/admin/");

  return (
    <header className="sticky top-0 z-20 border-b border-espresso/10 bg-cream">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4 py-2">
        <Link
          href={localePath(locale, "/")}
          className="inline-flex min-h-11 items-center font-display text-2xl font-bold text-espresso"
        >
          {siteContent.name}
        </Link>
        {showSwitch && (
          <Link
            href={alternatePath(pathname, other)}
            hrefLang={htmlLang(other)}
            lang={htmlLang(other)}
            aria-label={d.langSwitch.aria}
            className="order-none inline-flex min-h-11 items-center rounded-full border border-espresso/30 px-3 text-sm font-semibold text-espresso hover:bg-espresso/5 sm:order-last"
          >
            {d.langSwitch.label}
          </Link>
        )}
        <nav aria-label={d.nav.label} className="-mx-2 w-full sm:mx-0 sm:w-auto">
          <ul className="flex justify-between sm:gap-1">
            {navPaths.map((item) => {
              const current = isCurrent(item.path, path);
              return (
                <li key={item.path}>
                  <Link
                    href={localePath(locale, item.path)}
                    aria-current={current ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full px-3 font-medium hover:bg-espresso/5 ${
                      current ? "text-espresso underline decoration-caramel decoration-2 underline-offset-8" : "text-ink"
                    }`}
                  >
                    {d.nav[item.key]}
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
