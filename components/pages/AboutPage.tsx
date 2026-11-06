import Link from "next/link";
import { CoffeeCupIllustration } from "@/components/Illustrations";
import PageHeader from "@/components/PageHeader";
import { primaryCta } from "@/components/pages/HomePage";
import { getDictionary } from "@/lib/dictionary";
import { localePath, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export function aboutMetadata(locale: Locale) {
  const t = getDictionary(locale).about;
  return pageMetadata({ locale, path: "/about/", title: t.metaTitle, description: t.metaDescription });
}

export default function AboutPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).about;
  return (
    <>
      <PageHeader title={t.title} lead={t.lead} />

      <section aria-labelledby="story-title" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
        <div>
          <h2 id="story-title" className="font-display text-3xl font-bold text-espresso">
            {t.storyTitle}
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed">
            {t.story.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
        <CoffeeCupIllustration className="mx-auto w-full max-w-xs" />
      </section>

      <section aria-labelledby="values-title" className="bg-foam py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="values-title" className="font-display text-3xl font-bold text-espresso">
            {t.valuesTitle}
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {t.values.map((v) => (
              <li key={v.title} className="rounded-2xl bg-cream p-6 ring-1 ring-espresso/10">
                <h3 className="text-xl font-bold text-espresso">{v.title}</h3>
                <p className="mt-2 leading-relaxed">{v.text}</p>
              </li>
            ))}
          </ul>
          <Link href={localePath(locale, "/reserve/")} data-cta className={`mt-10 ${primaryCta}`}>
            {t.cta}
          </Link>
        </div>
      </section>
    </>
  );
}
