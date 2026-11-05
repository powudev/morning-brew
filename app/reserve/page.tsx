import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "線上訂位",
  description: "線上預約 Morning Brew(示範專案)的座位。",
  alternates: { canonical: "/reserve/" },
};

// Day-4:訂位表單(client component)+ Turnstile,送到 /api/reserve(Pages Function)
export default function ReservePage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold text-espresso">線上訂位</h1>
      <p className="mt-4">訂位表單建置中。示範專案,請勿填寫真實個資。</p>
    </>
  );
}
