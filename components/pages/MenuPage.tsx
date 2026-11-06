import PageHeader from "@/components/PageHeader";
import { itemsByCategory, menuContent } from "@/lib/content";
import { getDictionary } from "@/lib/dictionary";
import { formatPrice, tagLabel } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export function menuMetadata(locale: Locale) {
  const t = getDictionary(locale).menu;
  return pageMetadata({ locale, path: "/menu/", title: t.metaTitle, description: t.metaDescription });
}

export default function MenuPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).menu;
  return (
    <>
      <PageHeader title={t.title} lead={t.lead} />

      <nav
        aria-label={t.categoriesLabel}
        className="sticky top-[6.5rem] z-10 border-b border-espresso/10 bg-cream sm:top-[3.75rem]"
      >
        <ul className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2">
          {menuContent.categories.map((cat) => (
            <li key={cat.id} className="shrink-0">
              <a
                href={`#${cat.id}`}
                className="inline-flex min-h-11 items-center rounded-full bg-foam px-3 font-medium ring-1 ring-espresso/15 hover:bg-latte sm:px-4"
              >
                {cat.name[locale]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        {menuContent.categories.map((cat) => (
          <section key={cat.id} id={cat.id} aria-labelledby={`${cat.id}-title`} className="scroll-mt-44 pt-12">
            <h2 id={`${cat.id}-title`} className="font-display text-3xl font-bold text-espresso">
              {cat.name[locale]}{" "}
              {locale !== "en" && (
                <span lang="en" className="text-lg font-normal text-ink/75">
                  {cat.name.en}
                </span>
              )}
            </h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {itemsByCategory(cat.id).map((item) => (
                <li key={item.id} className="rounded-2xl bg-foam p-5 ring-1 ring-espresso/10">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-bold text-espresso">{item.name[locale]}</h3>
                    <span className="shrink-0 font-semibold">{formatPrice(item.price)}</span>
                  </div>
                  {locale !== "en" && (
                    <p lang="en" className="text-sm text-ink/75">
                      {item.name.en}
                    </p>
                  )}
                  <p className="mt-2 leading-relaxed">{item.description[locale]}</p>
                  {item.tags.length > 0 && (
                    <p className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => {
                        const label = tagLabel(tag, locale);
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
