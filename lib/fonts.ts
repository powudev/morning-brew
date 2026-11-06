import { Inter, Noto_Sans_TC, Playfair_Display } from "next/font/google";

export const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
export const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
// CJK 字型檔大:只在繁中 layout 使用,且不 preload,避免拖慢 LCP
export const notoTc = Noto_Sans_TC({ variable: "--font-noto-tc", weight: ["400", "700"], preload: false });
