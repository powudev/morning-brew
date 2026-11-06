import Link from "next/link";

// 後台外框:沒有公開網站的選單與語言切換器(後台僅英文)
export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded bg-espresso px-4 py-3 text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <header className="border-b border-espresso/10 bg-espresso text-cream">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-2">
          <Link href="/admin/" className="inline-flex min-h-11 items-center font-display text-xl font-bold">
            Morning Brew · Staff
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
            View public site
          </Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 focus:outline-none">
        {children}
      </main>
      <footer className="border-t border-espresso/10 px-4 py-4 text-center text-sm text-ink/80">
        Demo project / fictional business · staff area
      </footer>
    </>
  );
}
