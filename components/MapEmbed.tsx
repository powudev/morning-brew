"use client";

import { useState } from "react";
import { siteContent } from "@/lib/content";

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
export default function MapEmbed() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div>
      <div className="relative aspect-[4/3] max-h-80 w-full overflow-hidden rounded-2xl border border-espresso/15 bg-latte">
        {loaded ? (
          <iframe
            src={embedSrc}
            title={embedTitle}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-ink/80">地圖由 OpenStreetMap 提供,點擊後才會載入。</p>
            <button
              type="button"
              onClick={() => setLoaded(true)}
              className="min-h-11 rounded-full bg-espresso px-5 font-semibold text-cream hover:bg-espresso/90"
            >
              載入地圖
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-ink/80">
        <span>{note}</span>
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          在 OpenStreetMap 開啟<span className="sr-only">(另開新視窗)</span>
        </a>
      </p>
    </div>
  );
}
