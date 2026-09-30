'use client';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import FreightGlobe from '@/components/FreightGlobe';

const EASE = [0.16, 1, 0.3, 1] as const;

/** Section content rises once as it comes into view. Honours reduced motion. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const still = useReducedMotion();
  if (still) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const LAYERS = [
  {
    name: 'Freight forecast',
    body: 'Where rates on this specific route are heading over the laycan window, and how much confidence sits behind that outlook.',
    catches: 'Catches: fixing at the top of a rate spike that unwinds inside the week.',
  },
  {
    name: 'Vessel fit',
    body: 'Whether the vessel sizes actually on offer can carry this parcel on this route without a part cargo or a lightering call.',
    catches: 'Catches: a Capesize booked against a berth that can only work Panamaxes.',
  },
  {
    name: 'Port feasibility',
    body: 'Draft at the berth, berth length, and grab or conveyor discharge rates at both ends of the voyage.',
    catches: 'Catches: a laden draft that only clears the channel on a spring tide.',
  },
  {
    name: 'Cost, arrival and exposure',
    body: 'Delivered cost per tonne, the arrival date against the laycan, and where demurrage or delay exposure sits.',
    catches: 'Catches: a cheaper freight rate that costs more once waiting days are priced.',
  },
  {
    name: 'The recommendation',
    body: 'One ranked option, the runner-up it beat, and the reasoning written out so a charterer can argue with it.',
    catches: 'Catches: nothing — this is where the other four are made to agree.',
  },
];

const MOVERS = [
  {
    name: 'Freight rate',
    left: 0,
    width: 30,
    cadence: 'settles weekly',
    volatile: false,
    detail:
      'Route-specific rates print on an index once a week. Between prints the desk is working from the last number and a phone call.',
  },
  {
    name: 'Vessel availability',
    left: 14,
    width: 41,
    cadence: 'turns over daily',
    volatile: false,
    detail:
      'Open tonnage in the right position changes every day. The vessel that fits this cargo may already be fixed elsewhere by tomorrow.',
  },
  {
    name: 'Port constraints',
    left: 66,
    width: 22,
    cadence: 'fixed until the next dredging cycle',
    volatile: false,
    detail:
      'Draft, berth length and discharge rates barely move — which is exactly why a vessel that does not fit them never becomes an option.',
  },
  {
    name: 'Congestion',
    left: 8,
    width: 84,
    cadence: 'moves hour to hour',
    volatile: true,
    detail:
      'The queue at the discharge port is the fastest-moving input and the one most often priced from rumour. It is also what turns into demurrage.',
  },
  {
    name: 'Transit time',
    left: 36,
    width: 27,
    cadence: 'derived from all four above',
    volatile: false,
    detail:
      'Not an input at all. It falls out of vessel speed, routing and waiting time, so it moves whenever any of those do.',
  },
];

const FAQS = [
  {
    q: 'What does Freight AI actually decide?',
    a: 'It ranks the chartering options for one cargo movement — vessel class, port pairing and timing — and shows the delivered cost, arrival date and risk behind each one. The fixture stays a human decision; the comparison stops being a guess.',
  },
  {
    q: 'Who is it built for?',
    a: 'Freight and procurement desks moving bulk parcels into India’s East Coast ports, where draft limits and monsoon congestion change what a good fixture looks like several times a season.',
  },
  {
    q: 'Is this just a rate forecast with extra steps?',
    a: 'No. A rate forecast that ignores a 14.2 metre draft limit will recommend a vessel that cannot berth. Forecasting is one of five layers, and the others can overrule it.',
  },
  {
    q: 'How does it handle a condition changing mid-voyage?',
    a: 'Change one input — congestion, a rate move, a berth going out of service — and every dependent output recalculates. If the recommendation no longer ranks first, it says so and names its replacement.',
  },
  {
    q: 'Where does the port data come from?',
    a: 'Published port handbooks and berth particulars for draft, length and handling rates, layered with observed vessel movement for waiting time. Every figure carries its source and its age.',
  },
];

const SCENARIOS = {
  normal: {
    condition: 'Discharge port congestion at its seasonal normal',
    rows: [
      { label: 'Arrival', value: '14 Oct', note: '21 days steaming and port time', delta: '', tone: 'text-snow' },
      { label: 'Waiting at anchorage', value: '0.5 days', note: 'one tide', delta: '', tone: 'text-snow' },
      { label: 'Delivered cost', value: '18.40', note: 'USD per tonne', delta: '', tone: 'text-snow' },
      { label: 'Laycan risk', value: 'Low', note: 'berths with four days in hand', delta: '', tone: 'text-mint' },
    ],
    call: 'Panamax, direct call at Paradip',
    changed: false,
  },
  congested: {
    condition: 'Discharge port congestion 30% above its seasonal normal',
    rows: [
      { label: 'Arrival', value: '18 Oct', note: '25 days steaming and port time', delta: 'four days later', tone: 'text-snow' },
      { label: 'Waiting at anchorage', value: '4.2 days', note: 'queue of nine vessels', delta: 'up 3.7 days', tone: 'text-snow' },
      { label: 'Delivered cost', value: '21.10', note: 'USD per tonne', delta: 'up 2.70 on demurrage', tone: 'text-snow' },
      { label: 'Laycan risk', value: 'Medium', note: 'laycan closes 14 Oct', delta: 'margin gone', tone: 'text-amber' },
    ],
    call: 'Supramax pair, discharging at Gangavaram',
    changed: true,
  },
};

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scenario, setScenario] = useState<'normal' | 'congested'>('normal');
  const still = useReducedMotion();
  const current = SCENARIOS[scenario];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header id="top" className="grad-polar relative flex min-h-screen flex-col justify-between overflow-hidden text-frost">
        <nav className="relative z-20 mx-auto flex w-full max-w-[1240px] items-center justify-between px-8 py-7 max-md:px-5">
          <a href="#top" className="plate text-[19px] uppercase text-snow">
            Freight<span className="text-ice">.ai</span>
          </a>
          <div className="ui flex items-center gap-7 text-[14px]">
            <a href="/login" className="text-frost/65 transition-colors hover:text-snow">
              Log in
            </a>
            <a
              href="/signup"
              className="rounded-[3px] bg-ice px-5 py-2.5 font-semibold text-ink transition-colors hover:bg-snow"
            >
              Request access
            </a>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid w-full max-w-[1240px] items-center gap-12 px-8 pt-10 pb-6 max-md:px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <h1 className="plate plate-xl max-w-[14ch] text-[clamp(42px,6.6vw,86px)] uppercase text-snow">
              See the whole voyage before you fix the ship
            </h1>
            <p className="mt-8 max-w-[54ch] text-[18.5px] leading-[1.68] text-frost/78 max-md:text-[17px]">
              Freight rate, vessel availability, port limits and congestion all move, and none of
              them move together. Freight AI evaluates them as one problem and returns a ranked
              charter option with the reasoning still attached.
            </p>
            <div className="ui mt-10 flex flex-wrap gap-3 text-[15px] font-semibold">
              <a
                href="#engine"
                className="rounded-[3px] bg-ice px-7 py-3.5 text-ink transition-colors hover:bg-snow"
              >
                Run an analysis
              </a>
              <a
                href="#problem"
                className="rounded-[3px] border border-frost/25 px-7 py-3.5 text-frost transition-colors hover:border-ice hover:text-ice"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="max-lg:mx-auto max-lg:w-full max-lg:max-w-[460px]">
            <FreightGlobe />
            <p className="ui mt-2 text-center text-[12.5px] text-haze">
              Six live bulk trades into India’s East Coast. Hover a port for the fixture.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1240px] px-8 pt-6 pb-14 max-md:px-5">
          <dl className="grid gap-8 border-t border-frost/10 pt-7 sm:grid-cols-3">
            {[
              ['Goes in', 'Parcel size, load and discharge ports, laycan window.'],
              ['Comes out', 'One ranked option and the runner-up it beat.'],
              ['Then', 'Recalculates the moment a condition moves.'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="ui text-[12.5px] text-ice">{k}</dt>
                <dd className="mt-1.5 text-[15.5px] leading-[1.55] text-frost/70">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* ── Why the decision is hard ─────────────────────────── */}
      <section id="problem" className="grad-melt flex min-h-screen flex-col justify-center py-[130px] max-md:py-20">
        <div className="mx-auto w-full max-w-[1240px] px-8 max-md:px-5">
          <p className="max-w-[40ch] text-[17px] italic text-mist">Why this decision is hard to get right</p>
          <h2 className="plate plate-xl mt-4 max-w-[19ch] text-[clamp(34px,5.4vw,68px)] uppercase text-ink">
            Freight moves. Ports change. Deadlines don’t.
          </h2>

          <div className="mt-14 grid gap-12 md:grid-cols-[0.85fr_1fr] md:gap-20">
            <p className="max-w-[30ch] text-[22px] leading-[1.45] text-ink">
              Five things decide the delivered cost of a bulk cargo, and each one keeps its own clock.
            </p>
            <div className="max-w-[62ch] space-y-4 text-[17px] leading-[1.7] text-ink/72">
              <p>
                On most desks they are evaluated separately — a rate sheet here, a berth enquiry
                there, a congestion rumour over the phone. By the time the four answers meet in one
                spreadsheet, at least two of them have already gone stale.
              </p>
              <p>
                So the trade-off between a cheaper vessel and a later berth never actually gets
                priced. It gets absorbed, after the fixture, as demurrage.
              </p>
            </div>
          </div>

          {/* Each factor on a shared window, drawn on its own cadence. */}
          <div className="mt-24">
            <div className="ui flex items-baseline justify-between border-b border-ink/12 pb-3 text-[12.5px] text-mist">
              <span>How often each input changes, across one laycan window</span>
              <span className="num max-md:hidden">30 days</span>
            </div>
            <ul className="mt-2">
              {MOVERS.map((m, i) => (
                <li
                  key={m.name}
                  tabIndex={0}
                  className="group grid items-center gap-x-6 gap-y-2 border-b border-ink/8 py-5 transition-colors hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03] md:grid-cols-[minmax(0,15ch)_1fr_minmax(0,24ch)]"
                >
                  <span className="ui text-[14.5px] text-ink">{m.name}</span>
                  <span className="relative block h-[3px] w-full bg-ink/8">
                    <motion.span
                      className="absolute top-0 h-full origin-left"
                      style={{
                        left: `${m.left}%`,
                        width: `${m.width}%`,
                        background: m.volatile
                          ? 'repeating-linear-gradient(90deg,#2c7e9e 0 5px,transparent 5px 14px)'
                          : '#2c7e9e',
                      }}
                      initial={still ? false : { scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.7, delay: 0.08 * i, ease: EASE }}
                    />
                  </span>
                  <span className="text-[15px] italic text-mist transition-colors group-hover:text-ink md:text-right">
                    {m.cadence}
                  </span>
                  <p className="col-span-full max-h-0 overflow-hidden text-[15.5px] leading-[1.6] text-mist opacity-0 transition-all duration-300 group-hover:max-h-32 group-hover:opacity-100 group-focus-visible:max-h-32 group-focus-visible:opacity-100">
                    <span className="block max-w-[70ch] pt-3">{m.detail}</span>
                  </p>
                </li>
              ))}
              <li className="grid items-center gap-x-6 gap-y-2 border-b-2 border-ink py-5 md:grid-cols-[minmax(0,15ch)_1fr_minmax(0,24ch)]">
                <span className="ui text-[14.5px] font-semibold text-ink">Delivered cost</span>
                <span className="relative block h-[3px] w-full bg-ink" />
                <span className="text-[15px] italic text-ink md:text-right">
                  the one number that owes all five
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── What the system evaluates ────────────────────────── */}
      <section id="product" className="flex min-h-screen flex-col justify-center bg-snow py-[130px] max-md:py-20">
        <div className="mx-auto w-full max-w-[1240px] px-8 max-md:px-5">
          <p className="text-[17px] italic text-mist">What the system evaluates, in order</p>
          <h2 className="plate plate-lg mt-4 max-w-[22ch] text-[clamp(32px,4.6vw,56px)] text-ink">
            Five layers, one recommendation
          </h2>
          <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.7] text-ink/72">
            Each layer can overrule the one before it. A forecast that says wait is worth nothing if
            the only vessel that fits the berth sails on Thursday.
          </p>

          <ol className="relative mt-20 pl-9 max-md:pl-8">
            <span className="absolute top-2 bottom-8 left-[5px] w-px bg-ink/15" aria-hidden="true" />
            {LAYERS.map((l, i) => (
              <motion.li
                key={l.name}
                tabIndex={0}
                initial={still ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-70px' }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: EASE }}
                className="group relative grid gap-x-12 gap-y-2.5 border-b border-ink/8 py-8 transition-colors hover:bg-ink/[0.02] focus-visible:bg-ink/[0.02] md:grid-cols-[minmax(0,17ch)_1fr]"
              >
                <span
                  className="absolute top-[38px] -left-9 h-[11px] w-[11px] rounded-full border-2 border-ice-deep bg-snow transition-colors group-hover:bg-ice-deep max-md:-left-8"
                  aria-hidden="true"
                />
                <h3 className="plate text-[clamp(21px,2.5vw,27px)] text-ink">{l.name}</h3>
                <div>
                  <p className="max-w-[56ch] text-[16.5px] leading-[1.65] text-ink/70">{l.body}</p>
                  <p className="max-h-0 overflow-hidden text-[15.5px] italic leading-[1.6] text-ice-deep opacity-0 transition-all duration-300 group-hover:max-h-24 group-hover:opacity-100 group-focus-visible:max-h-24 group-focus-visible:opacity-100">
                    <span className="block max-w-[56ch] pt-3">{l.catches}</span>
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── What comes out ───────────────────────────────────── */}
      <section id="engine" className="grad-polar flex min-h-screen flex-col justify-center py-[130px] text-frost max-md:py-20">
        <div className="mx-auto w-full max-w-[1240px] px-8 max-md:px-5">
          <p className="text-[17px] italic text-ice/70">What comes back out</p>
          <h2 className="plate plate-lg mt-4 max-w-[20ch] text-[clamp(32px,4.6vw,56px)] text-snow">
            A recap you can hand to a broker
          </h2>
          <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.7] text-frost/72">
            One cargo movement, entered once, evaluated through every layer above and returned in the
            shape the desk already reads.
          </p>

          <div className="mt-16 grid gap-10 lg:grid-cols-[0.78fr_1fr] lg:gap-16">
            <Reveal className="border-l-2 border-ice pl-7">
              <div className="ui text-[12.5px] text-ice">The enquiry</div>
              <p className="num plate plate-lg mt-4 text-[clamp(26px,3.2vw,36px)] text-snow">75,000 MT</p>
              <p className="mt-1.5 text-[16.5px] text-frost/70">thermal coal, 6,000 kcal</p>
              <p className="plate plate-lg mt-9 text-[clamp(20px,2.3vw,26px)] text-snow">
                Newcastle → Paradip
              </p>
              <p className="mt-1.5 text-[16.5px] text-frost/70">
                laycan 8 – 14 October, charterer’s option to nominate an alternate East Coast berth
              </p>
            </Reveal>

            <div className="rounded-[2px] border border-slate bg-hull/70">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate px-7 py-5 max-md:px-5">
                <h3 className="plate text-[19px] text-snow">Panamax, direct call</h3>
                <span className="ui rounded-[2px] bg-amber/12 px-2 py-1 text-[11.5px] text-amber">
                  Illustrative figures
                </span>
              </div>
              <dl>
                {[
                  ['Delivered cost', '18.40', 'USD per tonne, all in'],
                  ['Arrival', '14 Oct', '21 days, berths inside laycan'],
                  ['Laycan risk', 'Low', 'four days of margin'],
                  ['Vessel fit', 'Clears', '14.2 m draft against 15.5 m at the berth'],
                  ['Beats runner-up by', '1.90', 'USD per tonne, versus a Supramax pair'],
                ].map(([label, value, note], i, arr) => (
                  <div
                    key={label}
                    className={`flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 px-7 py-[18px] max-md:px-5 ${
                      i < arr.length - 1 ? 'border-b border-slate/60' : ''
                    }`}
                  >
                    <dt className="text-[16px] text-frost/70">{label}</dt>
                    <dd className="text-right">
                      <span
                        className={`ui num block text-[17px] font-semibold ${
                          label === 'Laycan risk' || label === 'Vessel fit' ? 'text-mint' : 'text-snow'
                        }`}
                      >
                        {value}
                      </span>
                      <span className="block text-[14px] text-frost/45">{note}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ── What happens when it changes ─────────────────────── */}
      <section id="whatif" className="flex min-h-screen flex-col justify-center bg-ink py-[130px] text-frost max-md:py-20">
        <div className="mx-auto w-full max-w-[1240px] px-8 max-md:px-5">
          <p className="text-[17px] italic text-ice/70">What happens when a condition moves</p>
          <h2 className="plate plate-lg mt-4 max-w-[24ch] text-[clamp(32px,4.6vw,56px)] text-snow">
            The answer is only as good as the day it was calculated
          </h2>
          <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.7] text-frost/72">
            Move the congestion at Paradip and watch which of these still holds — and whether the
            recommendation survives it.
          </p>

          <div className="mt-14 rounded-[2px] border border-slate bg-hull/60">
            <div className="flex flex-wrap items-center justify-between gap-5 border-b border-slate px-8 py-6 max-md:px-5">
              <div className="ui inline-flex rounded-[3px] border border-slate p-1 text-[13.5px]" role="group">
                {(['normal', 'congested'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setScenario(k)}
                    aria-pressed={scenario === k}
                    className={`rounded-[2px] px-5 py-2 capitalize transition-colors ${
                      scenario === k ? 'bg-ice font-semibold text-ink' : 'text-frost/60 hover:text-snow'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <p className="text-[16px] text-frost/70">{current.condition}</p>
            </div>

            <dl className="grid gap-px bg-slate/60 sm:grid-cols-2 lg:grid-cols-4">
              {current.rows.map((r) => (
                <div key={r.label} className="bg-hull px-8 py-7 max-md:px-5">
                  <dt className="ui text-[12.5px] text-frost/50">{r.label}</dt>
                  <dd>
                    <span className={`plate plate-lg num mt-3 block text-[clamp(26px,3vw,34px)] ${r.tone}`}>
                      {r.value}
                    </span>
                    <span className="mt-2 block text-[14.5px] text-frost/45">{r.note}</span>
                    <span className="mt-3 block h-5 text-[14.5px] italic text-amber">{r.delta}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-slate px-8 py-6 max-md:px-5">
              <span className="ui text-[12.5px] text-frost/50">Recommendation now standing</span>
              <span className="plate text-right text-[clamp(18px,2.2vw,24px)] text-snow">
                {current.call}
              </span>
              <span className="ui w-full text-[13.5px] text-amber">
                {current.changed ? 'Changed from the standing recommendation' : ''}
              </span>
            </div>
          </div>

          <p className="mt-8 max-w-[74ch] text-[16.5px] leading-[1.7] text-frost/60">
            One input moved. Waiting time, arrival, cost and laycan risk all moved with it, and the
            Panamax stopped being the cheapest way to land the cargo on time. That is the whole point
            of running it again.
          </p>
        </div>
      </section>

      {/* ── Questions ────────────────────────────────────────── */}
      <section id="faq" className="grad-melt-up flex min-h-screen flex-col justify-center py-[130px] max-md:py-20">
        <div className="mx-auto w-full max-w-[1240px] px-8 max-md:px-5">
          <p className="text-[17px] italic text-mist">What people ask first</p>
          <h2 className="plate plate-lg mt-4 max-w-[20ch] text-[clamp(32px,4.6vw,56px)] text-ink">
            Questions worth answering
          </h2>

          <div className="mt-14 border-t border-ink/15">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="border-b border-ink/10">
                  <h3>
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="plate flex w-full items-center justify-between gap-6 py-7 text-left text-[clamp(19px,2.1vw,25px)] text-ink transition-colors hover:text-ice-deep"
                    >
                      {f.q}
                      <span
                        className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink/20"
                        aria-hidden="true"
                      >
                        <span className="absolute h-[1.5px] w-[11px] bg-ink" />
                        <span
                          className={`absolute h-[11px] w-[1.5px] bg-ink transition-transform duration-300 ${
                            open ? 'scale-y-0' : 'scale-y-100'
                          }`}
                        />
                      </span>
                    </button>
                  </h3>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: open ? '320px' : 0, opacity: open ? 1 : 0 }}
                  >
                    <p className="max-w-[68ch] pb-8 text-[17px] leading-[1.72] text-ink/72">{f.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────── */}
      <section id="cta" className="grad-polar flex min-h-[78vh] flex-col justify-center py-[130px] text-frost max-md:py-20">
        <div className="mx-auto w-full max-w-[1240px] px-8 max-md:px-5">
          <h2 className="plate plate-xl max-w-[17ch] text-[clamp(38px,6.6vw,88px)] uppercase text-snow">
            Price the trade-off before you fix
          </h2>
          <p className="mt-8 max-w-[52ch] text-[19px] leading-[1.65] text-frost/72">
            Not after, when it has already turned into demurrage.
          </p>
          <div className="ui mt-12 flex flex-wrap gap-3 text-[15px] font-semibold">
            <a href="/signup" className="rounded-[3px] bg-ice px-7 py-3.5 text-ink transition-colors hover:bg-snow">
              Request access
            </a>
            <a
              href="#engine"
              className="rounded-[3px] border border-frost/25 px-7 py-3.5 text-frost transition-colors hover:border-ice hover:text-ice"
            >
              Look at the recap again
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate bg-ink py-16 text-frost/60">
        <div className="mx-auto w-full max-w-[1240px] px-8 max-md:px-5">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <div className="plate text-[18px] uppercase text-snow">
                Freight<span className="text-ice">.ai</span>
              </div>
              <p className="mt-4 max-w-[36ch] text-[15.5px] leading-[1.6]">
                Chartering decision support for bulk cargo moving into India’s East Coast.
              </p>
            </div>
            <nav>
              <h2 className="ui text-[12.5px] text-ice">The product</h2>
              <ul className="ui mt-4 grid gap-2.5 text-[14.5px]">
                {[
                  ['#product', 'The five layers'],
                  ['#engine', 'The recap'],
                  ['#whatif', 'Scenarios'],
                  ['#faq', 'Questions'],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="transition-colors hover:text-snow">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <h2 className="ui text-[12.5px] text-ice">Built by</h2>
              <p className="ui mt-4 text-[14.5px] leading-[1.7]">
                Tech Catalyst
                <br />
                Smart India Hackathon 2026
              </p>
            </div>
          </div>
          <p className="ui mt-14 border-t border-slate pt-7 text-[13px]">
            All figures on this page are illustrative.
          </p>
        </div>
      </footer>
    </>
  );
}
