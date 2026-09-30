'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Coarse land mask, 5° per cell: 72 columns (lon -180 → 180), 36 rows (lat 90 → -90).
 * Hand-built so the globe needs no map dependency. Rendered as a dot matrix, which
 * hides the low resolution. Swap for real coastline data if precision ever matters.
 */
const LAND = `
........................................................................
................#######...######........................................
.............###########.########......##.........###....##.............
..........##############.########.......###############################.
.########################.#######.#...##################################
################################..######################################
############################.......#####################################
..........###################.....#####################################.
...........###################.....###################################..
............##################.....##################################...
............###################....#################################....
.............##################...#################################.....
..............#################..################################.......
...............###############..################################........
.................#######........################.#####.########.........
.................######..........###############..####..#######.........
...................##########.....##############....#...######..........
....................##########.......########..........########.........
....................##########.......########..........#############....
.....................#########........#######...........#############...
......................#######..........#######.............#########....
......................########........#########...........##########....
.......................#########.......########..........###########....
........................########.......######.............##########....
........................#######........#####...............########.....
.........................######.................................#....##.
.........................#####.......................................##.
..........................####..........................................
..........................####..........................................
...........................##...........................................
...........................###..........................................
########################################################################
########################################################################
########################################################################
########################################################################
########################################################################
`
  .trim()
  .split('\n');

type Port = { name: string; country: string; lat: number; lon: number };

const ROUTES: {
  from: Port;
  to: Port;
  cargo: string;
  vessel: string;
  distance: string;
  days: string;
}[] = [
  {
    from: { name: 'Newcastle', country: 'Australia', lat: -32.93, lon: 151.78 },
    to: { name: 'Paradip', country: 'Odisha', lat: 20.26, lon: 86.67 },
    cargo: 'Thermal coal, 6,000 kcal',
    vessel: 'Panamax, 75,000 MT',
    distance: '5,940 nm',
    days: '21 days',
  },
  {
    from: { name: 'Richards Bay', country: 'South Africa', lat: -28.8, lon: 32.09 },
    to: { name: 'Visakhapatnam', country: 'Andhra Pradesh', lat: 17.69, lon: 83.22 },
    cargo: 'Thermal coal, 5,500 kcal',
    vessel: 'Supramax, 55,000 MT',
    distance: '4,420 nm',
    days: '16 days',
  },
  {
    from: { name: 'Tubarão', country: 'Brazil', lat: -20.28, lon: -40.27 },
    to: { name: 'Gangavaram', country: 'Andhra Pradesh', lat: 17.63, lon: 83.23 },
    cargo: 'Iron ore fines, 62% Fe',
    vessel: 'Capesize, 170,000 MT',
    distance: '8,310 nm',
    days: '29 days',
  },
  {
    from: { name: 'Hay Point', country: 'Australia', lat: -21.28, lon: 149.3 },
    to: { name: 'Haldia', country: 'West Bengal', lat: 22.03, lon: 88.08 },
    cargo: 'Coking coal, hard low-vol',
    vessel: 'Panamax, 70,000 MT',
    distance: '5,180 nm',
    days: '19 days',
  },
  {
    from: { name: 'Banjarmasin', country: 'Indonesia', lat: -3.32, lon: 114.59 },
    to: { name: 'Krishnapatnam', country: 'Andhra Pradesh', lat: 14.28, lon: 80.12 },
    cargo: 'Thermal coal, 4,200 kcal',
    vessel: 'Supramax, 56,000 MT',
    distance: '2,480 nm',
    days: '9 days',
  },
  {
    from: { name: 'Dampier', country: 'Australia', lat: -20.66, lon: 116.71 },
    to: { name: 'Dhamra', country: 'Odisha', lat: 20.79, lon: 86.98 },
    cargo: 'Iron ore lump',
    vessel: 'Capesize, 160,000 MT',
    distance: '4,060 nm',
    days: '15 days',
  },
];

const DEG = Math.PI / 180;
const TILT = 16; // lean the north pole toward the viewer
const ARC_LIFT = 0.17; // how far arcs stand off the surface
const SPIN = 0.16; // degrees per frame

type Vec = [number, number, number];

const toVec = (lat: number, lon: number): Vec => {
  const p = lat * DEG;
  const l = lon * DEG;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
};

