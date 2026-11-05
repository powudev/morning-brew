import type { Metadata } from "next";
import { itemsByCategory, menuContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "菜單",
  description: "Morning Brew(示範專案)的義式咖啡、手沖、非咖啡飲品與甜點菜單。",
  alternates: { canonical: "/menu/" },
};

export default function MenuPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold text-espresso">菜單</h1>
      {menuContent.categories.map((cat) => (
        <section key={cat.id} aria-labelledby={`cat-${cat.id}`} className="mt-10">
          <h2 id={`cat-${cat.id}`} className="font-display text-2xl font-bold">
            {cat.name} <span className="text-base font-normal">{cat.nameEn}</span>
          </h2>
          <ul className="mt-4 space-y-3">
            {itemsByCategory(cat.id).map((item) => (
              <li key={item.id}>
                <p className="font-semibold">
                  {item.name}({item.nameEn})NT${item.price}
                </p>
                <p className="text-sm">{item.description}</p>
                {item.tags.length > 0 && (
                  <p className="text-sm">
                    {item.tags
                      .map((t) => menuContent.tagLabels[t as keyof typeof menuContent.tagLabels])
                      .join("、")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
