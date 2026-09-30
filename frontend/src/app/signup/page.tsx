import Link from 'next/link';
import { Metadata } from 'next';
import AuthLayout, { fieldClass, labelClass } from '@/components/AuthLayout';

export const metadata: Metadata = {
  title: 'Request access | Freight.AI',
};

const FIELDS = [
  { id: 'name', label: 'Your name', type: 'text', autoComplete: 'name', placeholder: 'Ananya Rao' },
  { id: 'company', label: 'Company', type: 'text', autoComplete: 'organization', placeholder: 'Coromandel Bulk Carriers' },
  { id: 'email', label: 'Work email', type: 'email', autoComplete: 'email', placeholder: 'you@company.com' },
  { id: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', placeholder: 'At least 12 characters' },
];

export default function Signup() {
  return (
    <AuthLayout
      title="Request access"
      lede="Tell us which desk you charter for and we’ll open an account."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="ui font-semibold text-ice-deep underline decoration-ice-deep/30 underline-offset-4 transition-colors hover:text-ink">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mt-10 flex flex-col gap-5">
        {FIELDS.map((f) => (
          <div key={f.id}>
            <label htmlFor={f.id} className={labelClass}>
              {f.label}
            </label>
            <input
              id={f.id}
              name={f.id}
              type={f.type}
              autoComplete={f.autoComplete}
              minLength={f.type === 'password' ? 12 : undefined}
              required
              className={fieldClass}
              placeholder={f.placeholder}
            />
          </div>
        ))}

        <Link
          href="/analysis/new"
          className="ui mt-2 rounded-[3px] bg-ink px-6 py-3.5 text-[15px] font-semibold text-snow transition-colors hover:bg-ice-deep text-center"
        >
          Request access
        </Link>
      </div>
    </AuthLayout>
  );
}
