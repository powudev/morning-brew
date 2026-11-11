import { siteContent, siteUrl } from "@/lib/content";
import { htmlLang, localePath, type Locale } from "@/lib/i18n";

const dayMap: Record<string, string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
};

export function cafeJsonLd(locale: Locale) {
  const { name, description, address, phone, priceRange, hours } = siteContent;
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name,
    description: description[locale],
    inLanguage: htmlLang(locale),
    url: `${siteUrl}${localePath(locale, "/")}`,
    telephone: phone,
    priceRange,
    servesCuisine: "Coffee",
    acceptsReservations: true,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street[locale],
      addressLocality: address.district[locale],
      addressRegion: address.city[locale],
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    openingHoursSpecification: hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => dayMap[d]),
      opens: h.open,
      closes: h.close,
    })),
  };
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
