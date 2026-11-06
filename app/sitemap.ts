import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/content";
import { htmlLang, localePath, locales } from "@/lib/i18n";

export const dynamic = "force-static";

const paths = ["/", "/menu/", "/about/", "/reserve/", "/privacy/"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) => {
    const languages = Object.fromEntries(locales.map((l) => [htmlLang(l), `${siteUrl}${localePath(l, path)}`]));
    return locales.map((locale) => ({
      url: `${siteUrl}${localePath(locale, path)}`,
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: { languages },
    }));
  });
}
