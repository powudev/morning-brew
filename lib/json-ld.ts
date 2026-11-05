import { siteContent, siteUrl } from "@/lib/content";

const dayMap: Record<string, string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
};

export function cafeJsonLd() {
  const { name, description, address, phone, priceRange, hours } = siteContent;
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name,
    description,
    url: siteUrl,
    telephone: phone,
    priceRange,
    servesCuisine: "Coffee",
    acceptsReservations: true,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.district,
      addressRegion: address.city,
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

// JSON.stringify 不會跳脫 <,避免 </script> 注入
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
