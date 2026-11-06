import PrivacyPage, { privacyMetadata } from "@/components/pages/PrivacyPage";

export const metadata = privacyMetadata("en");

export default function Page() {
  return <PrivacyPage locale="en" />;
}
