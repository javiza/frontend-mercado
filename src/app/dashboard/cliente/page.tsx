"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PackageOpen, Receipt } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { clp } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/tienda/estado-badge";
import { useSessionStore } from "@/store/session-store";
import type { Venta } from "@/lib/supermercado-types";

export default function MisPedidosPage() {
  const cliente = useSessionStore((s) => s.clienteProfile);
  const { data, isLoading } = useQuery({ queryKey: ["mis-pedidos"], queryFn: () => apiFetch<Venta[]>("/ventas/mias") });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Hola{cliente ? `, ${cliente.nombre.split(" ")[0]}` : ""} 👋</h1>
      <p className="mb-6 mt-1 text-sm text-ink-500">Aquí están tus pedidos.</p>

      {isLoading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-card bg-sun-100/70" />)}</div>
      ) : (data ?? []).length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <PackageOpen className="size-12 text-sun-300" />
          <p className="font-medium">Aún no tienes pedidos</p>
          <Link href="/#catalogo"><Button>Ir al catálogo</Button></Link>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {(data ?? []).map((v) => (
            <Card key={v.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium"><Receipt className="size-4 text-clay-600" /> Pedido #{v.id}</div>
                <EstadoBadge estado={v.estado} />
              </div>
              <p className="mt-1 text-xs text-ink-400">{new Date(v.creadoEn).toLocaleString("es-CL")}</p>
              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                {v.detalles?.map((d) => <li key={d.id}>{d.cantidad} × {d.producto.nombre}</li>)}
              </ul>
              <p className="mt-3 border-t border-sun-100 pt-3 text-right text-lg font-semibold tabular-nums">{clp(v.total)}</p>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
