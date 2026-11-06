import MenuPage, { menuMetadata } from "@/components/pages/MenuPage";

export const metadata = menuMetadata("zh-tw");

export default function Page() {
  return <MenuPage locale="zh-tw" />;
}
