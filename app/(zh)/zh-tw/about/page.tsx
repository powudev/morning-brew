import AboutPage, { aboutMetadata } from "@/components/pages/AboutPage";

export const metadata = aboutMetadata("zh-tw");

export default function Page() {
  return <AboutPage locale="zh-tw" />;
}
