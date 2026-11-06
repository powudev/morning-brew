import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { primaryCta } from "@/components/pages/HomePage";
import { getDictionary } from "@/lib/dictionary";
import { localePath, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export function doneMetadata(locale: Locale) {
  const t = getDictionary(locale).done;
  return pageMetadata({ locale, path: "/reserve/done/", title: t.metaTitle, description: t.lead, noindex: true });
}

export default function DonePage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).done;
  return (
    <>
      <PageHeader title={t.title} lead={t.lead} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href={localePath(locale, "/")} data-cta className={primaryCta}>
          {t.home}
        </Link>
      </div>
    </>
  );
}
