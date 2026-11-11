export function CoffeeCupIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 280" className={className} aria-hidden="true" focusable="false">
      <circle cx="160" cy="150" r="120" fill="#e9dcc8" />
      <path d="M128 52c-10 14 10 22 0 36M160 42c-12 16 12 26 0 42M192 52c-10 14 10 22 0 36"
        fill="none" stroke="#c68b59" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="160" cy="226" rx="104" ry="18" fill="#3e2723" opacity=".15" />
      <ellipse cx="160" cy="214" rx="96" ry="16" fill="#fffaf3" stroke="#3e2723" strokeWidth="4" />
      <path d="M232 132h14a30 30 0 0 1 0 60h-18" fill="none" stroke="#3e2723" strokeWidth="12" />
      <path d="M86 112h148v46c0 36-30 56-74 56s-74-20-74-56z" fill="#fffaf3" stroke="#3e2723" strokeWidth="4" />
      <ellipse cx="160" cy="112" rx="74" ry="14" fill="#6d4c41" stroke="#3e2723" strokeWidth="4" />
      <path d="M140 110c8-8 32-8 40 0-8 6-32 6-40 0z" fill="#f5efe6" />
    </svg>
  );
}

export function BeanIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true" focusable="false">
      <ellipse cx="24" cy="24" rx="14" ry="19" transform="rotate(30 24 24)" fill="#6d4c41" />
      <path d="M17 12c8 6 6 18 14 24" fill="none" stroke="#f5efe6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CroissantIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true" focusable="false">
      <path d="M6 30c4-14 32-14 36 0-4 4-10 4-12 2-2 4-10 4-12 0-2 2-8 2-12-2z" fill="#c68b59" />
      <path d="M18 22l2 10M30 22l-2 10M24 20v12" stroke="#3e2723" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true" focusable="false">
      <rect x="8" y="10" width="32" height="30" rx="4" fill="#fffaf3" stroke="#3e2723" strokeWidth="3" />
      <path d="M8 18h32M16 6v8M32 6v8" stroke="#3e2723" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 28l5 5 9-10" fill="none" stroke="#c68b59" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
