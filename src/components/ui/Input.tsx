import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

const base =
  'w-full px-3 py-2 bg-surface border border-border rounded text-sm text-ink placeholder:text-ink-faint transition-shadow duration-150 ease-standard focus:outline-none focus:border-accent focus:shadow-focus disabled:bg-surface-sunken disabled:text-ink-faint disabled:cursor-not-allowed';

const errorCls = 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(220,38,38,0.12)]';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ className = '', error, ...rest }, ref) => (
    <input ref={ref} className={`${base} ${error ? errorCls : ''} ${className}`} {...rest} />
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(({ className = '', error, ...rest }, ref) => (
  <textarea ref={ref} className={`${base} ${error ? errorCls : ''} ${className}`} {...rest} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
  ({ className = '', error, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={`${base} ${error ? errorCls : ''} appearance-none bg-no-repeat bg-[right_0.6rem_center] pr-9 ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239AA0AC' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
      }}
      {...rest}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';
