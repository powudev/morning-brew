import RootDocument from "@/components/RootDocument";
import { rootMetadata } from "@/lib/root-metadata";
import "../globals.css";

export const metadata = rootMetadata("zh-tw");

export default function ChineseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootDocument locale="zh-tw">{children}</RootDocument>;
}
