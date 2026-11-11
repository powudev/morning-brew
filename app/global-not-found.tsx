import type { Metadata } from "next";
import Link from "next/link";
import { primaryCta, secondaryCta } from "@/components/pages/HomePage";
import { getDictionary } from "@/lib/dictionary";
import { inter, notoTc, playfair } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found | 找不到這個頁面",
  robots: { index: false },
};

const en = getDictionary("en");
const zh = getDictionary("zh-tw");

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${notoTc.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
          <h1 className="font-display text-4xl font-bold text-espresso">
            {en.notFound.title}
            <span lang="zh-Hant-TW" className="mt-2 block text-3xl">
              {zh.notFound.title}
            </span>
          </h1>
          <p className="mt-4">{en.notFound.lead}</p>
          <p lang="zh-Hant-TW" className="mt-1">
            {zh.notFound.lead}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" data-cta className={primaryCta}>
              {en.notFound.home}
            </Link>
            <Link href="/zh-tw/" data-cta lang="zh-Hant-TW" hrefLang="zh-Hant-TW" className={secondaryCta}>
              {zh.notFound.home}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
