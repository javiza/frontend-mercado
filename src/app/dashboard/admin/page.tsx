"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ClipboardList, AlertTriangle, ReceiptText, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { clp, fechaCorta } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { EstadoBadge } from "@/components/tienda/estado-badge";
import { useSessionStore } from "@/store/session-store";
import type { Producto, ResumenAnalytics, Venta, VentaDiaria } from "@/lib/supermercado-types";

const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export default function ResumenPage() {
  const perfil = useSessionStore((s) => s.adminProfile);
  const rol = perfil?.rol;
  const veVentas = rol === "SUPER_ADMIN" || rol === "ADMIN" || rol === "CAJERO";
  const veStock = rol === "SUPER_ADMIN" || rol === "ADMIN" || rol === "BODEGA";

  const gestion = rol === "SUPER_ADMIN" || rol === "ADMIN";

  // Admins: cifras precalculadas en la base (vistas materializadas) → no dependen de cuántas ventas existan.
  const { data: resumen } = useQuery({ queryKey: ["resumen-analytics"], queryFn: () => apiFetch<ResumenAnalytics>("/analytics/resumen"), enabled: gestion, refetchInterval: 60_000 });
  const { data: diarias } = useQuery({ queryKey: ["resumen-diarias"], queryFn: () => apiFetch<VentaDiaria[]>("/analytics/ventas-diarias?dias=6"), enabled: gestion, refetchInterval: 60_000 });
  // Pedidos por cobrar: el filtro lo hace el servidor (antes se descargaban todas las ventas para contarlos).
  const { data: porCobrar } = useQuery({ queryKey: ["resumen-por-cobrar"], queryFn: () => apiFetch<Venta[]>("/ventas?canal=ONLINE&estado=PENDIENTE_PAGO&limit=500"), enabled: veVentas, refetchInterval: 60_000 });
  // Últimas ventas (y cifras del cajero, que no tiene acceso a reportes): solo las más recientes.
  const { data: ventas } = useQuery({ queryKey: ["resumen-ventas"], queryFn: () => apiFetch<Venta[]>("/ventas?limit=200"), enabled: veVentas });
  const { data: bajos } = useQuery({ queryKey: ["resumen-stock-bajo"], queryFn: () => apiFetch<Producto[]>("/productos/stock-bajo"), enabled: veStock });

  const validas = (ventas ?? []).filter((v) => v.estado !== "ANULADA");
  const hoy = new Date();
  const deHoy = validas.filter((v) => mismoDia(new Date(v.creadoEn), hoy));
  const pendientes = porCobrar ?? [];

  const totalPorFecha = new Map<string, number>();
  for (const r of diarias ?? []) totalPorFecha.set(r.fecha, (totalPorFecha.get(r.fecha) ?? 0) + r.total);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const total = gestion && diarias
      ? totalPorFecha.get(d.toLocaleDateString("en-CA", { timeZone: "America/Santiago" })) ?? 0
      : validas.filter((v) => mismoDia(new Date(v.creadoEn), d)).reduce((a, v) => a + Number(v.total), 0);
    return { d, total };
  });
  const max = Math.max(...dias.map((x) => x.total), 1);

  const kpis = [
    veVentas && (gestion && resumen
      ? { l: "Ventas de hoy", v: clp(resumen.hoy.total), s: `${resumen.hoy.ventas} ${resumen.hoy.ventas === 1 ? "venta cobrada" : "ventas cobradas"}`, i: TrendingUp, t: "bg-clay-50 text-clay-600" }
      : { l: "Ventas de hoy", v: clp(deHoy.reduce((a, v) => a + Number(v.total), 0)), s: `${deHoy.length} ${deHoy.length === 1 ? "venta" : "ventas"}`, i: TrendingUp, t: "bg-clay-50 text-clay-600" }),
    veVentas && { l: "Pedidos online por cobrar", v: String(pendientes.length), s: "pendientes de pago", i: ClipboardList, t: "bg-amber-50 text-amber-600" },
    veStock && { l: "Stock bajo", v: String(bajos?.length ?? 0), s: "productos por reponer", i: AlertTriangle, t: "bg-red-50 text-red-500" },
  ].filter(Boolean) as { l: string; v: string; s: string; i: typeof TrendingUp; t: string }[];

  return (
    <div className="animate-rise flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Hola{perfil ? `, ${perfil.nombre.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-ink-500">Así va el supermercado hoy.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map(({ l, v, s, i: I, t }) => (
          <Card key={l} className="flex items-center gap-4 p-5">
            <span className={`grid size-12 place-items-center rounded-2xl ${t}`}><I className="size-6" /></span>
            <div><p className="text-sm text-ink-500">{l}</p><p className="text-2xl font-semibold tabular-nums">{v}</p><p className="text-xs text-ink-400">{s}</p></div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {veVentas && (
          <Card className="p-5">
            <h2 className="mb-4 font-semibold">Ventas de los últimos 7 días</h2>
            <div className="flex h-44 gap-3">
              {dias.map(({ d, total }) => (
                <div key={d.toISOString()} className="flex flex-1 flex-col items-center gap-2" title={clp(total)}>
                  <div className="flex min-h-0 w-full flex-1 items-end">
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-clay-500 to-clay-300 transition-all" style={{ height: `${Math.max((total / max) * 100, total ? 6 : 2)}%`, opacity: total ? 1 : 0.25 }} />
                  </div>
                  <span className="text-[11px] text-ink-400">{fechaCorta(d)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {veStock && (
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Por reponer</h2>
              <Link href="/dashboard/admin/inventario" className="flex items-center gap-1 text-sm font-medium text-clay-600 hover:underline">Inventario <ArrowRight className="size-3.5" /></Link>
            </div>
            {(bajos ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">Todo el stock está sobre el mínimo 🎉</p>
            ) : (
              <ul className="divide-y divide-sun-100">
                {(bajos ?? []).slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="truncate pr-3">{p.nombre}</span>
                    <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">{p.stockActual} / mín. {p.stockMinimo}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {veVentas && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-clay-600" /> Últimas ventas</h2>
            <Link href="/dashboard/admin/ventas" className="flex items-center gap-1 text-sm font-medium text-clay-600 hover:underline">Ver todas <ArrowRight className="size-3.5" /></Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-sun-100 border-t border-sun-100">
              {(ventas ?? []).slice(0, 6).map((v) => (
                <tr key={v.id}>
                  <td className="px-5 py-3 font-medium">#{v.id}</td>
                  <td className="hidden px-3 py-3 text-ink-500 sm:table-cell">{v.canal === "ONLINE" ? "Online" : "Mostrador"}</td>
                  <td className="px-3 py-3"><EstadoBadge estado={v.estado} /></td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{clp(v.total)}</td>
                </tr>
              ))}
              {(ventas ?? []).length === 0 && <tr><td className="px-5 py-8 text-center text-ink-400">Todavía no hay ventas.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
