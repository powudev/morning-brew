export const locales = ["en", "zh-tw"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

const prefix: Record<Locale, string> = { en: "", "zh-tw": "/zh-tw" };
const bcp47: Record<Locale, string> = { en: "en", "zh-tw": "zh-Hant-TW" };

export type Localized<T> = Record<Locale, T>;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function htmlLang(locale: Locale): string {
  return bcp47[locale];
}

const withSlash = (path: string) => (path.endsWith("/") ? path : `${path}/`);

export function localePath(locale: Locale, path: string): string {
  const normalized = withSlash(path.startsWith("/") ? path : `/${path}`);
  return normalized === "/" ? `${prefix[locale]}/` : `${prefix[locale]}${normalized}`;
}

export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const path = withSlash(pathname || "/");
  for (const locale of locales) {
    const p = prefix[locale];
    if (p && (path === `${p}/` || path.startsWith(`${p}/`))) {
      return { locale, path: path.slice(p.length) };
    }
  }
  return { locale: defaultLocale, path };
}

export function alternatePath(pathname: string, target: Locale): string {
  return localePath(target, splitLocale(pathname).path);
}

export function pick<T>(value: Localized<T>, locale: Locale): T {
  return value[locale];
}
