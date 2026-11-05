import Link from "next/link";
import { cafeJsonLd, serializeJsonLd } from "@/lib/json-ld";
import { featuredItems, reviewsContent, siteContent } from "@/lib/content";

// Day-3 補上 Hero 圖、特色卡、地圖與完整樣式
export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(cafeJsonLd()) }}
      />
      <section aria-labelledby="hero-title">
        <h1 id="hero-title" className="font-display text-4xl font-bold text-espresso">
          {siteContent.name}
        </h1>
        <p className="mt-3 text-lg">{siteContent.tagline}</p>
        <Link
          href="/reserve/"
          className="mt-6 inline-flex min-h-11 items-center rounded bg-espresso px-5 text-cream"
        >
          線上訂位
        </Link>
      </section>

      <section aria-labelledby="featured-title" className="mt-12">
        <h2 id="featured-title" className="font-display text-2xl font-bold">
          精選菜單
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {featuredItems().map((item) => (
            <li key={item.id}>
              {item.name}({item.nameEn})NT${item.price}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="hours-title" className="mt-12">
        <h2 id="hours-title" className="font-display text-2xl font-bold">
          營業時間
        </h2>
        <ul className="mt-4">
          {siteContent.hours.map((h) => (
            <li key={h.label}>
              {h.label} {h.open}–{h.close}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="reviews-title" className="mt-12">
        <h2 id="reviews-title" className="font-display text-2xl font-bold">
          顧客評論
        </h2>
        <p className="mt-1 text-sm">{reviewsContent.notice}</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {reviewsContent.items.map((r) => (
            <li key={r.author}>
              <p>{r.text}</p>
              <p className="mt-1 text-sm">— {r.author}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
