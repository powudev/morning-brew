import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ReservationForm from "@/components/ReservationForm";

export const metadata: Metadata = {
  title: "線上訂位",
  description: "線上預約 Morning Brew(示範專案)的座位。",
  alternates: { canonical: "/reserve/" },
};

export default function ReservePage() {
  return (
    <>
      <PageHeader title="線上訂位" lead="可預約今天起 30 天內的座位。示範專案,請勿填寫真實個資。" />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ReservationForm />
      </div>
    </>
  );
}
