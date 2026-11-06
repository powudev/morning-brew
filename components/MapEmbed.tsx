"use client";

import { useState } from "react";
import { siteContent } from "@/lib/content";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

const { lat, lng, embedTitle, note } = siteContent.map;
const d = 0.004; // 地圖範圍(經緯度)
const embedSrc =
  "https://www.openstreetmap.org/export/embed.html?" +
  new URLSearchParams({
    bbox: [lng - d, lat - d, lng + d, lat + d].join(","),
    layer: "mapnik",
    marker: `${lat},${lng}`,
  }).toString();
const externalHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

// 第三方 iframe 點擊後才載入:首屏不被拖慢,也不在使用者同意前連線到外部
export default function MapEmbed({ locale }: { locale: Locale }) {
  const [loaded, setLoaded] = useState(false);
  const t = getDictionary(locale).map;

  return (
    <div>
      <div className="relative aspect-[4/3] max-h-80 w-full overflow-hidden rounded-2xl border border-espresso/15 bg-latte">
        {loaded ? (
          <iframe
            src={embedSrc}
            title={embedTitle[locale]}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-ink/80">{t.loadNote}</p>
            <button
              type="button"
              onClick={() => setLoaded(true)}
              className="min-h-11 rounded-full bg-espresso px-5 font-semibold text-cream hover:bg-espresso/90"
            >
              {t.load}
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-ink/80">
        <span>{note[locale]}</span>
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {t.openExternal}
          <span className="sr-only">{t.newWindow}</span>
        </a>
      </p>
    </div>
  );
}
