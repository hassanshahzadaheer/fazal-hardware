import { ReactNode } from 'react';

interface Props {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export default function Field({ label, hint, error, required, children }: Props) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-ink mb-1.5">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-faint mt-1">{hint}</p>
      ) : null}
    </div>
  );
}
