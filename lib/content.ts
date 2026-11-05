import site from "@/content/site.json";
import menu from "@/content/menu.json";
import reviews from "@/content/reviews.json";

// 公開頁內容一律讀 content/*.json(build 時打包),不讀資料庫
export type Site = typeof site;
export type Menu = typeof menu;
export type MenuItem = Menu["items"][number];
export type Reviews = typeof reviews;

export const siteContent: Site = site;
export const menuContent: Menu = menu;
export const reviewsContent: Reviews = reviews;

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export function featuredItems(): MenuItem[] {
  return menu.items.filter((item) => item.featured);
}

export function itemsByCategory(categoryId: string): MenuItem[] {
  return menu.items.filter((item) => item.category === categoryId);
}
