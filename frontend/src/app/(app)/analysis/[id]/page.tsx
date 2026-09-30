'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DEMO_RUNS, cargo, getRun, mt, port, rankOptions, shortDate, usd, type Run,
} from '@/lib/freight';
import { Panel, RiskPill, Tile, TileRow } from '@/components/ui';

export default function AnalysisResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Seeded runs exist during the server render; session runs only after mount.
  const [run, setRun] = useState<Run | undefined>(() => DEMO_RUNS.find((r) => r.id === id));
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setRun(getRun(id));
    setSettled(true);
  }, [id]);

  if (!run) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-8 py-16 max-md:px-5">
        <p className="text-[17px] text-frost/65">
          {settled ? `Nothing filed under ${id} in this session.` : 'Loading.'}
        </p>
        {settled && (
          <Link href="/analysis/new" className="ui mt-5 inline-block text-[15px] text-ice hover:text-snow">
            Start a new analysis
          </Link>
        )}
      </div>
    );
  }

  const r = run.requirement;
  const options = rankOptions(r);
  const best = options[0];
  const runnerUp = options.slice(1).find((o) => o.fit.ok);
  // The forecast screen is wired to one lane so far.
  const flagship = r.loadPort === 'NTL' && r.dischargePort === 'PRD' && r.cargoId === 'thermal-coal';

  const reasons = [
    best.fit.reason,
    runnerUp
      ? `${(runnerUp.usdPerMt - best.usdPerMt).toFixed(2)} USD per tonne under the next class that fits, the ${runnerUp.vessel.name}`
      : 'The only class that can lift this parcel and berth at both ends',
    best.slackDays >= 0
      ? `Arrives ${shortDate(best.etaIso)}, ${Math.round(best.slackDays)} days inside the date you need`
      : `Arrives ${shortDate(best.etaIso)}, ${Math.abs(Math.round(best.slackDays))} days past the date you need`,
    `${best.waitDays.toFixed(1)} days of expected waiting at the two ports is already in the cost`,
  ];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 py-12 max-md:px-5 max-md:py-8">
      <Link href="/dashboard" className="ui text-[13.5px] text-frost/45 transition-colors hover:text-snow">
        ← Command centre
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[17px] italic text-ice/70">
            Analysis <span className="num not-italic">{run.id}</span>
          </p>
          <h1 className="plate plate-lg mt-4 text-[clamp(28px,4vw,46px)] text-snow">
            {port(r.loadPort).name} <span className="text-ice">→</span> {port(r.dischargePort).name}
          </h1>
          <p className="mt-5 max-w-[62ch] text-[17px] leading-[1.65] text-frost/70">
            {cargo(r.cargoId).name}, <span className="num">{mt(r.quantityMt)}</span> per voyage
            {r.voyages > 1 && <> across {r.voyages} voyages</>}, wanted by {shortDate(r.arrivalBy)}, optimised for{' '}
            {r.preference}
            {r.specs && <>. {r.specs}</>}
          </p>
        </div>
        <Link
          href="/analysis/new"
          className="ui rounded-[3px] border border-frost/25 px-6 py-3 text-[14.5px] text-frost transition-colors hover:border-ice hover:text-ice"
        >
          New analysis
        </Link>
      </div>

      <div className="mt-10">
        <TileRow>
          <Tile
            label="Delivered freight"
            value={best.fit.ok ? best.usdPerMt.toFixed(2) : '—'}
            note={best.fit.ok ? `USD per tonne, ${usd(best.voyageUsd)} the voyage` : 'no class fits this lane'}
            tone="text-ice"
          />
          <Tile label="Programme" value={usd(best.programUsd)} note={`${r.voyages} voyage${r.voyages === 1 ? '' : 's'} at this rate`} />
          <Tile label="Arrival" value={shortDate(best.etaIso)} note={`${best.totalDays.toFixed(1)} days from fixture`} />
          <Tile
            label="Distance"
            value={Math.round(best.distanceNm).toLocaleString('en-US')}
            note={`nautical miles, ${best.seaDays.toFixed(1)} days at sea`}
          />
        </TileRow>
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <Panel
          title={`${best.vessel.name}, direct call`}
          aside={<RiskPill risk={best.risk} label={`${best.risk} laycan risk`} />}
        >
          <ul>
            {reasons.map((line, i, all) => (
              <li
                key={line}
                className={`flex gap-3 px-7 py-[18px] text-[16px] leading-[1.55] text-frost/80 max-md:px-5 ${
                  i < all.length - 1 ? 'border-b border-slate/60' : ''
                }`}
              >
                <span className="shrink-0 text-mint">✓</span>
                {line}
              </li>
            ))}
          </ul>
          {flagship && (
            <Link
              href="/analysis"
              className="ui flex items-baseline justify-between gap-4 border-t border-slate px-7 py-5 text-[14.5px] text-ice transition-colors hover:bg-ice/6 max-md:px-5"
            >
              Freight forecast and weighted scoring for this lane
              <span aria-hidden>→</span>
            </Link>
          )}
        </Panel>

        <Panel title="Where the days go">
          <dl>
            {[
              ['At sea', `${best.seaDays.toFixed(1)} d`],
              ['Loading and discharging', `${best.portDays.toFixed(1)} d`],
              ['Expected waiting', `${best.waitDays.toFixed(1)} d`],
              ['Weather margin', '1.5 d'],
              ['Total', `${best.totalDays.toFixed(1)} d`],
            ].map(([label, value], i, all) => (
              <div
                key={label}
                className={`flex items-baseline justify-between gap-6 px-7 py-[15px] max-md:px-5 ${
                  i < all.length - 1 ? 'border-b border-slate/60' : 'bg-frost/4'
                }`}
              >
                <dt className={`text-[15px] ${i === all.length - 1 ? 'text-frost/80' : 'text-frost/55'}`}>{label}</dt>
                <dd className={`ui num text-[15px] ${i === all.length - 1 ? 'font-semibold text-snow' : 'text-snow'}`}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className="mt-7">
        <Panel title="Every class, and why" aside={<span className="ui text-[12px] text-frost/45">ranked on {r.preference}</span>}>
          <div className="flex flex-col">
            {options.map((o, i, all) => (
              <div
                key={o.vessel.id}
                className={`grid gap-4 px-7 py-6 max-md:px-5 md:grid-cols-[1fr_1.4fr_auto] md:items-baseline ${
                  i < all.length - 1 ? 'border-b border-slate/60' : ''
                } ${o.fit.ok ? '' : 'opacity-55'}`}
              >
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="plate text-[17px] text-snow">{o.vessel.name}</span>
                    {o === best && <span className="ui rounded-[2px] bg-ice/15 px-2 py-0.5 text-[11.5px] text-ice">Recommended</span>}
                    {!o.fit.ok && <span className="ui rounded-[2px] bg-ember/12 px-2 py-0.5 text-[11.5px] text-ember">Excluded</span>}
                  </div>
                  <div className="ui num mt-2 text-[13.5px] text-frost/40">
                    {o.vessel.dwt.toLocaleString('en-US')} dwt · {o.vessel.ladenDraft.toFixed(1)} m · {o.vessel.speedKn} kn
                  </div>
                </div>
                <p className="text-[15px] leading-[1.5] text-frost/65">{o.fit.reason}</p>
                <div className="md:text-right">
                  <span className="ui num block text-[16px] font-semibold text-snow">
                    {o.fit.ok ? `${o.usdPerMt.toFixed(2)} USD/t` : '—'}
                  </span>
                  <span className="num mt-1 block text-[14px] text-frost/40">
                    {o.fit.ok ? `${o.totalDays.toFixed(1)} d, arrives ${shortDate(o.etaIso)}` : 'not suitable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <p className="mt-8 max-w-[76ch] text-[14.5px] leading-[1.6] text-frost/35">
        Costs are modelled from hire, bunkers, port calls and handling rates at a {mt(r.quantityMt)} parcel. They are not
        a brokered quote.
      </p>
    </div>
  );
}
