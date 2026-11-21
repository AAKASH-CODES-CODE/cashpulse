import type { MouseEvent } from 'react';
import { LayoutDashboard, LineChart, Receipt, type LucideIcon } from 'lucide-react';

interface BottomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ITEMS: readonly BottomNavItem[] = [
  { label: 'Overview', href: '#overview', icon: LayoutDashboard },
  { label: 'Invoices', href: '#invoices', icon: Receipt },
  { label: 'Forecast', href: '#forecast', icon: LineChart },
];

export interface BottomNavProps {
  onSelect?: (sectionId: string) => void;
}

export function BottomNav({ onSelect }: BottomNavProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, href: string): void => {
    event.preventDefault();
    const sectionId = href.slice(1);
    onSelect?.(sectionId);
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <nav
      aria-label="Section navigation"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-sm md:hidden"
    >
      <ul className="grid grid-cols-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-1.5 shadow-2xl shadow-black/40 backdrop-blur">
        {ITEMS.map(({ label, href, icon: Icon }) => (
          <li key={href}>
            <a
              href={href}
              onClick={(event) => handleClick(event, href)}
              className="tap-press focus-ring-accent group flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-50 active:scale-90"
            >
              <span className="flex h-7 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-all duration-200 ease-out group-hover:bg-emerald-400/15 group-hover:text-emerald-400 group-hover:scale-110 group-active:scale-95">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
