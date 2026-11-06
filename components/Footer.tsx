import Link from "next/link";
import { siteContent } from "@/lib/content";
import { getDictionary } from "@/lib/dictionary";
import { formatAddress, formatTimeRange, telHref } from "@/lib/format";
import { localePath, type Locale } from "@/lib/i18n";

export default function Footer({ locale }: { locale: Locale }) {
  const { name, phone, hours, demoNotice } = siteContent;
  const d = getDictionary(locale).footer;
  return (
    <footer className="bg-espresso text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-bold">{name}</p>
          <p className="mt-3 text-sm leading-relaxed">{formatAddress(locale)}</p>
          <a href={telHref(phone)} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
            {phone}
          </a>
        </div>
        <div>
          <p className="font-semibold">{d.hours}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {hours.map((h) => (
              <li key={h.label.en}>
                {h.label[locale]} {formatTimeRange(h.open, h.close)}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <ul>
            <li>
              <Link href={localePath(locale, "/reserve/")} className="inline-flex min-h-11 items-center underline underline-offset-4">
                {d.reserve}
              </Link>
            </li>
            <li>
              <Link href={localePath(locale, "/privacy/")} className="inline-flex min-h-11 items-center underline underline-offset-4">
                {d.privacy}
              </Link>
            </li>
          </ul>
          <p className="mt-3 text-cream/85">{demoNotice[locale]}</p>
        </div>
      </div>
    </footer>
  );
}
