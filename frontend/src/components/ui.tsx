import type { Risk } from '@/lib/freight';

const RISK_TONE: Record<Risk, string> = {
  Low: 'bg-mint/12 text-mint',
  Medium: 'bg-amber/12 text-amber',
  High: 'bg-ember/12 text-ember',
};

export const RISK_TEXT: Record<Risk, string> = {
  Low: 'text-mint',
  Medium: 'text-amber',
  High: 'text-ember',
};

export function RiskPill({ risk, label }: { risk: Risk; label?: string }) {
  return (
    <span className={`ui shrink-0 rounded-[2px] px-2 py-1 text-[11.5px] ${RISK_TONE[risk]}`}>
      {label ?? `${risk} risk`}
    </span>
  );
}

export function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className="bg-hull px-7 py-6 max-md:px-5">
      <div className="ui text-[12.5px] text-frost/50">{label}</div>
      <div className={`plate plate-lg num mt-3 text-[clamp(21px,2.3vw,29px)] ${tone ?? 'text-snow'}`}>{value}</div>
      {note && <div className="mt-2 text-[14.5px] leading-[1.45] text-frost/45">{note}</div>}
    </div>
  );
}

/** Tiles sit edge to edge in one bordered strip, hairline-separated. */
export function TileRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-[2px] border border-slate bg-slate/60 [grid-template-columns:repeat(auto-fit,minmax(185px,1fr))]">
      {children}
    </div>
  );
}

export function Panel({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[2px] border border-slate bg-hull/60">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate px-7 py-5 max-md:px-5">
        <h2 className="plate text-[19px] text-snow">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
