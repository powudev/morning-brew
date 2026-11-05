import menu from "@/content/menu.json";

const priceFormatter = new Intl.NumberFormat("en-US");

export function formatPrice(price: number): string {
  return `NT$${priceFormatter.format(price)}`;
}

export function formatTimeRange(open: string, close: string): string {
  return `${open} – ${close}`;
}

export function tagLabel(tag: string): string | undefined {
  return (menu.tagLabels as Record<string, string>)[tag];
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\D/g, "")}`;
}
