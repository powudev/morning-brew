import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "訂位已送出",
  robots: { index: false },
};

export default function ReserveDonePage() {
  return (
    <>
      <PageHeader title="已收到您的訂位" lead="店家確認後,訂位狀態會更新。(示範專案,不會真的保留座位)" />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          data-cta
          className="inline-flex min-h-11 items-center rounded-full bg-espresso px-6 font-semibold text-cream hover:bg-espresso/90"
        >
          回首頁
        </Link>
      </div>
    </>
  );
}
