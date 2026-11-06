import ReservePage, { reserveMetadata } from "@/components/pages/ReservePage";

export const metadata = reserveMetadata("en");

export default function Page() {
  return <ReservePage locale="en" />;
}
