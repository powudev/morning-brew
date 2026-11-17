"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/", label: "Reservations" },
  { href: "/admin/slots/", label: "Time slots" },
];

export default function StaffBar({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-espresso/10 pb-4">
      <nav aria-label="Staff">
        <ul className="flex flex-wrap gap-2">
          {links.map((l) => {
            const current = pathname === l.href || pathname === l.href.replace(/\/$/, "");
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 font-semibold ${
                    current ? "bg-espresso text-cream" : "border border-espresso/30 hover:bg-espresso/5"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-ink/80">{email}</span>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex min-h-11 items-center rounded-full border border-espresso/30 px-4 font-semibold hover:bg-espresso/5"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
