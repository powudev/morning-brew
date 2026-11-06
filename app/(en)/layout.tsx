import RootDocument from "@/components/RootDocument";
import { rootMetadata } from "@/lib/root-metadata";
import "../globals.css";

export const metadata = rootMetadata("en");

export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootDocument locale="en">{children}</RootDocument>;
}
