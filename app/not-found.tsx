import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold text-espresso">找不到這個頁面</h1>
      <p className="mt-4">這頁可能已移除,或網址打錯了。</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center underline">
        回首頁
      </Link>
    </>
  );
}
