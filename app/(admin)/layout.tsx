import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import { siteUrl } from "@/lib/content";
import { inter, playfair } from "@/lib/fonts";
import "../globals.css";

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
