import Link from "next/link";
import { siteContent } from "@/lib/content";

export default function Footer() {
  const { name, address, phone, hours } = siteContent;
  return (
    <footer className="mt-auto bg-espresso text-cream">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-xl font-bold">{name}</p>
          <p className="mt-2 text-sm">
            {address.city}
            {address.district}
            {address.street}
          </p>
          <p className="text-sm">電話 {phone}(示範號碼)</p>
        </div>
        <div>
          <p className="font-semibold">營業時間</p>
          <ul className="mt-2 text-sm">
            {hours.map((h) => (
              <li key={h.label}>
                {h.label} {h.open}–{h.close}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <Link href="/privacy/" className="underline">
            隱私權聲明
          </Link>
          <p className="mt-2">Demo project / fictional business</p>
        </div>
      </div>
    </footer>
  );
}
