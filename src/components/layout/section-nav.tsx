'use client';

export interface SectionNavItem<T extends string> {
  id: T;
  label: string;
}

export interface SectionNavProps<T extends string> {
  sections: readonly SectionNavItem<T>[];
  active: T;
  onSelect: (id: T) => void;
}

export function SectionNav<T extends string>({ sections, active, onSelect }: SectionNavProps<T>) {
  return (
    <nav
      aria-label="Dashboard sections"
      className="sticky top-16 z-30 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl"
    >
      <ul className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const isActive = section.id === active;
          return (
            <li key={section.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelect(section.id)}
                className={`tap-press focus-ring-accent cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  isActive
                    ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-400 shadow-sm shadow-emerald-500/10'
                    : 'border-white/10 text-zinc-400 hover:border-white/20 hover:bg-white/5 hover:text-zinc-50'
                }`}
              >
                {section.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
