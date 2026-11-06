import DemoBanner from "@/components/DemoBanner";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

// 兩個語系根 layout 共用的 <body> 內容
export default function SiteShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded bg-espresso px-4 py-3 text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {getDictionary(locale).skipLink}
      </a>
      <DemoBanner locale={locale} />
      <Header />
      {/* tabIndex=-1:skip link 跳轉後焦點落在 main */}
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer locale={locale} />
    </>
  );
}
