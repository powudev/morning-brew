import SiteShell from "@/components/SiteShell";
import { inter, notoTc, playfair } from "@/lib/fonts";
import { htmlLang, type Locale } from "@/lib/i18n";

// 兩個語系根 layout 共用:<html lang> 依語系;中文字型只在繁中載入
export default function RootDocument({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const fonts = [inter.variable, playfair.variable, locale === "zh-tw" ? notoTc.variable : ""].join(" ");
  return (
    <html lang={htmlLang(locale)} className={`${fonts} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteShell locale={locale}>{children}</SiteShell>
      </body>
    </html>
  );
}
