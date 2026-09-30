// Reference data + a deterministic voyage estimator.
// ponytail: static tables and a linear cost model stand in for the real engine.
// Swap estimate() for the API call when the backend lands — ROUTE_FACTOR,
// FUEL_USD_PER_T, hire rates and handling rates are the calibration knobs.

export type Preference = 'cost' | 'reliability' | 'speed' | 'risk';

export type Port = {
  code: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  maxDraft: number; // metres
  congestionDays: number; // typical wait at anchorage
  role: 'load' | 'discharge' | 'both';
};

export type Cargo = {
  id: string;
  name: string;
  defaultQtyMt: number;
  loadRate: number; // MT/day
  dischRate: number; // MT/day
};

export type Vessel = {
  id: string;
  name: string;
  dwt: number;
  ladenDraft: number; // metres
  speedKn: number;
  hireUsdPerDay: number;
  bunkerTpd: number; // tonnes/day at sea
  portCallUsd: number; // per call, both ends charged
};

export type Requirement = {
  cargoId: string;
  quantityMt: number;
  specs: string;
  loadPort: string; // port code
  dischargePort: string; // port code
  arrivalBy: string; // yyyy-mm-dd
  contractMonths: number;
  voyages: number;
  preference: Preference;
};

export type Run = {
  id: string;
  createdAt: string;
  requirement: Requirement;
};

export type Risk = 'Low' | 'Medium' | 'High';

/**
 * A what-if perturbation of market and operating conditions. All fields are
 * fractional deltas (0.3 = +30%); omitted or zero means "as today", and a
 * zero shock reproduces the unshocked estimate exactly.
 */
export type Shock = {
  hirePct?: number; // charter market move — the freight rate lever
  congestionPct?: number; // extra waiting at anchorage, both ends
  speedPct?: number; // vessel speed, e.g. slow steaming to save bunkers
};

export type Estimate = {
  vessel: Vessel;
  utilization: number; // 0..1 of dwt
  fit: { ok: boolean; reason: string };
  distanceNm: number;
  seaDays: number;
  portDays: number;
  waitDays: number;
  totalDays: number;
  etaIso: string;
  slackDays: number; // vs required arrival; negative = late
  risk: Risk;
  usdPerMt: number;
  voyageUsd: number;
  programUsd: number; // across all voyages in the requirement
};

export const PORTS: Port[] = [
  { code: 'NTL', name: 'Newcastle', country: 'Australia', lat: -32.92, lon: 151.78, maxDraft: 16.5, congestionDays: 1.5, role: 'load' },
  { code: 'HPT', name: 'Hay Point', country: 'Australia', lat: -21.27, lon: 149.31, maxDraft: 19.0, congestionDays: 2.0, role: 'load' },
  { code: 'DAM', name: 'Dampier', country: 'Australia', lat: -20.66, lon: 116.71, maxDraft: 19.0, congestionDays: 1.0, role: 'load' },
  { code: 'RBY', name: 'Richards Bay', country: 'South Africa', lat: -28.8, lon: 32.08, maxDraft: 17.5, congestionDays: 3.0, role: 'load' },
  { code: 'TBN', name: 'Taboneo', country: 'Indonesia', lat: -3.68, lon: 114.44, maxDraft: 14.0, congestionDays: 2.5, role: 'load' },
  { code: 'TUB', name: 'Tubarão', country: 'Brazil', lat: -20.28, lon: -40.24, maxDraft: 20.0, congestionDays: 2.0, role: 'load' },
  { code: 'PRD', name: 'Paradip', country: 'India', lat: 20.26, lon: 86.67, maxDraft: 18.0, congestionDays: 2.5, role: 'discharge' },
  { code: 'VTZ', name: 'Visakhapatnam', country: 'India', lat: 17.68, lon: 83.28, maxDraft: 16.5, congestionDays: 3.0, role: 'both' },
  { code: 'GGV', name: 'Gangavaram', country: 'India', lat: 17.6, lon: 83.24, maxDraft: 21.0, congestionDays: 1.5, role: 'discharge' },
  { code: 'HDA', name: 'Haldia', country: 'India', lat: 22.03, lon: 88.1, maxDraft: 8.5, congestionDays: 4.0, role: 'discharge' },
  { code: 'KRP', name: 'Krishnapatnam', country: 'India', lat: 14.28, lon: 80.12, maxDraft: 18.0, congestionDays: 2.0, role: 'discharge' },
  { code: 'ENR', name: 'Kamarajar (Ennore)', country: 'India', lat: 13.24, lon: 80.33, maxDraft: 16.0, congestionDays: 2.5, role: 'discharge' },
  { code: 'TUT', name: 'Tuticorin', country: 'India', lat: 8.75, lon: 78.2, maxDraft: 12.8, congestionDays: 2.0, role: 'discharge' },
  { code: 'MUN', name: 'Mundra', country: 'India', lat: 22.74, lon: 69.7, maxDraft: 17.5, congestionDays: 1.5, role: 'discharge' },
];

