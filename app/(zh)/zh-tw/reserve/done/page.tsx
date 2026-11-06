import DonePage, { doneMetadata } from "@/components/pages/DonePage";

export const metadata = doneMetadata("zh-tw");

export default function Page() {
  return <DonePage locale="zh-tw" />;
}
