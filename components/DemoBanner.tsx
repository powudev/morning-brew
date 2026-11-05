import { siteContent } from "@/lib/content";

export default function DemoBanner() {
  return (
    <div role="note" className="bg-espresso px-4 py-2 text-center text-sm text-cream">
      {siteContent.demoNotice}
    </div>
  );
}
