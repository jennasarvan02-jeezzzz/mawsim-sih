'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CARGOES, DEFAULT_REQUIREMENT, PORTS, cargo, mt, port, rankOptions, saveRun, shortDate,
  type Preference, type Requirement,
} from '@/lib/freight';
import { Panel } from '@/components/ui';
import RouteMap from '@/components/RouteMap';

const PREFERENCES: { id: Preference; label: string; blurb: string }[] = [
  { id: 'cost', label: 'Cost', blurb: 'Lowest delivered cost per tonne' },
  { id: 'reliability', label: 'Reliability', blurb: 'Most margin against the laycan' },
  { id: 'speed', label: 'Speed', blurb: 'Shortest total voyage' },
  { id: 'risk', label: 'Risk', blurb: 'Least exposure to delay' },
];

const FIELD =
  'ui w-full rounded-[3px] border border-slate bg-ink px-4 py-3 text-[15.5px] text-snow transition-colors placeholder:text-frost/25 focus:border-ice focus:outline-none focus-visible:outline-none [&>option]:bg-hull [&>option]:text-frost';

const LABEL = 'ui mb-2 flex items-baseline justify-between gap-3 text-[13px] text-frost/55';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={LABEL}>
        <span>{label}</span>
        {hint && <span className="text-[12px] text-frost/35">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <Panel title={title} aside={<span className="ui num text-[12px] text-frost/30">{n}</span>}>
      <div className="px-7 py-7 max-md:px-5">{children}</div>
    </Panel>
  );
}

