'use client';
import { useMemo, useState } from 'react';
import {
  evaluate,
  forecastStats,
  HISTORICAL,
  FORECAST,
  BAND,
  CARGO_MT,
  ARRIVAL_WINDOW_DAYS,
  WEIGHTS,
  FX,
  cr,
  usd,
  type Risk,
} from '@/lib/decision';

const RISK_COLOR: Record<Risk, string> = { Low: '#35C98A', Medium: '#F4B942', High: '#F26D6D' };

/* ── Forecast chart ─────────────────────────────────────────────────────────
   Inline SVG: one measure (USD/MT), one axis, two regimes — observed (solid)
   and projected (dashed + range band). Identity is carried by dash pattern and
   direct labels, not colour alone. */
const W = 760;
const H = 300;
const PAD = { l: 56, r: 20, t: 18, b: 54 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;
const Y_MIN = 14;
const Y_MAX = 24;
const GRID = [14, 16, 18, 20, 22, 24];

const SERIES = [
  ...HISTORICAL.map((v, i) => ({ i, v, band: 0, forecast: false })),
  ...FORECAST.map((v, k) => ({ i: HISTORICAL.length + k, v, band: BAND[k], forecast: true })),
];
const NOW = HISTORICAL.length - 1;
const LAST = SERIES.length - 1;

const px = (i: number) => PAD.l + (PW * i) / LAST;
const py = (v: number) => PAD.t + PH - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * PH;
const path = (pts: typeof SERIES) => pts.map((p, k) => `${k ? 'L' : 'M'}${px(p.i)},${py(p.v)}`).join(' ');

const X_TICKS = [
  { i: 0, label: 'W−11' },
  { i: 5, label: 'W−6' },
  { i: NOW, label: 'NOW' },
  { i: 14, label: 'W+3' },
  { i: LAST, label: 'W+6' },
];

function ForecastChart() {
  const [hover, setHover] = useState<number | null>(null);
  const observed = SERIES.slice(0, NOW + 1);
  const projected = SERIES.slice(NOW); // starts at NOW so the two lines join
  const band = [
    ...projected.map((p) => `${px(p.i)},${py(p.v + p.band)}`),
    ...[...projected].reverse().map((p) => `${px(p.i)},${py(p.v - p.band)}`),
  ].join(' ');

  const hp = hover === null ? null : SERIES[hover];
  const rel = hp ? hp.i - NOW : 0;
  const relLabel = rel === 0 ? 'NOW' : `W${rel > 0 ? '+' : '−'}${Math.abs(rel)}`;
  const flip = hp !== null && hp.i > LAST - 5;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
      aria-label="Freight rate, 12 observed weeks and a 6-week projection with range band, in US dollars per metric tonne">
      {GRID.map((g) => (
        <g key={g}>
          <line x1={PAD.l} x2={PAD.l + PW} y1={py(g)} y2={py(g)} stroke="rgba(255,255,255,0.07)" />
          <text x={PAD.l - 12} y={py(g) + 4} textAnchor="end" fill="#6E8399" fontFamily="JetBrains Mono" fontSize="10">
            {g}
          </text>
        </g>
      ))}

      <polygon points={band} fill="#BAE6FD" fillOpacity="0.1" />
      <line x1={px(NOW)} x2={px(NOW)} y1={PAD.t} y2={PAD.t + PH} stroke="rgba(255,255,255,0.22)" strokeDasharray="3 4" />

      <path d={path(observed)} fill="none" stroke="#7DD3FC" strokeWidth="2" strokeLinejoin="round" />
      <path d={path(projected)} fill="none" stroke="#BAE6FD" strokeWidth="2" strokeDasharray="6 5" strokeLinejoin="round" />

      <text x={px(3)} y={py(23.4)} fill="#7DD3FC" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="0.08em">HISTORICAL</text>
      <text x={px(13)} y={py(22.6)} fill="#BAE6FD" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="0.08em">FORECAST</text>

      {/* endpoints get markers; every other point does not */}
      <circle cx={px(NOW)} cy={py(HISTORICAL[NOW])} r="5" fill="#BAE6FD" stroke="#07131F" strokeWidth="2" />
      <circle cx={px(LAST)} cy={py(FORECAST[FORECAST.length - 1])} r="5" fill="#07131F" stroke="#BAE6FD" strokeWidth="2" />

      {X_TICKS.map((t) => (
        <text key={t.i} x={px(t.i)} y={PAD.t + PH + 24} textAnchor="middle"
          fill={t.i === NOW ? '#BAE6FD' : '#6E8399'} fontFamily="JetBrains Mono" fontSize="10" letterSpacing="0.06em">
          {t.label}
        </text>
      ))}
      <text x={PAD.l - 12} y={PAD.t - 6} textAnchor="end" fill="#6E8399" fontFamily="JetBrains Mono" fontSize="9" letterSpacing="0.08em">USD/MT</text>

      {hp && (
        <g pointerEvents="none">
          <line x1={px(hp.i)} x2={px(hp.i)} y1={PAD.t} y2={PAD.t + PH} stroke="rgba(255,255,255,0.3)" />
          <circle cx={px(hp.i)} cy={py(hp.v)} r="5" fill={hp.forecast ? '#BAE6FD' : '#7DD3FC'} stroke="#07131F" strokeWidth="2" />
          <g transform={`translate(${px(hp.i)},${py(hp.v)})`}>
            <rect x={flip ? -158 : 12} y={-52} width="146" height="62" rx="7" fill="#07131F" fillOpacity="0.96" stroke="rgba(186,230,253,0.28)" />
            <text x={flip ? -144 : 26} y={-34} fill="#6E8399" fontFamily="JetBrains Mono" fontSize="9" letterSpacing="0.08em">
              {`${relLabel} · ${hp.forecast ? 'PROJECTED' : 'OBSERVED'}`}
            </text>
            <text x={flip ? -144 : 26} y={-15} fill="#FFFFFF" fontFamily="JetBrains Mono" fontSize="14">
              {`${usd(hp.v)}/MT`}
              {hp.band ? <tspan dx="8" fill="#6E8399" fontSize="10">{`±${hp.band.toFixed(1)}`}</tspan> : null}
            </text>
            <text x={flip ? -144 : 26} y={1} fill="#A9BBCB" fontFamily="JetBrains Mono" fontSize="10">
              {`≈ ₹${Math.round(hp.v * FX).toLocaleString('en-IN')}/MT`}
            </text>
          </g>
        </g>
      )}

      <rect x={PAD.l} y={PAD.t} width={PW} height={PH} fill="transparent"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * LAST);
          setHover(Math.min(LAST, Math.max(0, i)));
        }}
        onMouseLeave={() => setHover(null)}
      />
    </svg>
  );
}

