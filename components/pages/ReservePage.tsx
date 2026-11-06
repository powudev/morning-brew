import PageHeader from "@/components/PageHeader";
import ReservationForm from "@/components/ReservationForm";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export function reserveMetadata(locale: Locale) {
  const t = getDictionary(locale).reserve;
  return pageMetadata({ locale, path: "/reserve/", title: t.metaTitle, description: t.metaDescription });
}

export default function ReservePage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).reserve;
  return (
    <>
      <PageHeader title={t.title} lead={t.lead} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ReservationForm locale={locale} />
      </div>
    </>
  );
}
