import type { Metadata } from "next";
import SlotsManager from "@/components/admin/SlotsManager";

export const metadata: Metadata = { title: "Time slots" };

export default function SlotsPage() {
  return <SlotsManager />;
}
