import Link from 'next/link';
import { Metadata } from 'next';
import AuthLayout, { fieldClass, labelClass } from '@/components/AuthLayout';

export const metadata: Metadata = {
  title: 'Sign in | Freight.AI',
};

export default function Login() {
  return (
    <AuthLayout
      title="Sign in"
      lede="Pick up the analyses your desk left open."
      footer={
        <>
          No account yet?{' '}
          <Link href="/signup" className="ui font-semibold text-ice-deep underline decoration-ice-deep/30 underline-offset-4 transition-colors hover:text-ink">
            Request access
          </Link>
        </>
      }
    >
      <div className="mt-10 flex flex-col gap-6">
        <div>
          <label htmlFor="email" className={labelClass}>
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={fieldClass}
            placeholder="you@company.com"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <Link href="#" className="ui mb-2 text-[13px] text-mist transition-colors hover:text-ink">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={fieldClass}
            placeholder="••••••••"
          />
        </div>

        <Link
          href="/analysis/new"
          className="ui mt-2 rounded-[3px] bg-ink px-6 py-3.5 text-[15px] font-semibold text-snow transition-colors hover:bg-ice-deep text-center"
        >
          Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
