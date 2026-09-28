"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Truck, ShieldCheck, Leaf, PackageOpen } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { ProductCard } from "@/components/tienda/product-card";
import type { Categoria, Producto } from "@/lib/supermercado-types";

export default function TiendaPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | null>(null);

  const { data: categorias } = useQuery({ queryKey: ["categorias"], queryFn: () => apiFetch<Categoria[]>("/categorias") });
  const { data: productos, isLoading } = useQuery({
    queryKey: ["catalogo", q, cat],
    queryFn: () => {
      const p = new URLSearchParams({ soloVisibles: "true" });
      if (q.trim()) p.set("q", q.trim());
      if (cat) p.set("categoriaId", String(cat));
      return apiFetch<Producto[]>(`/productos?${p}`);
    },
  });

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 sm:pt-12">
        <div className="animate-rise relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-clay-600 via-clay-500 to-clay-300 px-6 py-10 text-white shadow-[var(--shadow-lift)] sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 right-24 size-64 rounded-full bg-sun-200/30 blur-3xl" />
          <div className="relative max-w-xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur"><Leaf className="size-3.5" /> Fresco todos los días</p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">Tu supermercado, sin filas ni cargar bolsas.</h1>
            <p className="mt-3 text-base text-white/85 sm:text-lg">Elige lo que necesitas, retíralo en tienda o recíbelo en tu puerta.</p>
            <div className="mt-6 flex max-w-md items-center gap-2 rounded-2xl bg-white p-1.5 shadow-lg">
              <Search className="ml-3 size-5 shrink-0 text-ink-400" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca leche, pan, frutas..."
                aria-label="Buscar productos"
                className="h-11 w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            [Truck, "Retiro o despacho", "Tú eliges cómo recibirlo"],
            [ShieldCheck, "Stock real", "Solo ves lo que hay disponible"],
            [Leaf, "Calidad fresca", "Reposición diaria"],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof Truck;
            return (
              <li key={i} className="flex items-center gap-3 rounded-2xl border border-sun-200/80 bg-white/70 px-4 py-3">
                <span className="grid size-10 place-items-center rounded-xl bg-clay-50 text-clay-600"><I className="size-5" /></span>
                <div><p className="text-sm font-medium">{t as string}</p><p className="text-xs text-ink-500">{d as string}</p></div>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-16 sm:px-6">
        <div className="scrollbar-fina -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
          {[{ id: null, nombre: "Todo" }, ...(categorias ?? []).filter((c) => c.activo)].map((c) => (
            <button
              key={c.id ?? "todo"} onClick={() => setCat(c.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                cat === c.id ? "border-clay-600 bg-clay-600 text-white shadow-sm" : "border-ink-200 bg-white text-ink-700 hover:bg-sun-100"
              }`}
            >{c.nombre}</button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-card bg-sun-100/70" />)}
          </div>
        ) : (productos ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-sun-300 bg-white/60 py-20 text-center text-ink-500">
            <PackageOpen className="size-12 text-sun-300" />
            <p className="font-medium text-ink-800">No encontramos productos</p>
            <p className="text-sm">Prueba con otra búsqueda o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {(productos ?? []).filter((p) => p.activo).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      <footer className="border-t border-sun-200/80 bg-white/60 py-8 text-center text-sm text-ink-500">
        © {new Date().getFullYear()} FreshMarket · Todos los derechos reservados
      </footer>
    </div>
  );
}
