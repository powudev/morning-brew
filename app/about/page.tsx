import type { Metadata } from "next";
import Link from "next/link";
import { CoffeeCupIllustration } from "@/components/Illustrations";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "關於我們",
  description: "Morning Brew(示範專案)的品牌故事。",
  alternates: { canonical: "/about/" },
};

const values = [
  { title: "穩定", text: "每天開店前校正磨豆機與萃取參數,讓第一杯和最後一杯一樣好喝。" },
  { title: "新鮮", text: "咖啡豆小批次烘焙、甜點每天現烤,當天沒賣完的不留到隔天。" },
  { title: "舒服", text: "座位之間留足空間,週末開放線上訂位,不用在門口排隊。" },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader title="關於我們" lead="這是為作品集打造的虛構咖啡店,以下品牌故事皆為示範內容。" />

      <section aria-labelledby="story-title" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
        <div>
          <h2 id="story-title" className="font-display text-3xl font-bold text-espresso">
            我們的故事
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed">
            <p>
              Morning Brew 想像的是一間社區裡的小店:早上替趕著上班的人準備一杯穩定好喝的拿鐵,週末讓朋友坐下來,配著剛出爐的可頌慢慢聊天。
            </p>
            <p>我們相信好咖啡不需要很複雜,只需要新鮮的豆子、細心的萃取,和一個讓人想多坐一會兒的空間。</p>
          </div>
        </div>
        <CoffeeCupIllustration className="mx-auto w-full max-w-xs" />
      </section>

      <section aria-labelledby="values-title" className="bg-foam py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="values-title" className="font-display text-3xl font-bold text-espresso">
            我們的堅持
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <li key={v.title} className="rounded-2xl bg-cream p-6 ring-1 ring-espresso/10">
                <h3 className="text-xl font-bold text-espresso">{v.title}</h3>
                <p className="mt-2 leading-relaxed">{v.text}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/reserve/"
            data-cta
            className="mt-10 inline-flex min-h-11 items-center rounded-full bg-espresso px-6 font-semibold text-cream hover:bg-espresso/90"
          >
            線上訂位
          </Link>
        </div>
      </section>
    </>
  );
}
