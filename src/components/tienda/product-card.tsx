"use client";

import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { clp } from "@/lib/format";
import { useCart } from "@/store/cart-store";
import type { Producto } from "@/lib/supermercado-types";

const TONOS = ["from-clay-100 to-sun-200", "from-sun-100 to-clay-200", "from-mint-100 to-sun-200", "from-ocean-100 to-clay-100"];

export function ProductCard({ p }: { p: Producto }) {
  const agregar = useCart((s) => s.agregar);
  const [ok, setOk] = useState(false);
  const agotado = p.stockActual <= 0;
  const pocas = !agotado && p.stockActual <= Math.max(p.stockMinimo, 3);

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-sun-200/80 bg-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className={`relative grid aspect-[4/3] place-items-center bg-gradient-to-br ${TONOS[p.id % TONOS.length]}`}>
        {p.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imagenUrl} alt={p.nombre} loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="text-5xl font-semibold text-white/90 drop-shadow-sm">{p.nombre.charAt(0).toUpperCase()}</span>
        )}
        {p.categoria && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink-600 backdrop-blur">{p.categoria.nombre}</span>}
        {agotado && <span className="absolute right-3 top-3 rounded-full bg-ink-800 px-2.5 py-1 text-[11px] font-medium text-white">Agotado</span>}
        {pocas && <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">Quedan {p.stockActual}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-h-[2.75rem]">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-900">{p.nombre}</h3>
          <p className="mt-0.5 text-xs text-ink-400">por {p.unidadMedida.toLowerCase()}</p>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-semibold tabular-nums text-ink-900">{clp(p.precioVenta)}</span>
          <button
            disabled={agotado}
            onClick={() => { agregar(p); setOk(true); setTimeout(() => setOk(false), 900); }}
            aria-label={`Agregar ${p.nombre}`}
            className="grid size-10 place-items-center rounded-xl bg-clay-600 text-white shadow-sm transition hover:bg-clay-700 active:scale-95 disabled:bg-ink-200 disabled:text-ink-400"
          >
            {ok ? <Check className="size-5" /> : <Plus className="size-5" />}
          </button>
        </div>
      </div>
    </article>
  );
}
