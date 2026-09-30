// Self-check for the estimator. Run: node src/lib/freight.check.ts
import assert from 'node:assert/strict';
import { DEFAULT_REQUIREMENT, estimate, rankOptions, VESSELS, port, greatCircleNm } from './freight.ts';

const TODAY = '2026-01-01';
const vessel = (id: string) => VESSELS.find((v) => v.id === id)!;
const req = { ...DEFAULT_REQUIREMENT, arrivalBy: '2026-03-15', voyages: 4 };

// Distance: Newcastle → Paradip is ~6,400 nm by sea.
const d = greatCircleNm(port('NTL'), port('PRD'));
assert.ok(d > 4500 && d < 5500, `great-circle NTL→PRD out of range: ${d}`);
assert.equal(greatCircleNm(port('PRD'), port('NTL')).toFixed(6), d.toFixed(6));
assert.equal(greatCircleNm(port('PRD'), port('PRD')), 0);

// 75,000 MT thermal coal on a Panamax: fits, and the money lands in a sane band.
const pmx = estimate(req, vessel('panamax'), TODAY);
assert.ok(pmx.fit.ok, `panamax should fit: ${pmx.fit.reason}`);
assert.ok(pmx.usdPerMt > 10 && pmx.usdPerMt < 35, `usdPerMt out of band: ${pmx.usdPerMt}`);
assert.ok(pmx.totalDays > 25 && pmx.totalDays < 40, `totalDays out of band: ${pmx.totalDays}`);
assert.equal(pmx.programUsd, pmx.voyageUsd * 4);
assert.ok(Math.abs(pmx.usdPerMt * 75000 - pmx.voyageUsd) < 1, 'per-MT must reconcile with voyage cost');

// Capesize is knocked out by Paradip's 18.0 m draft limit, not by capacity.
const cape = estimate(req, vessel('capesize'), TODAY);
assert.equal(cape.fit.ok, false);
assert.match(cape.fit.reason, /draft/i);

// Handysize can't lift the parcel at all.
assert.match(estimate(req, vessel('handysize'), TODAY).fit.reason, /exceeds capacity/i);

// Under-utilisation is a fit failure too: 30,000 MT on a Panamax.
assert.match(estimate({ ...req, quantityMt: 30000 }, vessel('panamax'), TODAY).fit.reason, /utilised/i);

// Risk tracks slack against the required arrival date.
assert.equal(estimate({ ...req, arrivalBy: '2026-06-01' }, vessel('panamax'), TODAY).risk, 'Low');
assert.equal(estimate({ ...req, arrivalBy: '2026-02-05' }, vessel('panamax'), TODAY).risk, 'Medium');
assert.equal(estimate({ ...req, arrivalBy: '2026-01-10' }, vessel('panamax'), TODAY).risk, 'High');

// Ranking: suitable vessels first, then ordered by the stated preference.
const ranked = rankOptions(req, TODAY);
assert.equal(ranked.length, VESSELS.length, 'every class stays visible');
assert.equal(ranked[0].vessel.id, 'panamax');
assert.deepEqual(
  ranked.map((e) => e.fit.ok),
  [...ranked.map((e) => e.fit.ok)].sort((a, b) => Number(b) - Number(a)),
  'unsuitable options must sort last',
);
const cheap = rankOptions({ ...req, quantityMt: 160000, dischargePort: 'GGV', preference: 'cost' }, TODAY);
const fast = rankOptions({ ...req, quantityMt: 160000, dischargePort: 'GGV', preference: 'speed' }, TODAY);
assert.equal(cheap[0].vessel.id, 'capesize', 'Gangavaram takes 21 m draft, so Capesize is available there');
assert.ok(fast[0].totalDays <= cheap[0].totalDays, 'speed preference cannot be slower than cost preference');

console.log('freight.ts ok —', `${Math.round(pmx.distanceNm)} nm, ${pmx.totalDays.toFixed(1)} days, $${pmx.usdPerMt.toFixed(2)}/MT`);
