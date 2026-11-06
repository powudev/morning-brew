import MenuPage, { menuMetadata } from "@/components/pages/MenuPage";

export const metadata = menuMetadata("en");

export default function Page() {
  return <MenuPage locale="en" />;
}
