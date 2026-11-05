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
        <DemoBanner />
        <Header />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
