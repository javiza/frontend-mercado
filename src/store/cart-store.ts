import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Producto } from "@/lib/supermercado-types";

export type LineaCarro = { producto: Producto; cantidad: number };
type State = {
  lineas: LineaCarro[];
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  agregar: (p: Producto) => void;
  cambiar: (id: number, delta: number) => void;
  quitar: (id: number) => void;
  vaciar: () => void;
};

export const useCart = create<State>()(
  persist(
    (set) => ({
      lineas: [], abierto: false,
      setAbierto: (abierto) => set({ abierto }),
      agregar: (p) => set((s) => {
        const ex = s.lineas.find((l) => l.producto.id === p.id);
        if (ex) return { lineas: s.lineas.map((l) => l.producto.id === p.id ? { ...l, cantidad: Math.min(l.cantidad + 1, p.stockActual) } : l) };
        return { lineas: [...s.lineas, { producto: p, cantidad: 1 }] };
      }),
      cambiar: (id, delta) => set((s) => ({
        lineas: s.lineas.map((l) => l.producto.id === id ? { ...l, cantidad: Math.max(1, Math.min(l.cantidad + delta, l.producto.stockActual)) } : l),
      })),
      quitar: (id) => set((s) => ({ lineas: s.lineas.filter((l) => l.producto.id !== id) })),
      vaciar: () => set({ lineas: [] }),
    }),
    { name: "sm-carrito", partialize: (s) => ({ lineas: s.lineas }) },
  ),
);
