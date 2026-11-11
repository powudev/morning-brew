import { describe, expect, it } from "vitest";
import site from "@/content/site.json";
import { cafeJsonLd, serializeJsonLd } from "@/lib/json-ld";

describe("serializeJsonLd", () => {
  it("escapes < so strings cannot close the <script> tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script>");
  });

  it("escaped output is still valid, round-trippable JSON", () => {
    const data = { name: "a<b", n: 1 };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});

describe("cafeJsonLd", () => {
  const ld = cafeJsonLd("en");

  it("uses the schema.org CafeOrCoffeeShop type", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("CafeOrCoffeeShop");
    expect(ld.name).toBe(site.name);
    expect(ld.acceptsReservations).toBe(true);
  });

  it("takes address and phone from site.json", () => {
    expect(ld.telephone).toBe(site.phone);
    expect(ld.address).toMatchObject({
      "@type": "PostalAddress",
      streetAddress: site.address.street.en,
      addressCountry: site.address.country,
    });
  });

  it("maps weekday abbreviations to full schema.org names", () => {
    expect(ld.openingHoursSpecification).toHaveLength(site.hours.length);
    expect(ld.openingHoursSpecification[0]).toEqual({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "07:30",
      closes: "18:00",
    });
    expect(ld.openingHoursSpecification[1].dayOfWeek).toEqual(["Saturday", "Sunday"]);
  });
});

describe("cafeJsonLd locales", () => {
  it("uses English text and URL for en, Chinese text and /zh-tw/ URL for zh-tw", () => {
    const en = cafeJsonLd("en");
    const zh = cafeJsonLd("zh-tw");
    expect(en.description).toBe(site.description.en);
    expect(en.inLanguage).toBe("en");
    expect(en.url).toMatch(/\/$/);
    expect(zh.description).toBe(site.description["zh-tw"]);
    expect(zh.inLanguage).toBe("zh-Hant-TW");
    expect(zh.url).toMatch(/\/zh-tw\/$/);
    expect(zh.address.streetAddress).toBe(site.address.street["zh-tw"]);
  });
});