/* ── Small pieces ───────────────────────────────────────────────────────────── */
function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-[#07131F]/70 p-5">
      <div className="font-mono text-[10px] tracking-[0.1em] text-[#6E8399] uppercase">{label}</div>
      <div className="font-mono text-[22px] mt-2.5" style={{ color: color ?? '#FFFFFF' }}>{value}</div>
      <div className="font-mono text-[10.5px] text-[#6E8399] mt-1.5">{sub}</div>
    </div>
  );
}

function RiskTag({ risk }: { risk: Risk }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[12px]" style={{ color: RISK_COLOR[risk] }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: RISK_COLOR[risk] }} />
      {risk}
    </span>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function Analysis() {
  const { ranked, recommended, saving, reasons } = useMemo(() => evaluate(), []);
  const f = useMemo(() => forecastStats(), []);
  const [detail, setDetail] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07131F] via-[#0a1e35] to-[#07131F] text-[#F3F7FA]">
      {/* ── Header: route, cargo, status ───────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07131F]/85 backdrop-blur-md">
        <div className="max-w-[1240px] mx-auto px-8 max-md:px-5 py-5 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <a href="/" className="font-mono text-[11px] tracking-[0.1em] text-[#6E8399] hover:text-[#BAE6FD] transition-colors uppercase">
              ← Modify inputs
            </a>
            <h1 className="font-display font-black uppercase tracking-tight text-[clamp(26px,4vw,42px)] leading-none mt-2.5 text-white">
              NEWCASTLE <span className="text-[#BAE6FD]">→</span> PARADIP
            </h1>
            <div className="font-mono text-[12.5px] text-[#A9BBCB] mt-2.5 flex items-center gap-2.5 flex-wrap">
              <span>{CARGO_MT.toLocaleString('en-IN')} MT</span>
              <span className="text-[#6E8399]">|</span>
              <span>Thermal Coal</span>
              <span className="text-[#6E8399]">|</span>
              <span>Arrival within {ARRIVAL_WINDOW_DAYS} days</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 font-mono text-[12px] text-[#35C98A] border border-[#35C98A]/30 bg-[#35C98A]/10 rounded-full px-4 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#35C98A]" />
            ANALYSIS COMPLETE
          </div>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-8 max-md:px-5 py-10 grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-8 items-start">
        {/* ── Left: forecast + options ─────────────────────────────── */}
        <div className="flex flex-col gap-8 min-w-0">
          <section className="border border-white/10 bg-white/5 rounded-xl backdrop-blur-sm overflow-hidden">
            <div className="px-7 max-md:px-5 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-display font-bold text-[19px] uppercase tracking-wide text-white">Freight Forecast</h2>
                <p className="font-body text-[13.5px] text-[#A9BBCB] mt-1">
                  Newcastle → East Coast India, Panamax · 12 weeks observed, 6 projected
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.08em] text-[#A9BBCB] uppercase">
                <span className="flex items-center gap-2"><svg width="18" height="2"><line x1="0" y1="1" x2="18" y2="1" stroke="#7DD3FC" strokeWidth="2" /></svg>Historical</span>
                <span className="flex items-center gap-2"><svg width="18" height="2"><line x1="0" y1="1" x2="18" y2="1" stroke="#BAE6FD" strokeWidth="2" strokeDasharray="5 4" /></svg>Forecast</span>
                <span className="flex items-center gap-2"><span className="w-3.5 h-2.5 bg-[#BAE6FD]/25 rounded-sm" />Range</span>
              </div>
            </div>
            <div className="px-3 max-md:px-0 pb-2">
              <ForecastChart />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-white/10 border-t border-white/10">
              <Stat label="Current" value={`${usd(f.current)}/MT`} sub="week 0 market" />
              <Stat label="Projected" value={`${usd(f.projected)}/MT`} sub={`${f.horizonWeeks}-week horizon`} />
              <Stat label="Trend" value={`↓ ${Math.abs(f.trendPct).toFixed(1)}%`} sub="softening" color="#35C98A" />
              <Stat label="Uncertainty" value={`±${usd(f.band)}`} sub={`±${f.bandPct.toFixed(1)}% at horizon`} color="#F4B942" />
            </div>
          </section>

          <section className="border border-white/10 bg-white/5 rounded-xl backdrop-blur-sm overflow-hidden">
            <div className="px-7 max-md:px-5 pt-6 pb-5">
              <h2 className="font-display font-bold text-[19px] uppercase tracking-wide text-white">Options</h2>
              <p className="font-body text-[13.5px] text-[#A9BBCB] mt-1">
                Ranked on delivered cost, arrival buffer and exposure. Options failing a feasibility gate are excluded before ranking.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-y border-white/10 bg-white/5 font-mono text-[10px] tracking-[0.1em] text-[#6E8399] uppercase">
                    <th className="text-left font-normal px-7 max-md:px-5 py-3">Option</th>
                    <th className="text-right font-normal px-4 py-3">Cost</th>
                    <th className="text-right font-normal px-4 py-3">Freight</th>
                    <th className="text-right font-normal px-4 py-3">ETA</th>
                    <th className="text-left font-normal px-4 py-3">Risk</th>
                    <th className="text-left font-normal px-7 max-md:px-5 py-3 w-[110px]">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((o) => {
                    const isRec = o.id === recommended?.id;
                    const failed = o.gates.filter((g) => !g.pass);
                    return (
                      <tr key={o.id}
                        className={`border-b border-white/5 align-top transition-colors ${
                          isRec ? 'bg-[#BAE6FD]/[0.07]' : o.feasible ? 'hover:bg-white/5' : 'opacity-55'
                        }`}>
                        <td className={`px-7 max-md:px-5 py-5 ${isRec ? 'border-l-2 border-l-[#BAE6FD]' : 'border-l-2 border-l-transparent'}`}>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-display font-bold text-[15px] text-white uppercase tracking-wide">{o.name}</span>
                            {isRec && (
                              <span className="font-mono text-[9.5px] tracking-[0.12em] text-[#07131F] bg-[#BAE6FD] px-2 py-[3px] rounded uppercase">
                                Recommended
                              </span>
                            )}
                            {!o.feasible && (
                              <span className="font-mono text-[9.5px] tracking-[0.12em] text-[#F26D6D] border border-[#F26D6D]/40 px-2 py-[3px] rounded uppercase">
                                Excluded
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11.5px] text-[#6E8399] mt-1.5">{o.vessel}</div>
                          {failed.map((g) => (
                            <div key={g.label} className="font-mono text-[11px] text-[#F26D6D] mt-1.5">
                              ✕ {g.label} — {g.detail}
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-5 text-right font-mono text-[14px] text-white whitespace-nowrap">{cr(o.totalInr)}</td>
                        <td className="px-4 py-5 text-right font-mono text-[13px] text-[#A9BBCB] whitespace-nowrap">{usd(o.freightUsdPerMt)}/MT</td>
                        <td className="px-4 py-5 text-right font-mono text-[13px] text-white whitespace-nowrap">
                          {o.etaDays} days
                          <span className="block text-[10.5px] text-[#6E8399] mt-0.5">{o.bufferDays}d buffer</span>
                        </td>
                        <td className="px-4 py-5"><RiskTag risk={o.risk} /></td>
                        <td className="px-7 max-md:px-5 py-5">
                          <div className="font-mono text-[13px] text-white">{o.score.toFixed(2)}</div>
                          <div className="h-[3px] bg-white/10 rounded-full mt-2 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${o.score * 100}%`, background: isRec ? '#BAE6FD' : '#4E7894' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* ── Right: recommendation + explanation ──────────────────── */}
        <aside className="lg:sticky lg:top-37 lg:max-h-[calc(100vh-172px)] lg:overflow-y-auto">
          {recommended ? (
            <div className="border border-[#BAE6FD]/30 bg-[#BAE6FD]/[0.06] rounded-xl backdrop-blur-sm overflow-hidden shadow-[0_0_40px_rgba(25,181,254,0.08)]">
              <div className="px-7 max-md:px-5 py-4 border-b border-[#BAE6FD]/20 bg-[#BAE6FD]/10">
                <div className="font-mono text-[10px] tracking-[0.14em] text-[#BAE6FD] uppercase">Recommended Option</div>
              </div>
              <div className="px-7 max-md:px-5 py-7">
                <div className="font-display font-black text-[clamp(22px,2.6vw,29px)] leading-[1.1] uppercase text-white tracking-tight">
                  {recommended.name}
                </div>
                <div className="font-mono text-[12px] text-[#A9BBCB] mt-2.5">{recommended.vessel}</div>

                <div className="mt-8 flex flex-col gap-6">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.1em] text-[#6E8399] uppercase">Estimated Cost</div>
                    <div className="font-mono text-[28px] text-white mt-1.5">{cr(recommended.totalInr)}</div>
                    <div className="font-mono text-[10.5px] text-[#6E8399] mt-1">
                      {usd(recommended.freightUsdPerMt)}/MT freight + port & demurrage provision
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.1em] text-[#6E8399] uppercase">Potential Saving</div>
                    <div className="font-mono text-[28px] text-[#35C98A] mt-1.5">{cr(saving)}</div>
                    <div className="font-mono text-[10.5px] text-[#6E8399] mt-1">vs. next-best feasible option</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[1px] bg-white/10 mt-8 rounded-lg overflow-hidden">
                  <div className="bg-[#07131F]/60 p-4">
                    <div className="font-mono text-[10px] tracking-[0.1em] text-[#6E8399] uppercase">Risk</div>
                    <div className="font-mono text-[15px] mt-2 uppercase" style={{ color: RISK_COLOR[recommended.risk] }}>
                      {recommended.risk}
                    </div>
                  </div>
                  <div className="bg-[#07131F]/60 p-4">
                    <div className="font-mono text-[10px] tracking-[0.1em] text-[#6E8399] uppercase">Feasibility</div>
                    <div className="font-mono text-[15px] mt-2 text-[#35C98A] uppercase">Pass</div>
                  </div>
                </div>

                <div className="mt-8 pt-7 border-t border-white/10">
                  <div className="font-mono text-[10px] tracking-[0.14em] text-[#BAE6FD] uppercase">Why this option?</div>
                  <ul className="mt-5 flex flex-col gap-3.5 list-none p-0 m-0">
                    {reasons.map((r) => (
                      <li key={r} className="flex gap-3 font-body text-[13.5px] leading-[1.55] text-[#DCE8F2]">
                        <span className="text-[#35C98A] shrink-0 font-mono">✓</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setDetail((d) => !d)}
                  aria-expanded={detail}
                  className="mt-8 w-full font-body font-semibold text-[13.5px] py-3 rounded-full border border-[#BAE6FD]/40 text-[#BAE6FD] hover:bg-[#BAE6FD] hover:text-[#07131F] transition-colors cursor-pointer"
                >
                  {detail ? 'Hide Detailed Analysis' : 'View Detailed Analysis'}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-[#F26D6D]/30 bg-[#F26D6D]/[0.06] rounded-xl p-7">
              <div className="font-mono text-[10px] tracking-[0.14em] text-[#F26D6D] uppercase">No feasible option</div>
              <p className="font-body text-[13.5px] text-[#DCE8F2] mt-3 leading-[1.55]">
                Every option fails a feasibility gate. Relax the arrival window or review the discharge-port constraint.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ── Detailed analysis: how the score was reached ───────────── */}
      <div className="max-w-[1240px] mx-auto px-8 max-md:px-5">
        <div className="overflow-hidden transition-[max-height,opacity] duration-500 ease-out" style={{ maxHeight: detail ? '1400px' : '0', opacity: detail ? 1 : 0 }}>
          <section className="border border-white/10 bg-white/5 rounded-xl backdrop-blur-sm overflow-hidden mb-12">
            <div className="px-7 max-md:px-5 pt-6 pb-5">
              <h2 className="font-display font-bold text-[19px] uppercase tracking-wide text-white">Detailed Analysis</h2>
              <p className="font-body text-[13.5px] text-[#A9BBCB] mt-1 max-w-[80ch]">
                Each option is gated on feasibility, then scored 0–1 on three axes and combined at fixed weights —
                cost {WEIGHTS.cost * 100}%, arrival buffer {WEIGHTS.time * 100}%, risk {WEIGHTS.risk * 100}%.
                Arrival buffer saturates: clearing the window is required, arriving early earns nothing extra.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-y border-white/10 bg-white/5 font-mono text-[10px] tracking-[0.1em] text-[#6E8399] uppercase">
                    <th className="text-left font-normal px-7 max-md:px-5 py-3">Option</th>
                    <th className="text-right font-normal px-4 py-3">Cost {WEIGHTS.cost}</th>
                    <th className="text-right font-normal px-4 py-3">Buffer {WEIGHTS.time}</th>
                    <th className="text-right font-normal px-4 py-3">Risk {WEIGHTS.risk}</th>
                    <th className="text-right font-normal px-4 py-3">Weighted</th>
                    <th className="text-left font-normal px-7 max-md:px-5 py-3">Gates</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((o) => (
                    <tr key={o.id} className={`border-b border-white/5 align-top ${o.feasible ? '' : 'opacity-55'}`}>
                      <td className="px-7 max-md:px-5 py-4">
                        <div className="font-display font-bold text-[14px] text-white uppercase tracking-wide">{o.name}</div>
                        <div className="font-body text-[12px] text-[#6E8399] mt-1.5 max-w-[42ch] leading-[1.5]">{o.note}</div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-[13px] text-[#A9BBCB]">{o.costScore.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-mono text-[13px] text-[#A9BBCB]">{o.timeScore.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-mono text-[13px] text-[#A9BBCB]">{o.riskScore.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-mono text-[14px] text-white">{o.score.toFixed(3)}</td>
                      <td className="px-7 max-md:px-5 py-4">
                        {o.gates.map((g) => (
                          <div key={g.label} className="font-mono text-[11px] mt-0.5 first:mt-0" style={{ color: g.pass ? '#35C98A' : '#F26D6D' }}>
                            {g.pass ? '✓' : '✕'} <span className="text-[#A9BBCB]">{g.label} — {g.detail}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-7 max-md:px-5 py-5 border-t border-white/10 font-mono text-[10.5px] text-[#6E8399] leading-[1.7]">
              Costs converted at ₹{FX}/USD. Freight forecast is a projection, not a quote — the range band widens with horizon.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