/** Orthographic projection of a unit vector, spun by `rot` degrees about the pole. */
function project(v: Vec, rot: number) {
  const r = rot * DEG;
  const t = TILT * DEG;
  // spin about the polar axis
  const x1 = v[0] * Math.cos(r) - v[1] * Math.sin(r);
  const y1 = v[0] * Math.sin(r) + v[1] * Math.cos(r);
  // tilt toward the camera
  const y2 = v[2] * Math.cos(t) - x1 * Math.sin(t);
  const z2 = v[2] * Math.sin(t) + x1 * Math.cos(t);
  return { x: y1, y: y2, z: z2 }; // z > 0 faces the viewer
}

/** Great-circle interpolation between two unit vectors. */
function slerp(a: Vec, b: Vec, t: number): Vec {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const o = Math.acos(dot);
  if (o < 1e-6) return a;
  const s = Math.sin(o);
  const k1 = Math.sin((1 - t) * o) / s;
  const k2 = Math.sin(t * o) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

// Precompute once: land dots, graticule rings, and each route's great circle.
const LAND_DOTS: Vec[] = [];
for (let r = 0; r < LAND.length; r++) {
  const lat = 87.5 - r * 5;
  for (let c = 0; c < LAND[r].length; c++) {
    if (LAND[r][c] === '#') LAND_DOTS.push(toVec(lat, -177.5 + c * 5));
  }
}

const GRATICULE: Vec[][] = [];
for (let lon = -180; lon < 180; lon += 30) {
  const ring: Vec[] = [];
  for (let lat = -90; lat <= 90; lat += 4) ring.push(toVec(lat, lon));
  GRATICULE.push(ring);
}
for (let lat = -60; lat <= 60; lat += 30) {
  const ring: Vec[] = [];
  for (let lon = -180; lon <= 180; lon += 4) ring.push(toVec(lat, lon));
  GRATICULE.push(ring);
}

const ARC_STEPS = 64;
const ARCS = ROUTES.map((r) => {
  const a = toVec(r.from.lat, r.from.lon);
  const b = toVec(r.to.lat, r.to.lon);
  return Array.from({ length: ARC_STEPS + 1 }, (_, i) => {
    const t = i / ARC_STEPS;
    const p = slerp(a, b, t);
    const lift = 1 + ARC_LIFT * Math.sin(Math.PI * t);
    return [p[0] * lift, p[1] * lift, p[2] * lift] as Vec;
  });
});

const ENDPOINTS = ROUTES.flatMap((r, i) => [
  { routeIndex: i, port: r.from, vec: toVec(r.from.lat, r.from.lon), origin: true },
  { routeIndex: i, port: r.to, vec: toVec(r.to.lat, r.to.lon), origin: false },
]);

export default function FreightGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{
    routeIndex: number;
    origin: boolean;
    x: number;
    y: number;
  } | null>(null);

  // `hover` drives the tooltip; the draw loop reads it through a ref so it
  // never needs to restart.
  const hoverRef = useRef(hover);
  hoverRef.current = hover;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let size = 0;
    let rot = -60; // open on the Indian Ocean
    let frame = 0;
    let raf = 0;

    const resize = () => {
      size = wrap.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = () => {
      const R = size * 0.38;
      const cx = size / 2;
      const cy = size / 2;
      const at = (v: Vec) => {
        const p = project(v, rot);
        return { sx: cx + p.x * R, sy: cy - p.y * R, z: p.z };
      };

      ctx.clearRect(0, 0, size, size);

      // Ocean body: black core lit by arctic light from below.
      const body = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
      body.addColorStop(0, '#12212b');
      body.addColorStop(0.65, '#081119');
      body.addColorStop(1, '#04080c');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();

      // Atmosphere rim.
      ctx.beginPath();
      ctx.arc(cx, cy, R + 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(166,220,239,0.30)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Graticule.
      ctx.strokeStyle = 'rgba(166,220,239,0.10)';
      for (const ring of GRATICULE) {
        ctx.beginPath();
        let down = true;
        for (const v of ring) {
          const { sx, sy, z } = at(v);
          if (z <= 0) {
            down = true;
            continue;
          }
          if (down) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
          down = false;
        }
        ctx.stroke();
      }

      // Land as a dot matrix; dots near the limb fade out.
      for (const v of LAND_DOTS) {
        const { sx, sy, z } = at(v);
        if (z <= 0.04) continue;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(166,220,239,${0.18 + z * 0.55})`;
        ctx.fill();
      }

      const hoveredRoute = hoverRef.current?.routeIndex ?? -1;

      // Routes, each with a parcel running along it.
      ARCS.forEach((arc, i) => {
        const active = hoveredRoute === i;
        const dim = hoveredRoute !== -1 && !active;
        ctx.beginPath();
        let down = true;
        for (const v of arc) {
          const { sx, sy, z } = at(v);
          if (z <= 0) {
            down = true;
            continue;
          }
          if (down) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
          down = false;
        }
        ctx.strokeStyle = active
          ? 'rgba(220,238,246,0.95)'
          : dim
            ? 'rgba(166,220,239,0.14)'
            : 'rgba(166,220,239,0.45)';
        ctx.lineWidth = active ? 1.8 : 1;
        ctx.stroke();

        // The parcel in transit.
        const t = ((frame * 0.0022 + i * 0.17) % 1.35) / 1.35;
        if (t <= 1) {
          const v = arc[Math.round(t * ARC_STEPS)];
          const { sx, sy, z } = at(v);
          if (z > 0) {
            ctx.beginPath();
            ctx.arc(sx, sy, active ? 3.2 : 2.2, 0, Math.PI * 2);
            ctx.fillStyle = dim ? 'rgba(227,164,76,0.3)' : '#e3a44c';
            ctx.fill();
          }
        }
      });

      // Port markers, and hit-testing against the pointer in the same pass.
      const pointer = pointerRef.current;
      let hit: { routeIndex: number; origin: boolean; x: number; y: number } | null = null;

      for (const e of ENDPOINTS) {
        const { sx, sy, z } = at(e.vec);
        if (z <= 0) continue;
        const active = hoveredRoute === e.routeIndex;

        if (pointer && Math.hypot(pointer.x - sx, pointer.y - sy) < 13) {
          hit = { routeIndex: e.routeIndex, origin: e.origin, x: sx, y: sy };
        }

        ctx.beginPath();
        ctx.arc(sx, sy, active ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = e.origin ? '#a6dcef' : '#e3a44c';
        ctx.fill();

        if (active) {
          ctx.beginPath();
          ctx.arc(sx, sy, 9, 0, Math.PI * 2);
          ctx.strokeStyle = e.origin ? 'rgba(166,220,239,0.6)' : 'rgba(227,164,76,0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      const prev = hoverRef.current;
      const changed =
        (hit === null) !== (prev === null) ||
        (hit && prev && (hit.routeIndex !== prev.routeIndex || hit.origin !== prev.origin)) ||
        (hit && prev && (Math.abs(hit.x - prev.x) > 1 || Math.abs(hit.y - prev.y) > 1));
      if (changed) setHover(hit);

      canvas.style.cursor = hit ? 'pointer' : 'default';

      // Hovering holds the globe still so the tooltip stays put.
      if (!still && !hit) {
        rot += SPIN;
        frame += 1;
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const route = hover ? ROUTES[hover.routeIndex] : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        className="block w-full"
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          pointerRef.current = null;
        }}
      />

      {route && hover && (
        <div
          className="pointer-events-none absolute z-20 w-[248px] rounded-[2px] border border-slate bg-ink/95 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm"
          style={{
            left: `min(max(0px, ${hover.x - 124}px), calc(100% - 248px))`,
            top: `${hover.y + 18}px`,
          }}
          role="status"
        >
          <div className="ui text-[11.5px] text-ice">
            {hover.origin ? 'Load port' : 'Discharge port'}
          </div>
          <div className="plate mt-1 text-[17px] text-snow">
            {hover.origin ? route.from.name : route.to.name}
          </div>
          <div className="text-[13.5px] text-frost/50">
            {hover.origin ? route.from.country : route.to.country}
          </div>
          <dl className="mt-3 space-y-1.5 border-t border-slate pt-3 text-[13px]">
            {[
              ['Cargo', route.cargo],
              ['Vessel', route.vessel],
              ['Passage', `${route.distance}, ${route.days}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-frost/45">{k}</dt>
                <dd className="ui num text-right text-frost/85">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* The canvas is decorative; the routes it shows are listed here for everyone else. */}
      <ul className="sr-only">
        {ROUTES.map((r) => (
          <li key={r.from.name}>
            {r.cargo} from {r.from.name}, {r.from.country} to {r.to.name}, {r.to.country} —{' '}
            {r.vessel}, {r.distance} over {r.days}.
          </li>
        ))}
      </ul>
    </div>
  );
}
