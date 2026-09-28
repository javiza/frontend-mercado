"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, TrendingUp, CalendarDays, Package, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { clp } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  ResumenAnalytics, VentaDiaria, TopProducto, VentaCategoriaMes, StockCategoria,
} from "@/lib/supermercado-types";

const RANGOS = [7, 30, 90] as const;
const opts = { staleTime: 60_000, refetchInterval: 120_000 };

// "2026-09-28" → "28 sep" sin pasar por Date (evita corrimientos de zona horaria)
const diaCorto = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][Number(m) - 1]}`;
};
const mesLargo = (iso: string) => {
  const [y, m] = iso.split("-");
  return `${["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][Number(m) - 1]} ${y}`;
};

export default function ReportesPage() {
  const qc = useQueryClient();
  const [dias, setDias] = useState<(typeof RANGOS)[number]>(30);

  const resumen = useQuery({ queryKey: ["rep-resumen"], queryFn: () => apiFetch<ResumenAnalytics>("/analytics/resumen"), ...opts });
  const diarias = useQuery({ queryKey: ["rep-diarias", dias], queryFn: () => apiFetch<VentaDiaria[]>(`/analytics/ventas-diarias?dias=${dias}`), ...opts });
  const top = useQuery({ queryKey: ["rep-top"], queryFn: () => apiFetch<TopProducto[]>("/analytics/top-productos?limite=10"), ...opts });
  const cats = useQuery({ queryKey: ["rep-cats"], queryFn: () => apiFetch<VentaCategoriaMes[]>("/analytics/categorias?meses=3"), ...opts });
  const stock = useQuery({ queryKey: ["rep-stock"], queryFn: () => apiFetch<StockCategoria[]>("/analytics/stock"), ...opts });

  const refrescar = useMutation({
    mutationFn: () => apiFetch<{ refrescado: boolean }>("/analytics/refresh", { method: "POST" }),
    onSuccess: (r) => {
      toast[r.refrescado ? "success" : "info"](r.refrescado ? "Reportes actualizados" : "Otra actualización ya está en curso");
      void qc.invalidateQueries({ queryKey: ["rep-resumen"] });
      for (const k of ["rep-diarias", "rep-top", "rep-cats", "rep-stock"]) void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Suma los canales de cada día y rellena los días sin ventas con 0 (para que el gráfico no "salte")
  const porDia = new Map<string, { online: number; mostrador: number }>();
  for (const r of diarias.data ?? []) {
    const x = porDia.get(r.fecha) ?? { online: 0, mostrador: 0 };
    if (r.canal === "ONLINE") x.online += r.total; else x.mostrador += r.total;
    porDia.set(r.fecha, x);
  }
  const serie = Array.from({ length: dias + 1 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (dias - i));
    const key = d.toLocaleDateString("en-CA", { timeZone: "America/Santiago" }); // YYYY-MM-DD en hora de Chile
    const x = porDia.get(key) ?? { online: 0, mostrador: 0 };
    return { key, ...x, total: x.online + x.mostrador };
  });
  const maxDia = Math.max(...serie.map((s) => s.total), 1);
  const totalPeriodo = serie.reduce((a, s) => a + s.total, 0);

  // Ingresos por categoría en los últimos 3 meses
  const porCat = new Map<string, number>();
  for (const r of cats.data ?? []) porCat.set(r.categoria, (porCat.get(r.categoria) ?? 0) + r.ingresos);
  const catOrden = [...porCat.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...catOrden.map(([, v]) => v), 1);
  const mesesCubiertos = [...new Set((cats.data ?? []).map((r) => r.mes))];

  const r = resumen.data;
  const kpis = [
    { l: "Ventas de hoy", v: clp(r?.hoy.total), s: `${r?.hoy.ventas ?? 0} ventas cobradas`, i: TrendingUp, t: "bg-clay-50 text-clay-600" },
    { l: "Ventas del mes", v: clp(r?.mes.total), s: `${r?.mes.ventas ?? 0} ventas cobradas`, i: CalendarDays, t: "bg-ocean-50 text-ocean-700" },
    { l: "Inventario a costo", v: clp(r?.valorInventario), s: "valor de la mercadería en bodega", i: Package, t: "bg-amber-50 text-amber-600" },
    { l: "Stock bajo", v: String(r?.stockBajo ?? 0), s: "productos por reponer", i: AlertTriangle, t: "bg-red-50 text-red-500" },
  ];

  return (
    <div className="animate-rise flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reportes</h1>
          <p className="text-sm text-ink-500">
            Se calculan de forma automática cada pocos minutos
            {r?.actualizadoEn ? ` · última actualización ${new Date(r.actualizadoEn).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` : ""}.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refrescar.mutate()} disabled={refrescar.isPending}>
          <RefreshCw className={`size-4 ${refrescar.isPending ? "animate-spin" : ""}`} /> Actualizar ahora
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ l, v, s, i: I, t }) => (
          <Card key={l} className="flex items-center gap-4 p-5">
            <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${t}`}><I className="size-6" /></span>
            <div className="min-w-0"><p className="text-sm text-ink-500">{l}</p><p className="truncate text-2xl font-semibold tabular-nums">{v}</p><p className="text-xs text-ink-400">{s}</p></div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Ventas por día</h2>
            <p className="text-xs text-ink-400">{clp(totalPeriodo)} en los últimos {dias} días · <span className="text-clay-600">■</span> mostrador <span className="text-ocean-700">■</span> online</p>
          </div>
          <div className="flex gap-1.5">
            {RANGOS.map((n) => (
              <Button key={n} size="sm" variant={n === dias ? "secondary" : "ghost"} onClick={() => setDias(n)}>{n} días</Button>
            ))}
          </div>
        </div>
        <div className="flex h-52 items-end gap-[3px]" role="img" aria-label="Gráfico de ventas por día">
          {serie.map((s) => (
            <div key={s.key} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${diaCorto(s.key)} · ${clp(s.total)}`}>
              <div className="w-full rounded-t-sm bg-ocean-700" style={{ height: `${(s.online / maxDia) * 100}%` }} />
              <div className="w-full bg-clay-500" style={{ height: `${(s.mostrador / maxDia) * 100}%`, borderRadius: s.online ? 0 : "2px 2px 0 0" }} />
              {s.total === 0 && <div className="h-[2px] w-full bg-ink-200/60" />}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-ink-400"><span>{diaCorto(serie[0].key)}</span><span>{diaCorto(serie[serie.length - 1].key)}</span></div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <h2 className="px-5 pt-5 pb-3 font-semibold">Productos más vendidos <span className="text-xs font-normal text-ink-400">· últimos 30 días</span></h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-y border-sun-100 text-left text-xs text-ink-400"><th className="px-5 py-2 font-medium">Producto</th><th className="px-3 py-2 text-right font-medium">Uds.</th><th className="px-3 py-2 text-right font-medium">Ingresos</th><th className="px-5 py-2 text-right font-medium">Margen est.</th></tr></thead>
              <tbody className="divide-y divide-sun-100">
                {(top.data ?? []).map((p) => (
                  <tr key={p.productoId}>
                    <td className="max-w-[14rem] truncate px-5 py-2.5 font-medium">{p.nombre}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.unidades}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{clp(p.ingresos)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-ink-500">{clp(p.margenEstimado)}</td>
                  </tr>
                ))}
                {top.data?.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-ink-400">Aún no hay ventas cobradas en este período.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-[11px] text-ink-400">El margen usa el costo actual de cada producto.</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Ingresos por categoría</h2>
          <p className="mb-4 text-xs text-ink-400">{mesesCubiertos.length ? mesesCubiertos.map(mesLargo).join(" · ") : "Últimos 3 meses"}</p>
          <ul className="flex flex-col gap-3">
            {catOrden.map(([nombre, total]) => (
              <li key={nombre}>
                <div className="mb-1 flex justify-between text-sm"><span className="truncate pr-3">{nombre}</span><span className="tabular-nums text-ink-500">{clp(total)}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-sun-100"><div className="h-full rounded-full bg-gradient-to-r from-clay-500 to-clay-300" style={{ width: `${(total / maxCat) * 100}%` }} /></div>
              </li>
            ))}
            {catOrden.length === 0 && <li className="py-6 text-center text-sm text-ink-400">Sin ventas cobradas todavía.</li>}
          </ul>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <h2 className="px-5 pt-5 pb-3 font-semibold">Inventario por categoría</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-sun-100 text-left text-xs text-ink-400"><th className="px-5 py-2 font-medium">Categoría</th><th className="px-3 py-2 text-right font-medium">Productos</th><th className="px-3 py-2 text-right font-medium">Unidades</th><th className="px-3 py-2 text-right font-medium">Valor a costo</th><th className="px-3 py-2 text-right font-medium">Valor a precio venta</th><th className="px-5 py-2 text-right font-medium">Por reponer</th></tr></thead>
            <tbody className="divide-y divide-sun-100">
              {(stock.data ?? []).map((c) => (
                <tr key={c.categoriaId}>
                  <td className="px-5 py-2.5 font-medium">{c.categoria}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.productos}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.unidades.toLocaleString("es-CL")}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{clp(c.valorCosto)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{clp(c.valorVenta)}</td>
                  <td className="px-5 py-2.5 text-right">{c.productosStockBajo > 0 ? <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">{c.productosStockBajo}</span> : <span className="text-ink-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
