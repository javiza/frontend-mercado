import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("rounded-card bg-[var(--color-tarjeta-app)] border border-sun-200/80 shadow-[var(--shadow-soft)]", className)}
      {...props}
    />
  );
}