export const CARGOES: Cargo[] = [
  { id: 'thermal-coal', name: 'Thermal Coal', defaultQtyMt: 75000, loadRate: 25000, dischRate: 18000 },
  { id: 'coking-coal', name: 'Coking Coal', defaultQtyMt: 70000, loadRate: 22000, dischRate: 16000 },
  { id: 'iron-ore', name: 'Iron Ore', defaultQtyMt: 110000, loadRate: 40000, dischRate: 25000 },
  { id: 'bauxite', name: 'Bauxite', defaultQtyMt: 55000, loadRate: 20000, dischRate: 14000 },
  { id: 'limestone', name: 'Limestone', defaultQtyMt: 45000, loadRate: 18000, dischRate: 12000 },
  { id: 'urea', name: 'Urea / Fertiliser', defaultQtyMt: 40000, loadRate: 9000, dischRate: 6000 },
  { id: 'petcoke', name: 'Petroleum Coke', defaultQtyMt: 50000, loadRate: 15000, dischRate: 10000 },
];

export const VESSELS: Vessel[] = [
  { id: 'handysize', name: 'Handysize', dwt: 38000, ladenDraft: 10.5, speedKn: 12.5, hireUsdPerDay: 11500, bunkerTpd: 18, portCallUsd: 45000 },
  { id: 'supramax', name: 'Supramax', dwt: 58000, ladenDraft: 12.8, speedKn: 13.0, hireUsdPerDay: 15000, bunkerTpd: 22, portCallUsd: 55000 },
  { id: 'panamax', name: 'Panamax', dwt: 82000, ladenDraft: 14.2, speedKn: 13.5, hireUsdPerDay: 17500, bunkerTpd: 26, portCallUsd: 70000 },
  { id: 'capesize', name: 'Capesize', dwt: 180000, ladenDraft: 18.2, speedKn: 13.0, hireUsdPerDay: 26000, bunkerTpd: 38, portCallUsd: 120000 },
];

const ROUTE_FACTOR = 1.25; // great-circle → actual sailed distance (calibrated on NTL→PRD ≈ 6,400 nm)
const FUEL_USD_PER_T = 620; // VLSFO
const WEATHER_MARGIN_DAYS = 1.5;
const LAYCAN_LEAD_DAYS = 7; // earliest a fixture can start loading

export const port = (code: string) => PORTS.find((p) => p.code === code)!;
export const cargo = (id: string) => CARGOES.find((c) => c.id === id)!;

/** Great-circle distance in nautical miles. */
export function greatCircleNm(a: Port, b: Port): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.asin(Math.sqrt(h));
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

const today = () => new Date().toISOString().slice(0, 10);

function daysBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000;
}

/** Single-voyage estimate for one vessel class against a requirement. */
export function estimate(req: Requirement, vessel: Vessel, todayIso = new Date().toISOString().slice(0, 10)): Estimate {
  const load = port(req.loadPort);
  const disch = port(req.dischargePort);
  const c = cargo(req.cargoId);

  const distanceNm = greatCircleNm(load, disch) * ROUTE_FACTOR;
  const seaDays = distanceNm / (vessel.speedKn * 24);
  const parcel = Math.min(req.quantityMt, vessel.dwt * 0.97);
  const portDays = parcel / c.loadRate + parcel / c.dischRate;
  const waitDays = load.congestionDays + disch.congestionDays;
  const totalDays = seaDays + portDays + waitDays + WEATHER_MARGIN_DAYS;

  const utilization = req.quantityMt / vessel.dwt;
  const maxDraft = Math.min(load.maxDraft, disch.maxDraft);
  const fit = !(vessel.ladenDraft <= maxDraft)
    ? { ok: false, reason: `Laden draft ${vessel.ladenDraft}m exceeds ${maxDraft}m limit at ${vessel.ladenDraft > load.maxDraft ? load.name : disch.name}` }
    : utilization > 0.97
      ? { ok: false, reason: `Cargo exceeds capacity — ${Math.ceil(req.quantityMt / (vessel.dwt * 0.97))} parcels needed per voyage` }
      : utilization < 0.55
        ? { ok: false, reason: `Only ${Math.round(utilization * 100)}% utilised — paying for unused capacity` }
        : { ok: true, reason: `${Math.round(utilization * 100)}% utilised, clears ${maxDraft}m draft limit` };

  const voyageUsd =
    totalDays * (vessel.hireUsdPerDay + vessel.bunkerTpd * FUEL_USD_PER_T) +
    vessel.portCallUsd * 2;

  const etaIso = addDays(addDays(todayIso, LAYCAN_LEAD_DAYS), totalDays);
  const slackDays = daysBetween(etaIso, req.arrivalBy);

  return {
    vessel,
    utilization,
    fit,
    distanceNm,
    seaDays,
    portDays,
    waitDays,
    totalDays,
    etaIso,
    slackDays,
    risk: slackDays >= 7 ? 'Low' : slackDays >= 0 ? 'Medium' : 'High',
    usdPerMt: voyageUsd / parcel,
    voyageUsd,
    programUsd: voyageUsd * Math.max(1, req.voyages),
  };
}

