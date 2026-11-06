import HomePage, { homeMetadata } from "@/components/pages/HomePage";

export const metadata = homeMetadata("zh-tw");

export default function Page() {
  return <HomePage locale="zh-tw" />;
}
