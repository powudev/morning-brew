import Link from "next/link";
import { BeanIcon, CalendarIcon, CoffeeCupIllustration, CroissantIcon } from "@/components/Illustrations";
import MapEmbed from "@/components/MapEmbed";
import Section from "@/components/Section";
import { featuredItems, reviewsContent, siteContent } from "@/lib/content";
import { formatPrice, formatTimeRange, telHref } from "@/lib/format";
import { cafeJsonLd, serializeJsonLd } from "@/lib/json-ld";

const features = [
  { title: "當日烘焙的咖啡豆", text: "小批次烘焙,讓每一杯都喝得到豆子最好的狀態。", Icon: BeanIcon },
  { title: "每天現烤的甜點", text: "可頌、司康與乳酪蛋糕,早上出爐、當天賣完。", Icon: CroissantIcon },
  { title: "線上訂位不用等", text: "週末也能先預約座位,到店直接入座。", Icon: CalendarIcon },
];

const primaryCta =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-espresso px-6 font-semibold text-cream hover:bg-espresso/90";
const secondaryCta =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-espresso px-6 font-semibold text-espresso hover:bg-espresso/5";

export default function HomePage() {
  const { name, tagline, address, phone, hours } = siteContent;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(cafeJsonLd()) }} />

      <section aria-labelledby="hero-title" className="overflow-hidden bg-latte/60">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <h1 id="hero-title" className="font-display text-5xl font-bold text-espresso sm:text-6xl">
              {name}
            </h1>
            <p className="mt-4 text-xl leading-relaxed">{tagline}</p>
            <p className="mt-2 leading-relaxed text-ink/80">社區裡的小咖啡店:手沖、義式咖啡與每日現烤甜點。</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/reserve/" data-cta className={primaryCta}>
                線上訂位
              </Link>
              <Link href="/menu/" data-cta className={secondaryCta}>
                看菜單
              </Link>
            </div>
          </div>
          <CoffeeCupIllustration className="mx-auto w-48 sm:w-64 md:w-full md:max-w-sm" />
        </div>
      </section>

      <Section id="features" title="我們的特色">
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {features.map(({ title, text, Icon }) => (
            <li key={title} className="rounded-2xl bg-foam p-6 shadow-sm ring-1 ring-espresso/10">
              <Icon />
              <h3 className="mt-4 text-xl font-bold text-espresso">{title}</h3>
              <p className="mt-2 leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="featured" title="精選菜單" className="bg-foam">
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredItems().map((item) => (
            <li key={item.id} className="flex flex-col rounded-2xl bg-cream p-5 ring-1 ring-espresso/10">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-bold text-espresso">{item.name}</h3>
                <span className="shrink-0 font-semibold">{formatPrice(item.price)}</span>
              </div>
              <p className="text-sm text-ink/75">{item.nameEn}</p>
              <p className="mt-2 leading-relaxed">{item.description}</p>
            </li>
          ))}
        </ul>
        <Link href="/menu/" data-cta className={`mt-8 ${secondaryCta}`}>
          看完整菜單
        </Link>
      </Section>

      <Section id="visit" title="營業時間與位置">
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <table className="w-full text-left">
              <caption className="sr-only">營業時間</caption>
              <tbody>
                {hours.map((h) => (
                  <tr key={h.label} className="border-b border-espresso/15">
                    <th scope="row" className="py-3 pr-4 font-semibold">
                      {h.label}
                    </th>
                    <td className="py-3">{formatTimeRange(h.open, h.close)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-6 space-y-3">
              <div>
                <dt className="font-semibold">地址</dt>
                <dd>
                  {address.city}
                  {address.district}
                  {address.street}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">電話(示範號碼)</dt>
                <dd>
                  <a href={telHref(phone)} className="inline-flex min-h-11 items-center underline underline-offset-4">
                    {phone}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
          <MapEmbed />
        </div>
      </Section>

      <Section id="reviews" title="顧客評論" className="bg-foam">
        <p className="mt-2 text-sm text-ink/80">{reviewsContent.notice}</p>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {reviewsContent.items.map((r) => (
            <li key={r.author} className="rounded-2xl bg-cream p-6 ring-1 ring-espresso/10">
              <figure>
                <p className="text-espresso">
                  <span className="sr-only">評分 {r.rating} / 5</span>
                  <span aria-hidden="true">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                </p>
                <blockquote className="mt-3 leading-relaxed">{r.text}</blockquote>
                <figcaption className="mt-3 text-sm font-semibold">— {r.author}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Section>

      <section aria-labelledby="cta-title" className="bg-espresso text-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="cta-title" className="font-display text-3xl font-bold sm:text-4xl">
              今天就來坐坐
            </h2>
            <p className="mt-3 text-cream/90">先訂好位子,到店就有一杯熱咖啡等你。</p>
          </div>
          <Link
            href="/reserve/"
            data-cta
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-caramel px-6 font-semibold text-espresso hover:bg-caramel/90"
          >
            線上訂位
          </Link>
        </div>
      </section>
    </>
  );
}
