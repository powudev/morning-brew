import { describe, expect, it } from "vitest";
import site from "@/content/site.json";
import { cafeJsonLd, serializeJsonLd } from "@/lib/json-ld";

describe("serializeJsonLd", () => {
  it("跳脫 <,讓字串無法提前結束 <script> 標籤", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script>");
  });

  it("跳脫後仍是可還原的 JSON", () => {
    const data = { name: "a<b", n: 1 };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});

describe("cafeJsonLd", () => {
  const ld = cafeJsonLd();

  it("使用 schema.org 的 CafeOrCoffeeShop 型別", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("CafeOrCoffeeShop");
    expect(ld.name).toBe(site.name);
    expect(ld.acceptsReservations).toBe(true);
  });

  it("地址與電話來自 site.json", () => {
    expect(ld.telephone).toBe(site.phone);
    expect(ld.address).toMatchObject({
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressCountry: site.address.country,
    });
  });

  it("營業時間把星期縮寫轉成 schema.org 完整名稱", () => {
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
