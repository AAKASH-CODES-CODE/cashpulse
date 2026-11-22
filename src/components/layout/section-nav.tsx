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
      className="sticky top-16 z-30 w-full border-b border-slate-200/80 bg-white/70 backdrop-blur-xl"
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
                    ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 shadow-xs ring-1 ring-emerald-500/10'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-900'
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
