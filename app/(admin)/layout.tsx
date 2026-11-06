import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import { siteUrl } from "@/lib/content";
import { inter, playfair } from "@/lib/fonts";
import "../globals.css";

// 後台不給搜尋引擎索引;權限由 Supabase Auth + RLS 把關,不靠隱藏網址
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Staff | Morning Brew", template: "%s | Morning Brew Staff" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
