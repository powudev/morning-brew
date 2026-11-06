import HomePage, { homeMetadata } from "@/components/pages/HomePage";

export const metadata = homeMetadata("en");

export default function Page() {
  return <HomePage locale="en" />;
}
