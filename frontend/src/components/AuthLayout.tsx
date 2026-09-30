import Link from 'next/link';

/** Shared input styling for the auth forms. */
export const fieldClass =
  'w-full rounded-[3px] border border-ink/15 bg-snow px-4 py-3 text-[16px] text-ink transition-colors placeholder:text-mist/50 focus:border-ice-deep focus:outline-none focus-visible:outline-none';

export const labelClass = 'ui mb-2 block text-[13px] text-mist';

export default function AuthLayout({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.02fr_1fr]">
      {/* Brand side: black into arctic light, with the voyage on the horizon. */}
      <div className="grad-polar relative flex flex-col justify-between overflow-hidden px-10 py-10 text-frost max-lg:min-h-[240px] max-md:px-6">
        <Link href="/" className="plate w-fit text-[19px] uppercase text-snow">
          Freight<span className="text-ice">.ai</span>
        </Link>

        <div className="max-lg:mt-10">
          <p className="max-w-[26ch] text-[clamp(22px,2.4vw,30px)] leading-[1.35] text-frost/85">
            Every voyage decision in one place, recalculated the moment a condition moves.
          </p>

          <svg viewBox="0 0 520 90" className="mt-12 h-auto w-full max-w-[520px]" aria-hidden="true">
            <path
              className="voyage"
              pathLength={1}
              d="M4,86 C110,26 330,8 516,86"
              fill="none"
              stroke="#a6dcef"
              strokeWidth="1.25"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx="4" cy="86" r="3.5" fill="#a6dcef" />
            <circle className="landfall" cx="516" cy="86" r="4" fill="#e3a44c" />
          </svg>
          <div className="h-px w-full bg-linear-to-r from-ice/40 to-transparent" />
          <div className="ui num flex justify-between pt-3 text-[12px] text-haze">
            <span>Newcastle</span>
            <span>Paradip</span>
          </div>
        </div>
      </div>

      {/* Form side: glacial melt into white. */}
      <div className="grad-melt-up flex items-center justify-center px-10 py-16 max-md:px-6">
        <div className="w-full max-w-[400px]">
          <h1 className="plate plate-lg text-[clamp(30px,3.4vw,40px)] text-ink">{title}</h1>
          <p className="mt-3 max-w-[38ch] text-[16.5px] leading-[1.6] text-ink/65">{lede}</p>
          {children}
          <div className="mt-9 border-t border-ink/12 pt-6 text-[15.5px] text-ink/65">{footer}</div>
        </div>
      </div>
    </div>
  );
}
