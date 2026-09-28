import type { EstadoVenta } from "@/lib/supermercado-types";

const E: Record<EstadoVenta, [string, string]> = {
  PENDIENTE_PAGO: ["Pendiente de pago", "bg-amber-100 text-amber-800"],
  PAGADA: ["Pagada", "bg-clay-100 text-clay-800"],
  ENTREGADA: ["Entregada", "bg-mint-100 text-mint-600"],
  ANULADA: ["Anulada", "bg-ink-100 text-ink-500"],
};
export function EstadoBadge({ estado }: { estado: EstadoVenta }) {
  const [l, c] = E[estado];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${c}`}>{l}</span>;
}
