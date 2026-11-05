import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "關於我們",
  description: "Morning Brew(示範專案)的品牌故事。",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold text-espresso">關於我們</h1>
      <p className="mt-4">
        Morning Brew 是為作品集打造的虛構咖啡店。我們想像一間社區裡的小店:早上替上班族準備一杯穩定好喝的拿鐵,週末讓朋友坐下來慢慢聊天。(示範內容)
      </p>
    </>
  );
}
