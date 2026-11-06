import type { Metadata } from "next";
import { siteContent, siteUrl } from "@/lib/content";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

export function rootMetadata(locale: Locale): Metadata {
  const d = getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: d.meta.defaultTitle, template: `%s | ${siteContent.name}` },
    description: siteContent.description[locale],
    openGraph: { siteName: siteContent.name },
  };
}
