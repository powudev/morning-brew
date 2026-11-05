import Link from "next/link";
import { siteContent } from "@/lib/content";

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/menu/", label: "菜單" },
  { href: "/about/", label: "關於我們" },
  { href: "/reserve/", label: "線上訂位" },
];

export default function Header() {
  return (
    <header className="border-b border-espresso/10 bg-cream">
      <nav
        aria-label="主選單"
        className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4"
      >
        <Link href="/" className="font-display text-2xl font-bold text-espresso">
          {siteContent.name}
        </Link>
        <ul className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex min-h-11 items-center rounded px-3 text-ink hover:bg-espresso/5"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
