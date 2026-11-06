import DonePage, { doneMetadata } from "@/components/pages/DonePage";

export const metadata = doneMetadata("en");

export default function Page() {
  return <DonePage locale="en" />;
}
