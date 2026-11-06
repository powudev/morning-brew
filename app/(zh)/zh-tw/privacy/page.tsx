import PrivacyPage, { privacyMetadata } from "@/components/pages/PrivacyPage";

export const metadata = privacyMetadata("zh-tw");

export default function Page() {
  return <PrivacyPage locale="zh-tw" />;
}
