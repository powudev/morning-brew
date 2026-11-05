import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "線上訂位",
  description: "線上預約 Morning Brew(示範專案)的座位。",
  alternates: { canonical: "/reserve/" },
};

// Day-4:訂位表單(client component)+ Turnstile,送到 /api/reserve(Pages Function)
export default function ReservePage() {
  return (
    <>
      <PageHeader title="線上訂位" lead="示範專案,請勿填寫真實個資。" />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p>訂位表單建置中。</p>
      </div>
    </>
  );
}
