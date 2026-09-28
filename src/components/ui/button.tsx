import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-clay-600 text-white shadow-sm hover:bg-clay-700 active:bg-clay-800",
  accent: "bg-ocean-700 text-white shadow-sm hover:bg-ocean-800",
  secondary: "bg-clay-50 text-clay-700 border border-clay-200 hover:bg-clay-100",
  ghost: "bg-white text-ink-800 border border-ink-200 hover:bg-sun-100 hover:border-sun-300",
  danger: "bg-white text-danger border border-red-200 hover:bg-red-50",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props }, ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        "inline-flex items-center justify-center rounded-xl font-medium transition-colors select-none",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  );
});
