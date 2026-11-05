export default function PageHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="bg-latte/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <h1 className="font-display text-4xl font-bold text-espresso sm:text-5xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-lg leading-relaxed">{lead}</p>}
      </div>
    </div>
  );
}