export default function NewAnalysis() {
  const router = useRouter();
  const [req, setReq] = useState<Requirement>(DEFAULT_REQUIREMENT);
  const [showErrors, setShowErrors] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const set = <K extends keyof Requirement>(key: K, value: Requirement[K]) =>
    setReq((prev) => ({ ...prev, [key]: value }));

  const todayIso = new Date().toISOString().slice(0, 10);
  const errors = [
    !(req.quantityMt >= 1000 && req.quantityMt <= 400000) && 'Quantity must sit between 1,000 and 400,000 tonnes per voyage.',
    req.loadPort === req.dischargePort && 'Loading and discharge ports have to differ.',
    !(req.arrivalBy > todayIso) && 'Required arrival has to be a future date.',
    !(req.voyages >= 1 && req.voyages <= 60) && 'Voyages must sit between 1 and 60.',
    !(req.contractMonths >= 1 && req.contractMonths <= 36) && 'Contract duration must sit between 1 and 36 months.',
  ].filter((e): e is string => Boolean(e));

  // Physical feasibility is knowable before the engine runs, so show it while they type.
  const options = errors.length ? [] : rankOptions(req);
  const suitable = options.filter((o) => o.fit.ok);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (errors.length) return;
    router.push(`/analysis/${saveRun(req).id}`);
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-[1240px] px-8 py-12 max-md:px-5 max-md:py-8">
      <p className="text-[17px] italic text-ice/70">New analysis</p>
      <h1 className="plate plate-lg mt-4 max-w-[22ch] text-[clamp(30px,4.2vw,48px)] text-snow">
        What are you moving, and by when
      </h1>
      <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.7] text-frost/72">
        Six answers decide the fixture. Draft limits, handling rates and vessel economics come from the lane you pick —
        you do not type them in.
      </p>

      <div className="mt-11 grid gap-7 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <Step n="01" title="Cargo">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Cargo type">
                <select
                  className={FIELD}
                  value={req.cargoId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setReq((p) => ({ ...p, cargoId: next, quantityMt: cargo(next).defaultQtyMt }));
                  }}
                >
                  {CARGOES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity" hint="tonnes per voyage">
                <input
                  type="number"
                  min={1000}
                  max={400000}
                  step={1000}
                  required
                  className={`${FIELD} num`}
                  value={req.quantityMt}
                  onChange={(e) => set('quantityMt', Number(e.target.value))}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Specification" hint="optional">
                  <input
                    type="text"
                    className={FIELD}
                    placeholder="NAR 5,500 kcal/kg, ash under 12%"
                    value={req.specs}
                    onChange={(e) => set('specs', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Step>

          <Step n="02" title="Route">
            <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-end">
              <Field label="Loading port">
                <select className={FIELD} value={req.loadPort} onChange={(e) => set('loadPort', e.target.value)}>
                  {PORTS.filter((p) => p.role !== 'discharge').map((p) => (
                    <option key={p.code} value={p.code}>{p.name}, {p.country}</option>
                  ))}
                </select>
              </Field>
              <span className="plate pb-3 text-center text-[20px] text-ice max-md:hidden">→</span>
              <Field label="Discharge port" hint={`${port(req.dischargePort).maxDraft.toFixed(1)} m at the berth`}>
                <select
                  className={FIELD}
                  value={req.dischargePort}
                  onChange={(e) => set('dischargePort', e.target.value)}
                >
                  {PORTS.filter((p) => p.role !== 'load').map((p) => (
                    <option key={p.code} value={p.code}>{p.name}, {p.country}</option>
                  ))}
                </select>
              </Field>
            </div>
            
            <button 
              type="button" 
              onClick={() => setShowMap(true)}
              className="mt-6 w-full py-3 bg-ice-deep/20 text-ice font-semibold rounded-[3px] border border-ice-deep/40 hover:bg-ice-deep/30 transition-colors"
            >
              View Interactive Route Map
            </button>
          </Step>

          {showMap && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-navy-900 w-full max-w-5xl h-[70vh] rounded-xl flex flex-col relative border border-slate shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b border-slate bg-hull rounded-t-xl">
                  <h3 className="text-snow text-lg font-bold">Interactive Route Details</h3>
                  <button 
                    type="button" 
                    onClick={() => setShowMap(false)}
                    className="text-frost/60 hover:text-snow text-2xl leading-none"
                  >
                    &times;
                  </button>
                </div>
                <div className="flex-1 w-full bg-[#0A1929] rounded-b-xl overflow-hidden relative">
                  <RouteMap origin={port(req.loadPort)} dest={port(req.dischargePort)} />
                </div>
              </div>
            </div>
          )}

          <Step n="03" title="Planning">
            <div className="grid gap-6 md:grid-cols-3">
              <Field label="Required arrival">
                <input
                  type="date"
                  required
                  min={todayIso}
                  className={`${FIELD} num [color-scheme:dark]`}
                  value={req.arrivalBy}
                  onChange={(e) => set('arrivalBy', e.target.value)}
                />
              </Field>
              <Field label="Contract duration" hint="months">
                <input
                  type="number"
                  min={1}
                  max={36}
                  className={`${FIELD} num`}
                  value={req.contractMonths}
                  onChange={(e) => set('contractMonths', Number(e.target.value))}
                />
              </Field>
              <Field label="Voyages" hint="shipments">
                <input
                  type="number"
                  min={1}
                  max={60}
                  className={`${FIELD} num`}
                  value={req.voyages}
                  onChange={(e) => set('voyages', Number(e.target.value))}
                />
              </Field>
            </div>
          </Step>

          <Step n="04" title="What matters most">
            <div className="grid gap-3 sm:grid-cols-2">
              {PREFERENCES.map((p) => {
                const active = req.preference === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set('preference', p.id)}
                    className={`rounded-[2px] border px-5 py-4 text-left transition-colors ${
                      active ? 'border-ice bg-ice/10' : 'border-slate hover:border-frost/30'
                    }`}
                  >
                    <span className={`ui block text-[15.5px] font-semibold ${active ? 'text-ice' : 'text-snow'}`}>
                      {p.label}
                    </span>
                    <span className="mt-1 block text-[14.5px] leading-[1.45] text-frost/55">{p.blurb}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-5 text-[14.5px] leading-[1.6] text-frost/45">
              Preference only reorders the options that pass. It never promotes a vessel that cannot load the parcel or
              berth at the discharge end.
            </p>
          </Step>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-8">
          <Panel title="The requirement">
            <dl>
              {[
                ['Lane', `${port(req.loadPort).name} → ${port(req.dischargePort).name}`],
                ['Cargo', cargo(req.cargoId).name],
                ['Per voyage', mt(req.quantityMt)],
                ['Programme', `${mt(req.quantityMt * req.voyages)} over ${req.contractMonths} month${req.contractMonths === 1 ? '' : 's'}`],
                ['Wanted by', shortDate(req.arrivalBy)],
                ['Optimised for', PREFERENCES.find((p) => p.id === req.preference)!.label],
              ].map(([label, value], i, all) => (
                <div
                  key={label}
                  className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-7 py-[15px] max-md:px-5 ${
                    i < all.length - 1 ? 'border-b border-slate/60' : ''
                  }`}
                >
                  <dt className="text-[15px] text-frost/60">{label}</dt>
                  <dd className="ui num text-right text-[15px] text-snow">{value}</dd>
                </div>
              ))}
            </dl>

            {showErrors && errors.length > 0 && (
              <ul className="mx-7 mb-6 rounded-[2px] border border-ember/35 bg-ember/8 px-5 py-4 max-md:mx-5">
                {errors.map((e) => (
                  <li key={e} className="text-[14.5px] leading-[1.5] text-ember">{e}</li>
                ))}
              </ul>
            )}

            <div className="border-t border-slate px-7 py-6 max-md:px-5">
              <button
                type="submit"
                className="ui w-full rounded-[3px] bg-ice py-3.5 font-semibold text-ink transition-colors hover:bg-snow"
              >
                Run analysis
              </button>
              <Link
                href="/dashboard"
                className="ui mt-4 block text-center text-[14px] text-frost/45 transition-colors hover:text-snow"
              >
                Back to command centre
              </Link>
            </div>
          </Panel>

          <Panel
            title="Can it even be done"
            aside={
              <span className={`ui text-[12px] ${suitable.length ? 'text-mint' : 'text-amber'}`}>
                {errors.length ? 'pending' : `${suitable.length} of ${options.length} classes fit`}
              </span>
            }
          >
            {errors.length ? (
              <p className="px-7 py-6 text-[14.5px] leading-[1.6] text-frost/45 max-md:px-5">
                Finish the requirement and the physical check runs here, before you commit to anything.
              </p>
            ) : (
              <div className="flex flex-col">
                {options.map((o) => (
                  <div
                    key={o.vessel.id}
                    className="flex items-baseline gap-3 border-b border-slate/60 px-7 py-3.5 last:border-b-0 max-md:px-5"
                  >
                    <span className={`ui shrink-0 text-[13px] ${o.fit.ok ? 'text-mint' : 'text-ember'}`}>
                      {o.fit.ok ? '✓' : '✕'}
                    </span>
                    <span className="ui w-[88px] shrink-0 text-[14.5px] text-snow">{o.vessel.name}</span>
                    <span className="text-[14px] leading-[1.45] text-frost/50">{o.fit.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </form>
  );
}
