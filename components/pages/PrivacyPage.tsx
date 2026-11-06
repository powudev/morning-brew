import PageHeader from "@/components/PageHeader";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export function privacyMetadata(locale: Locale) {
  const t = getDictionary(locale).privacy;
  return pageMetadata({ locale, path: "/privacy/", title: t.metaTitle, description: t.metaDescription });
}

export default function PrivacyPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).privacy;
  return (
    <>
      <PageHeader title={t.title} lead={t.lead} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        {t.items.map((item) => (
          <section key={item.title} className="mt-8 first:mt-0">
            <h2 className="text-xl font-bold text-espresso">{item.title}</h2>
            <p className="mt-2 leading-relaxed">{item.text}</p>
          </section>
        ))}
      </div>
    </>
  );
}
