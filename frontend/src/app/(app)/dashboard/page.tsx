'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DEMO_RUNS, PORTS, cargo, loadRuns, mt, port, rankOptions, shortDate, type Run,
} from '@/lib/freight';
import { Panel, RiskPill, Tile, TileRow } from '@/components/ui';

export default function CommandCentre() {
  // Seeded rows render identically on the server; session runs merge in on mount.
  const [runs, setRuns] = useState<Run[]>(DEMO_RUNS);
  useEffect(() => setRuns(loadRuns()), []);

  const rows = runs.map((run) => ({ run, best: rankOptions(run.requirement)[0] }));
  const tonnage = runs.reduce((sum, { requirement: r }) => sum + r.quantityMt * r.voyages, 0);
  const avgRate = rows.reduce((sum, r) => sum + r.best.usdPerMt, 0) / (rows.length || 1);
  const exposed = rows.filter((r) => r.best.risk !== 'Low');
  const watch = [...PORTS.filter((p) => p.role !== 'load')].sort((a, b) => b.congestionDays - a.congestionDays);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 py-12 max-md:px-5 max-md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[17px] italic text-ice/70">Command centre</p>
          <h1 className="plate plate-lg mt-4 text-[clamp(30px,4.2vw,48px)] text-snow">
            Everything on the water, and everything still to fix
          </h1>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-[1.7] text-frost/72">
            {runs.length} open requirement{runs.length === 1 ? '' : 's'}, each scored against the vessel classes that
            can physically load the parcel and berth at both ends.
          </p>
        </div>
        <Link
          href="/analysis/new"
          className="ui rounded-[3px] bg-ice px-7 py-3.5 font-semibold text-ink transition-colors hover:bg-snow"
        >
          New freight analysis
        </Link>
      </div>

      <div className="mt-11">
        <TileRow>
          <Tile label="Open requirements" value={String(runs.length)} note="awaiting a fixture" />
          <Tile label="Programme tonnage" value={mt(tonnage)} note="across every voyage" />
          <Tile label="Modelled freight" value={avgRate.toFixed(2)} note="USD per tonne, best option" tone="text-ice" />
          <Tile
            label="Laycan exposure"
            value={exposed.length ? String(exposed.length) : 'None'}
            note={exposed.length ? `at risk — ${exposed.map((r) => r.run.id).join(', ')}` : 'every lane holds its laycan'}
            tone={exposed.length ? 'text-amber' : 'text-mint'}
          />
        </TileRow>
      </div>

      <div className="mt-8 grid gap-7 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <Panel title="Open requirements" aside={<span className="ui text-[12px] text-frost/45">best option shown</span>}>
          <div className="flex flex-col">
            {rows.map(({ run, best }) => {
              const r = run.requirement;
              return (
                <Link
                  key={run.id}
                  href={`/analysis/${run.id}`}
                  className="grid gap-4 border-b border-slate/60 px-7 py-6 transition-colors last:border-b-0 hover:bg-frost/4 max-md:px-5 md:grid-cols-[1.45fr_1fr_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="plate text-[18px] text-snow">
                        {port(r.loadPort).name} <span className="text-ice">→</span> {port(r.dischargePort).name}
                      </span>
                      <span className="ui num text-[12px] text-frost/35">{run.id}</span>
                    </div>
                    <p className="mt-2 text-[15px] leading-[1.5] text-frost/60">
                      {cargo(r.cargoId).name}, <span className="num">{mt(r.quantityMt)}</span>
                      {r.voyages > 1 && <> across {r.voyages} voyages</>} — wanted by {shortDate(r.arrivalBy)}
                    </p>
                  </div>

                  <div>
                    <span className="ui num block text-[16px] font-semibold text-snow">
                      {best.fit.ok ? `${best.usdPerMt.toFixed(2)} USD/t` : 'No feasible vessel'}
                    </span>
                    <span className="mt-1.5 block text-[14.5px] text-frost/45">
                      {best.vessel.name}, arrives {shortDate(best.etaIso)}
                    </span>
                  </div>

                  <RiskPill risk={best.risk} />
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel title="Discharge ports">
          <div className="flex flex-col">
            {watch.map((p) => (
              <div
                key={p.code}
                className="flex items-baseline justify-between gap-4 border-b border-slate/60 px-7 py-4 last:border-b-0 max-md:px-5"
              >
                <div>
                  <span className="ui block text-[14.5px] text-snow">{p.name}</span>
                  <span className="num mt-1 block text-[14px] text-frost/40">{p.maxDraft.toFixed(1)} m at the berth</span>
                </div>
                <span className={`ui num text-[14.5px] ${p.congestionDays >= 3 ? 'text-amber' : 'text-frost/55'}`}>
                  +{p.congestionDays.toFixed(1)} d
                </span>
              </div>
            ))}
          </div>
          <p className="border-t border-slate px-7 py-5 text-[14.5px] leading-[1.6] text-frost/45 max-md:px-5">
            Draft feeds straight into vessel fit. Two tenths of a metre is enough to rule out a whole class.
          </p>
        </Panel>
      </div>
    </div>
  );
}
