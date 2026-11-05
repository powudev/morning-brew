import type { Metadata } from "next";
import { Inter, Noto_Sans_TC, Playfair_Display } from "next/font/google";
import DemoBanner from "@/components/DemoBanner";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { siteContent, siteUrl } from "@/lib/content";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
// CJK 字型檔大,不 preload,避免拖慢 LCP
const notoTc = Noto_Sans_TC({
  variable: "--font-noto-tc",
  weight: ["400", "700"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteContent.name} | 咖啡店(示範專案)`,
    template: `%s | ${siteContent.name}`,
  },
  description: siteContent.description,
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: siteContent.name,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-Hant-TW"
      className={`${inter.variable} ${playfair.variable} ${notoTc.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only z-50 rounded bg-espresso px-4 py-3 text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          跳到主要內容
        </a>
        <DemoBanner />
        <Header />
        {/* tabIndex=-1:skip link 跳轉後焦點落在 main */}
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
