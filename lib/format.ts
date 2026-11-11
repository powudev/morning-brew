import menu from "@/content/menu.json";
import site from "@/content/site.json";
import type { Locale } from "@/lib/i18n";

const priceFormatter = new Intl.NumberFormat("en-US");

export function formatPrice(price: number): string {
  return `NT$${priceFormatter.format(price)}`;
}

export function formatTimeRange(open: string, close: string): string {
  return `${open} – ${close}`;
}

export function tagLabel(tag: string, locale: Locale): string | undefined {
  return (menu.tagLabels[locale] as Record<string, string>)[tag];
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\D/g, "")}`;
}

export function formatAddress(locale: Locale): string {
  const { street, district, city } = site.address;
  return locale === "en"
    ? `${street.en}, ${district.en}, ${city.en}`
    : `${city[locale]}${district[locale]}${street[locale]}`;
}
