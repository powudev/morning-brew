import Link from "next/link";
import { BeanIcon, CalendarIcon, CoffeeCupIllustration, CroissantIcon } from "@/components/Illustrations";
import MapEmbed from "@/components/MapEmbed";
import Section from "@/components/Section";
import { featuredItems, reviewsContent, siteContent } from "@/lib/content";
import { getDictionary, interpolate } from "@/lib/dictionary";
import { formatAddress, formatPrice, formatTimeRange, telHref } from "@/lib/format";
import { localePath, type Locale } from "@/lib/i18n";
import { cafeJsonLd, serializeJsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/seo";

const icons = [BeanIcon, CroissantIcon, CalendarIcon];

export const primaryCta =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-espresso px-6 font-semibold text-cream hover:bg-espresso/90";
export const secondaryCta =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-espresso px-6 font-semibold text-espresso hover:bg-espresso/5";

export function homeMetadata(locale: Locale) {
  return pageMetadata({
    locale,
    path: "/",
    title: getDictionary(locale).home.metaTitle,
    description: siteContent.description[locale],
  });
}

export default function HomePage({ locale }: { locale: Locale }) {
  const { name, tagline, intro, phone, hours } = siteContent;
  const t = getDictionary(locale).home;
  const href = (path: string) => localePath(locale, path);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(cafeJsonLd(locale)) }} />

      <section aria-labelledby="hero-title" className="overflow-hidden bg-latte/60">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <h1 id="hero-title" className="font-display text-5xl font-bold text-espresso sm:text-6xl">
              {name}
            </h1>
            <p className="mt-4 text-xl leading-relaxed">{tagline[locale]}</p>
            <p className="mt-2 leading-relaxed text-ink/80">{intro[locale]}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href("/reserve/")} data-cta className={primaryCta}>
                {t.ctaReserve}
              </Link>
              <Link href={href("/menu/")} data-cta className={secondaryCta}>
                {t.ctaMenu}
              </Link>
            </div>
          </div>
          <CoffeeCupIllustration className="mx-auto w-48 sm:w-64 md:w-full md:max-w-sm" />
        </div>
      </section>

      <Section id="features" title={t.featuresTitle}>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {t.features.map(({ title, text }, i) => {
            const Icon = icons[i];
            return (
              <li key={title} className="rounded-2xl bg-foam p-6 shadow-sm ring-1 ring-espresso/10">
                <Icon />
                <h3 className="mt-4 text-xl font-bold text-espresso">{title}</h3>
                <p className="mt-2 leading-relaxed">{text}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section id="featured" title={t.featuredTitle} className="bg-foam">
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredItems().map((item) => (
            <li key={item.id} className="flex flex-col rounded-2xl bg-cream p-5 ring-1 ring-espresso/10">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-bold text-espresso">{item.name[locale]}</h3>
                <span className="shrink-0 font-semibold">{formatPrice(item.price)}</span>
              </div>
              {locale !== "en" && (
                <p lang="en" className="text-sm text-ink/75">
                  {item.name.en}
                </p>
              )}
              <p className="mt-2 leading-relaxed">{item.description[locale]}</p>
            </li>
          ))}
        </ul>
        <Link href={href("/menu/")} data-cta className={`mt-8 ${secondaryCta}`}>
          {t.fullMenu}
        </Link>
      </Section>

      <Section id="visit" title={t.visitTitle}>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <table className="w-full text-left">
              <caption className="sr-only">{t.hoursCaption}</caption>
              <tbody>
                {hours.map((h) => (
                  <tr key={h.label.en} className="border-b border-espresso/15">
                    <th scope="row" className="py-3 pr-4 font-semibold">
                      {h.label[locale]}
                    </th>
                    <td className="py-3">{formatTimeRange(h.open, h.close)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-6 space-y-3">
              <div>
                <dt className="font-semibold">{t.address}</dt>
                <dd>{formatAddress(locale)}</dd>
              </div>
              <div>
                <dt className="font-semibold">{t.phone}</dt>
                <dd>
                  <a href={telHref(phone)} className="inline-flex min-h-11 items-center underline underline-offset-4">
                    {phone}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
          <MapEmbed locale={locale} />
        </div>
      </Section>

      <Section id="reviews" title={t.reviewsTitle} className="bg-foam">
        <p className="mt-2 text-sm text-ink/80">{reviewsContent.notice[locale]}</p>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {reviewsContent.items.map((r) => (
            <li key={r.author.en} className="rounded-2xl bg-cream p-6 ring-1 ring-espresso/10">
              <figure>
                <p className="text-espresso">
                  <span className="sr-only">{interpolate(t.rating, { rating: r.rating })}</span>
                  <span aria-hidden="true">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                </p>
                <blockquote className="mt-3 leading-relaxed">{r.text[locale]}</blockquote>
                <figcaption className="mt-3 text-sm font-semibold">— {r.author[locale]}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Section>

      <section aria-labelledby="cta-title" className="bg-espresso text-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="cta-title" className="font-display text-3xl font-bold sm:text-4xl">
              {t.ctaTitle}
            </h2>
            <p className="mt-3 text-cream/90">{t.ctaText}</p>
          </div>
          <Link
            href={href("/reserve/")}
            data-cta
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-caramel px-6 font-semibold text-espresso hover:bg-caramel/90"
          >
            {t.ctaReserve}
          </Link>
        </div>
      </section>
    </>
  );
}
