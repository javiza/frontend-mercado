import { forwardRef, type InputHTMLAttributes } from "react";
import clsx from "clsx";

export const fieldClass =
  "w-full h-11 rounded-xl border bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 transition " +
  "focus:outline-none focus:border-clay-400 focus:ring-4 focus:ring-clay-100 disabled:bg-ink-50";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, className, id, ...props }, ref) {
  const fid = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label htmlFor={fid} className="text-sm font-medium text-ink-700">{label}</label>}
      <input ref={ref} id={fid} className={clsx(fieldClass, error ? "border-red-300" : "border-ink-200", className)} {...props} />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
});
