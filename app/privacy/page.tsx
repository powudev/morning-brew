import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隱私權聲明",
  description: "Morning Brew(示範專案)如何處理訂位資料。",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold text-espresso">隱私權聲明</h1>
      <p className="mt-4">本網站為作品集示範專案。</p>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>訂位表單收集姓名、Email、電話(選填)、人數、日期、時段與備註,僅用於示範訂位流程。</li>
        <li>資料儲存於 Supabase 資料庫,只有店家帳號可以查看。</li>
        <li>表單使用 Cloudflare Turnstile 防止機器人濫用。</li>
        <li>請勿輸入真實個人資料;示範資料會定期清除。</li>
      </ul>
    </>
  );
}
