import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "訂位已送出",
  robots: { index: false },
};

export default function ReserveDonePage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold text-espresso">已收到您的訂位</h1>
      <p className="mt-4">店家確認後,訂位狀態會更新。(示範專案,不會真的寄信或保留座位)</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center underline">
        回首頁
      </Link>
    </>
  );
}
