import { forwardRef, type SelectHTMLAttributes } from "react";
import clsx from "clsx";
import { fieldClass } from "./input";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, className, id, children, ...props }, ref) {
  const fid = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label htmlFor={fid} className="text-sm font-medium text-ink-700">{label}</label>}
      <select ref={ref} id={fid} className={clsx(fieldClass, "pr-8", error ? "border-red-300" : "border-ink-200", className)} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
});
