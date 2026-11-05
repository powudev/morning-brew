import Link from "next/link";
import PageHeader from "@/components/PageHeader";

export default function NotFound() {
  return (
    <>
      <PageHeader title="找不到這個頁面" lead="這頁可能已移除,或網址打錯了。" />
      <div className="mx-auto flex max-w-3xl flex-wrap gap-3 px-4 py-12">
        <Link
          href="/"
          data-cta
          className="inline-flex min-h-11 items-center rounded-full bg-espresso px-6 font-semibold text-cream hover:bg-espresso/90"
        >
          回首頁
        </Link>
        <Link
          href="/menu/"
          data-cta
          className="inline-flex min-h-11 items-center rounded-full border-2 border-espresso px-6 font-semibold text-espresso"
        >
          看菜單
        </Link>
      </div>
    </>
  );
}
