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
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/80 p-1.5 shadow-2xl shadow-black/40 backdrop-blur">
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
                      ? 'bg-emerald-400/15 text-emerald-400'
                      : 'text-zinc-500 hover:text-zinc-50'
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
