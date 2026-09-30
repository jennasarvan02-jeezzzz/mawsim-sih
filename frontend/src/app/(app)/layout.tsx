'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Command centre' },
  { href: '/analysis/new', label: 'New analysis' },
];

// The rest of the IA. Listed so the shape of the product is visible, not linked
// until it exists — a dead nav link reads worse than an honest "soon".
const PLANNED = ['Scenario simulator', 'Contract planner', 'Data and sources'];

function NavList({ pathname, className }: { pathname: string; className: string }) {
  return (
    <div className={className}>
      {NAV.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`ui whitespace-nowrap rounded-[2px] px-4 py-2.5 text-[14.5px] transition-colors ${
              active ? 'bg-ice/12 font-semibold text-snow' : 'text-frost/55 hover:bg-frost/5 hover:text-snow'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full bg-ink text-frost">
      <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col border-r border-slate bg-hull/40 lg:flex">
        <Link href="/" className="plate block px-7 py-7 text-[19px] uppercase text-snow">
          Freight<span className="text-ice">.ai</span>
        </Link>

        <nav className="flex flex-1 flex-col px-4">
          <NavList pathname={pathname} className="flex flex-col gap-1" />

          <div className="ui mt-9 mb-2 px-4 text-[12px] text-frost/30">Planned</div>
          {PLANNED.map((label) => (
            <span
              key={label}
              aria-disabled
              className="ui flex cursor-default items-baseline justify-between gap-2 px-4 py-2.5 text-[14.5px] text-frost/22"
            >
              {label}
              <span className="text-[11px] italic">soon</span>
            </span>
          ))}
        </nav>

        <p className="mx-4 mb-5 border-t border-slate pt-5 text-[14px] leading-[1.5] text-frost/40">
          Figures are modelled from vessel economics and port particulars, not a live market feed.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-4 border-b border-slate px-5 py-3.5 lg:hidden">
          <Link href="/" className="plate text-[16px] uppercase text-snow">
            Freight<span className="text-ice">.ai</span>
          </Link>
          <NavList pathname={pathname} className="flex gap-1 overflow-x-auto" />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
