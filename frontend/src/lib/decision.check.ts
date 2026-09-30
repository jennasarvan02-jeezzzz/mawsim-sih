// Self-check for the decision engine. No test framework — run it directly:
//   npx tsx src/lib/decision.check.ts
import assert from 'node:assert/strict';
import { evaluate, forecastStats, OPTIONS, WEIGHTS, MIN_BUFFER_DAYS, PARADIP_MAX_DRAFT_M } from './decision';

const { ranked, recommended, nextBest, saving, reasons } = evaluate();
const by = (id: string) => ranked.find((o) => o.id === id)!;

// The engine ranks — it does not read a "recommended" flag off the data.
assert.equal(recommended!.id, 'D', 'multi-voyage contract should win on cost at equal risk');
assert.equal(ranked[0].id, 'D');
assert.equal(nextBest!.id, 'A');

// Feasibility gates run before scoring: C busts both draft and laycan.
assert.equal(by('C').feasible, false);
assert.equal(by('C').score, 0, 'excluded options must not be scored');
assert.ok(by('C').draftM > PARADIP_MAX_DRAFT_M);
assert.ok(by('C').bufferDays < MIN_BUFFER_DAYS);
assert.ok(['A', 'B', 'D'].every((id) => by(id).feasible));

// Money: freight × tonnage + fixed, converted once.
assert.equal(by('A').totalInr, 142_324_000);
assert.equal(by('D').totalInr, 135_031_000);
assert.equal(saving, by('A').totalInr - by('D').totalInr);
assert.ok(saving > 0, 'a recommendation dearer than the alternative needs a non-cost reason');

// Cheapest feasible option scores 1 on cost, dearest 0, and scores stay in range.
assert.equal(by('D').costScore, 1);
assert.equal(by('B').costScore, 0);
for (const o of ranked) assert.ok(o.score >= 0 && o.score <= 1, `${o.id} score out of range`);
assert.ok(Math.abs(by('D').score - 1) < 1e-9, 'best-on-every-axis option should score 1.00');

// Buffer is saturating, not maximised: A arrives 8 days earlier than D and gains nothing for it.
assert.ok(by('A').bufferDays > by('D').bufferDays);
assert.equal(by('A').timeScore, by('D').timeScore);
assert.ok(by('D').score > by('A').score, 'arriving early must not outrank arriving cheaper');

// Weights are a convex combination, or the 0..1 score range is a lie.
assert.equal(WEIGHTS.cost + WEIGHTS.time + WEIGHTS.risk, 1);

// Every reason cites a computed figure.
assert.ok(reasons.length >= 4);
assert.ok(reasons.some((r) => r.includes('below next-best')));
assert.ok(reasons.every((r) => /\d/.test(r)), 'a reason with no number is decoration');

// Forecast summary matches the series it summarises.
const f = forecastStats();
assert.equal(f.current, 20.2);
assert.equal(f.projected, 18.2);
assert.ok(f.trendPct < 0, 'declining forecast is what makes the multi-voyage option pay');

assert.equal(OPTIONS.length, 4);
console.log(`ok — ${ranked.length} options, recommended ${recommended!.id} @ ${recommended!.score.toFixed(3)}`);
