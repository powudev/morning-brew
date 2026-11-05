// 首頁等長頁面的區塊:以 h2 命名 region,方便輔助科技導覽
export default function Section({
  id,
  title,
  children,
  className = "",
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={`py-16 ${className}`}>
      <div className="mx-auto max-w-6xl px-4">
        <h2 id={`${id}-title`} className="font-display text-3xl font-bold text-espresso sm:text-4xl">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