const RISK_ORDER: Record<Risk, number> = { Low: 0, Medium: 1, High: 2 };

/**
 * Every vessel class scored against the requirement, best first.
 * Unsuitable classes sort last but stay visible — the user needs to see why.
 */
export function rankOptions(req: Requirement, todayIso?: string): Estimate[] {
  const byPreference: Record<Preference, (a: Estimate, b: Estimate) => number> = {
    cost: (a, b) => a.usdPerMt - b.usdPerMt,
    speed: (a, b) => a.totalDays - b.totalDays,
    reliability: (a, b) => b.slackDays - a.slackDays || a.usdPerMt - b.usdPerMt,
    risk: (a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || b.slackDays - a.slackDays,
  };
  return VESSELS.map((v) => estimate(req, v, todayIso)).sort(
    (a, b) => Number(b.fit.ok) - Number(a.fit.ok) || byPreference[req.preference](a, b),
  );
}

export const DEFAULT_REQUIREMENT: Requirement = {
  cargoId: 'thermal-coal',
  quantityMt: 75000,
  specs: '',
  loadPort: 'NTL',
  dischargePort: 'PRD',
  arrivalBy: addDays(today(), 45),
  contractMonths: 3,
  voyages: 1,
  preference: 'cost',
};

// --- run storage -----------------------------------------------------------
// ponytail: sessionStorage + seeded demo rows until there's an API to POST to.

const KEY = 'freight.runs';

/** Seeded so the Command Center has something to show on a cold open. */
export const DEMO_RUNS: Run[] = [
  {
    id: 'K7X2QA',
    createdAt: addDays(today(), -2),
    requirement: {
      cargoId: 'thermal-coal', quantityMt: 75000, specs: 'NAR 5,500 kcal/kg',
      loadPort: 'NTL', dischargePort: 'PRD', arrivalBy: addDays(today(), 48),
      contractMonths: 3, voyages: 4, preference: 'cost',
    },
  },
  {
    id: 'M3D8RB',
    createdAt: addDays(today(), -5),
    requirement: {
      cargoId: 'coking-coal', quantityMt: 150000, specs: 'Low-vol PCI',
      loadPort: 'HPT', dischargePort: 'GGV', arrivalBy: addDays(today(), 39),
      contractMonths: 1, voyages: 1, preference: 'speed',
    },
  },
  {
    id: 'P9F1TC',
    createdAt: addDays(today(), -9),
    requirement: {
      cargoId: 'thermal-coal', quantityMt: 42000, specs: 'GAR 4,200 kcal/kg',
      loadPort: 'TBN', dischargePort: 'TUT', arrivalBy: addDays(today(), 25),
      contractMonths: 6, voyages: 6, preference: 'reliability',
    },
  },
];

function sessionRuns(): Run[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as Run[];
  } catch {
    return [];
  }
}

export const loadRuns = (): Run[] => [...sessionRuns(), ...DEMO_RUNS];

export function saveRun(requirement: Requirement): Run {
  const run: Run = {
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
    requirement,
  };
  sessionStorage.setItem(KEY, JSON.stringify([run, ...sessionRuns()].slice(0, 20)));
  return run;
}

export const getRun = (id: string) => loadRuns().find((r) => r.id === id);

// --- formatting ------------------------------------------------------------

export const usd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString('en-US')}`;

export const mt = (n: number) => `${n.toLocaleString('en-US')} MT`;

export const shortDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
