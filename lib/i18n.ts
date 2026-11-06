// 語系:英文為預設(根路徑),繁中在 /zh-tw/ 前綴。靜態輸出不能用 middleware,語系完全由路由決定。

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

/** 不含語系的路徑(如 /menu/)→ 該語系的網址 */
export function localePath(locale: Locale, path: string): string {
  const normalized = withSlash(path.startsWith("/") ? path : `/${path}`);
  return normalized === "/" ? `${prefix[locale]}/` : `${prefix[locale]}${normalized}`;
}

/** 網址 → 語系與不含語系的路徑 */
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

/** 同一頁在另一語系的網址 */
export function alternatePath(pathname: string, target: Locale): string {
  return localePath(target, splitLocale(pathname).path);
}

export function pick<T>(value: Localized<T>, locale: Locale): T {
  return value[locale];
}
