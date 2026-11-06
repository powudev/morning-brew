import { siteContent } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

export default function DemoBanner({ locale }: { locale: Locale }) {
  return (
    <div role="note" className="bg-espresso px-4 py-2 text-center text-sm text-cream">
      {siteContent.demoNotice[locale]}
    </div>
  );
}
