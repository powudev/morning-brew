import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "隱私權聲明",
  description: "Morning Brew(示範專案)如何處理訂位資料。",
  alternates: { canonical: "/privacy/" },
};

const items = [
  { title: "收集哪些資料", text: "訂位表單收集姓名、Email、電話(選填)、人數、日期、時段與備註,僅用於示範訂位流程。" },
  { title: "資料存在哪裡", text: "資料儲存於 Supabase 資料庫。資料庫設有存取權限控管(Row Level Security),只有店家帳號可以查看訂位。" },
  { title: "防止濫用", text: "表單使用 Cloudflare Turnstile 驗證送出者不是機器人。" },
  { title: "第三方服務", text: "首頁地圖由 OpenStreetMap 提供,只有在您按下「載入地圖」後才會連線。" },
  { title: "請勿輸入真實資料", text: "本網站為作品集示範專案,請勿輸入真實個人資料;示範資料會定期清除。" },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="隱私權聲明" lead="本網站為作品集示範專案(Demo project / fictional business)。" />
      <div className="mx-auto max-w-3xl px-4 py-12">
        {items.map((item) => (
          <section key={item.title} className="mt-8 first:mt-0">
            <h2 className="text-xl font-bold text-espresso">{item.title}</h2>
            <p className="mt-2 leading-relaxed">{item.text}</p>
          </section>
        ))}
      </div>
    </>
  );
}
