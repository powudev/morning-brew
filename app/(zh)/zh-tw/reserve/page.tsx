import ReservePage, { reserveMetadata } from "@/components/pages/ReservePage";

export const metadata = reserveMetadata("zh-tw");

export default function Page() {
  return <ReservePage locale="zh-tw" />;
}
