import type { Metadata } from "next";
import { htmlLang, localePath, locales, type Locale } from "@/lib/i18n";

const ogLocale: Record<Locale, string> = { en: "en_US", "zh-tw": "zh_TW" };

/** 每頁 metadata:canonical + hreflang(兩語系 + x-default)+ Open Graph */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  noindex = false,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
}): Metadata {
  const url = localePath(locale, path);
  const languages: Record<string, string> = Object.fromEntries(
    locales.map((l) => [htmlLang(l), localePath(l, path)]),
  );
  languages["x-default"] = localePath("en", path);

  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: { type: "website", locale: ogLocale[locale], url, title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
