import type { SectionNavItem } from './section-nav';

export interface BottomNavProps<T extends string> {
  sections: readonly SectionNavItem<T>[];
  active: T;
  onSelect: (id: T) => void;
}

/** Mobile-only fixed bar listing every dashboard section, scrollable horizontally when they do not fit. */
export function BottomNav<T extends string>({ sections, active, onSelect }: BottomNavProps<T>) {
  const handleClick = (id: T): void => {
    onSelect(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="Section navigation"
      className="fixed inset-x-3 bottom-4 z-40 mx-auto max-w-md md:hidden"
    >
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/90 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur">
        <ul className="flex min-w-max gap-1">
          {sections.map(({ id, label }) => {
            const isActive = id === active;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => handleClick(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`tap-press cp-focus whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-semibold ring-1 ring-emerald-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
