import Link from "next/link";
import { siteContent } from "@/lib/content";
import { formatTimeRange, telHref } from "@/lib/format";

export default function Footer() {
  const { name, address, phone, hours } = siteContent;
  return (
    <footer className="bg-espresso text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-bold">{name}</p>
          <p className="mt-3 text-sm leading-relaxed">
            {address.city}
            {address.district}
            {address.street}
          </p>
          <a href={telHref(phone)} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
            {phone}
          </a>
        </div>
        <div>
          <p className="font-semibold">營業時間</p>
          <ul className="mt-3 space-y-1 text-sm">
            {hours.map((h) => (
              <li key={h.label}>
                {h.label} {formatTimeRange(h.open, h.close)}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <ul>
            <li>
              <Link href="/reserve/" className="inline-flex min-h-11 items-center underline underline-offset-4">
                線上訂位
              </Link>
            </li>
            <li>
              <Link href="/privacy/" className="inline-flex min-h-11 items-center underline underline-offset-4">
                隱私權聲明
              </Link>
            </li>
          </ul>
          <p className="mt-3 text-cream/85">Demo project / fictional business</p>
        </div>
      </div>
    </footer>
  );
}
