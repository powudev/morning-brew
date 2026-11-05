import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import { itemsByCategory, menuContent } from "@/lib/content";
import { formatPrice, tagLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "菜單",
  description: "Morning Brew(示範專案)的義式咖啡、手沖、非咖啡飲品與甜點菜單。",
  alternates: { canonical: "/menu/" },
};

export default function MenuPage() {
  return (
    <>
      <PageHeader title="菜單" lead="所有飲品可換燕麥奶(+NT$20)。價格為示範內容。" />

      <nav aria-label="菜單分類" className="sticky top-[6.5rem] z-10 border-b border-espresso/10 bg-cream sm:top-[3.75rem]">
        <ul className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2">
          {menuContent.categories.map((cat) => (
            <li key={cat.id} className="shrink-0">
              <a
                href={`#${cat.id}`}
                className="inline-flex min-h-11 items-center rounded-full bg-foam px-3 font-medium sm:px-4 ring-1 ring-espresso/15 hover:bg-latte"
              >
                {cat.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        {menuContent.categories.map((cat) => (
          <section key={cat.id} id={cat.id} aria-labelledby={`${cat.id}-title`} className="scroll-mt-44 pt-12">
            <h2 id={`${cat.id}-title`} className="font-display text-3xl font-bold text-espresso">
              {cat.name} <span className="text-lg font-normal text-ink/75">{cat.nameEn}</span>
            </h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {itemsByCategory(cat.id).map((item) => (
                <li key={item.id} className="rounded-2xl bg-foam p-5 ring-1 ring-espresso/10">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-bold text-espresso">{item.name}</h3>
                    <span className="shrink-0 font-semibold">{formatPrice(item.price)}</span>
                  </div>
                  <p className="text-sm text-ink/75">{item.nameEn}</p>
                  <p className="mt-2 leading-relaxed">{item.description}</p>
                  {item.tags.length > 0 && (
                    <p className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => {
                        const label = tagLabel(tag);
                        return label ? (
                          <span key={tag} className="rounded-full bg-latte px-3 py-1 text-sm font-medium">
                            {label}
                          </span>
                        ) : null;
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
