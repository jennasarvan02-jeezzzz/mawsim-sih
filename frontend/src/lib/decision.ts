// Freight AI decision engine — Newcastle → Paradip, 75,000 MT thermal coal.
// The recommendation is COMPUTED from the inputs below, not hardcoded, so the
// "why this option" panel can cite real numbers instead of copy.
//
// ponytail: static demo inputs. Swap HISTORICAL/FORECAST/OPTIONS for API data
// when the backend lands — evaluate() doesn't care where the numbers come from.

export const FX = 88.4;                 // ₹ per USD — calibration knob, moves with the market
export const CARGO_MT = 75_000;
export const ARRIVAL_WINDOW_DAYS = 42;  // charterer's laycan
export const TARGET_BUFFER_DAYS = 7;    // buffer beyond this adds no value — early arrival isn't a prize
export const MIN_BUFFER_DAYS = 3;       // below this the option fails the arrival gate
export const PARADIP_MAX_DRAFT_M = 18.5;

export const WEIGHTS = { cost: 0.5, time: 0.25, risk: 0.25 };

// Freight rate, USD/MT, weekly. 12 observed weeks + 6 projected.
export const HISTORICAL = [21.4, 22.1, 21.0, 20.4, 19.8, 20.6, 21.9, 22.8, 22.2, 21.5, 20.9, 20.2];
export const FORECAST = [19.8, 19.3, 18.9, 18.6, 18.4, 18.2];
export const BAND = [0.6, 1.0, 1.4, 1.9, 2.4, 3.0]; // ± USD/MT, widens with horizon

export type Risk = 'Low' | 'Medium' | 'High';
const RISK_SCORE: Record<Risk, number> = { Low: 1, Medium: 0.55, High: 0.2 };

export type VesselOption = {
  id: string;
  name: string;
  vessel: string;
  freightUsdPerMt: number;
  otherUsd: number; // port dues, agency, demurrage provision
  etaDays: number;
  risk: Risk;
  draftM: number;
  note: string;
};

export const OPTIONS: VesselOption[] = [
  {
    id: 'A',
    name: 'Vessel A',
    vessel: 'Panamax · prompt spot',
    freightUsdPerMt: 20.2,
    otherUsd: 95_000,
    etaDays: 26,
    risk: 'Low',
    draftM: 14.2,
    note: 'Single fixture at today’s market rate. Fastest, no exposure to the forecast.',
  },
  {
    id: 'B',
    name: 'Vessel B',
    vessel: 'Supramax × 2 · split parcels',
    freightUsdPerMt: 22.6,
    otherUsd: 140_000,
    etaDays: 31,
    risk: 'Medium',
    draftM: 12.8,
    note: 'Smaller gearing suits any berth, but two fixtures to coordinate and the worst rate per MT.',
  },
  {
    id: 'C',
    name: 'Vessel C',
    vessel: 'Capesize · part cargo',
    freightUsdPerMt: 17.4,
    otherUsd: 260_000,
    etaDays: 41,
    risk: 'High',
    draftM: 18.9,
    note: 'Cheapest per MT, but waits on part-cargo consolidation and needs lightering at Paradip.',
  },
  {
    id: 'D',
    name: 'Multi-Voyage Contract',
    vessel: 'Panamax × 2 · staggered',
    freightUsdPerMt: 18.9,
    otherUsd: 110_000,
    etaDays: 34,
    risk: 'Low',
    draftM: 14.2,
    note: 'Second parcel is priced into the projected decline, so the blended rate beats prompt spot.',
  },
];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const cr = (inr: number) => `₹${(inr / 1e7).toFixed(2)} Cr`;
export const usd = (n: number) => `$${n.toFixed(2)}`;

export function forecastStats() {
  const current = HISTORICAL[HISTORICAL.length - 1];
  const projected = FORECAST[FORECAST.length - 1];
  const band = BAND[BAND.length - 1];
  return {
    current,
    projected,
    band,
    trendPct: ((projected - current) / current) * 100,
    bandPct: (band / projected) * 100,
    horizonWeeks: FORECAST.length,
  };
}

export function evaluate() {
  const priced = OPTIONS.map((o) => {
    const freightUsd = o.freightUsdPerMt * CARGO_MT;
    const totalInr = Math.round((freightUsd + o.otherUsd) * FX); // whole rupees
    const bufferDays = ARRIVAL_WINDOW_DAYS - o.etaDays;
    const gates = [
      {
        label: 'Arrival within laycan',
        pass: bufferDays >= MIN_BUFFER_DAYS,
        detail: `${bufferDays}d buffer on ${ARRIVAL_WINDOW_DAYS}d window · min ${MIN_BUFFER_DAYS}d`,
      },
      {
        label: 'Discharge port draft',
        pass: o.draftM <= PARADIP_MAX_DRAFT_M,
        detail: `${o.draftM.toFixed(1)} m vs Paradip limit ${PARADIP_MAX_DRAFT_M} m`,
      },
    ];
    return { ...o, freightUsd, totalInr, bufferDays, gates, feasible: gates.every((g) => g.pass) };
  });

  const feasible = priced.filter((o) => o.feasible);
  const lo = feasible.length ? Math.min(...feasible.map((o) => o.totalInr)) : 0;
  const hi = feasible.length ? Math.max(...feasible.map((o) => o.totalInr)) : 0;

  const scored = priced.map((o) => {
    // Cheapest feasible option scores 1, dearest 0. Flat 1 if they all cost the same.
    const costScore = !o.feasible ? 0 : hi > lo ? (hi - o.totalInr) / (hi - lo) : 1;
    // Saturating: once the buffer clears TARGET_BUFFER_DAYS, extra days earn nothing.
    const timeScore = clamp01(o.bufferDays / TARGET_BUFFER_DAYS);
    const riskScore = RISK_SCORE[o.risk];
    const score = o.feasible
      ? WEIGHTS.cost * costScore + WEIGHTS.time * timeScore + WEIGHTS.risk * riskScore
      : 0;
    return { ...o, costScore, timeScore, riskScore, score };
  });

  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const best = feasible.length ? ranked[0] : null;
  const nextBest = best ? ranked.find((o) => o.feasible && o.id !== best.id) ?? null : null;
  const saving = best && nextBest ? nextBest.totalInr - best.totalInr : 0;

  // Plain-language drivers — each one cites a figure the engine actually used.
  const f = forecastStats();
  const reasons = !best
    ? []
    : [
        `Freight outlook ${f.trendPct.toFixed(1)}% over ${f.horizonWeeks} weeks — ${usd(best.freightUsdPerMt)}/MT blended vs ${usd(f.current)}/MT today`,
        ...(nextBest && saving > 0
          ? [`${cr(saving)} below next-best feasible option (${nextBest.name})`]
          : []),
        `${best.vessel} available — draft ${best.draftM.toFixed(1)} m clears the Paradip ${PARADIP_MAX_DRAFT_M} m limit`,
        `${best.bufferDays}-day buffer on the ${ARRIVAL_WINDOW_DAYS}-day arrival requirement`,
        `Exposure rated ${best.risk} — ${usd(best.otherUsd / CARGO_MT)}/MT provisioned for port and delay cost`,
      ];

  return { ranked, recommended: best, nextBest, saving, reasons };
}
