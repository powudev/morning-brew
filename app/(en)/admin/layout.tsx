import type { Metadata } from "next";

// 後台不給搜尋引擎索引;權限由 Supabase Auth + RLS 把關,不靠隱藏網址
export const metadata: Metadata = {
  title: "店家後台",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
