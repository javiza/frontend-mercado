"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, ShoppingCart, Trash2, X, CheckCircle2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { clp } from "@/lib/format";
import { useCart } from "@/store/cart-store";
import { useSessionStore } from "@/store/session-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CartDrawer() {
  const { lineas, abierto, setAbierto, cambiar, quitar, vaciar } = useCart();
  const role = useSessionStore((s) => s.role);
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [pedido, setPedido] = useState<number | null>(null);
  const total = lineas.reduce((a, l) => a + Number(l.producto.precioVenta) * l.cantidad, 0);

  const comprar = useMutation({
    mutationFn: () =>
      apiFetch<{ id: number }>("/ventas/online", {
        method: "POST",
        body: JSON.stringify({
          detalles: lineas.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
          direccionEntrega: direccion.trim() || undefined,
          notas: notas.trim() || undefined,
        }),
      }),
    onSuccess: (v) => { vaciar(); setPedido(v.id); setDireccion(""); setNotas(""); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "No se pudo crear el pedido"),
  });

  if (!abierto) return null;
  const cerrar = () => { setAbierto(false); setPedido(null); };

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Cerrar carrito" onClick={cerrar} className="absolute inset-0 bg-ocean-900/30 backdrop-blur-[2px]" />
      <aside className="animate-slide-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-sun-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><ShoppingCart className="size-5 text-clay-600" /> Tu carrito</h2>
          <button onClick={cerrar} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-sun-100"><X className="size-5" /></button>
        </header>

        {pedido ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <CheckCircle2 className="size-14 text-mint-500" />
            <h3 className="text-xl font-semibold">¡Pedido #{pedido} recibido!</h3>
            <p className="text-sm text-ink-500">Lo estamos preparando. Te avisaremos cuando esté listo; puedes seguirlo en “Mis pedidos”.</p>
            <Link href="/dashboard/cliente" onClick={cerrar}><Button>Ver mis pedidos</Button></Link>
          </div>
        ) : lineas.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center text-ink-500">
            <ShoppingCart className="size-12 text-sun-300" />
            <p className="font-medium text-ink-800">Tu carrito está vacío</p>
            <p className="text-sm">Agrega productos desde el catálogo.</p>
          </div>
        ) : (
          <>
            <ul className="scrollbar-fina flex-1 divide-y divide-sun-100 overflow-y-auto px-5">
              {lineas.map(({ producto: p, cantidad }) => (
                <li key={p.id} className="flex items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{p.nombre}</p>
                    <p className="text-xs text-ink-500">{clp(p.precioVenta)} · {p.unidadMedida.toLowerCase()}</p>
                  </div>
                  <div className="flex items-center rounded-lg border border-ink-200">
                    <button aria-label="Menos" className="p-1.5 hover:bg-sun-100" onClick={() => cambiar(p.id, -1)}><Minus className="size-3.5" /></button>
                    <span className="w-7 text-center text-sm tabular-nums">{cantidad}</span>
                    <button aria-label="Más" className="p-1.5 hover:bg-sun-100 disabled:opacity-40" disabled={cantidad >= p.stockActual} onClick={() => cambiar(p.id, 1)}><Plus className="size-3.5" /></button>
                  </div>
                  <p className="w-20 text-right text-sm font-semibold tabular-nums">{clp(Number(p.precioVenta) * cantidad)}</p>
                  <button aria-label="Quitar" className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-danger" onClick={() => quitar(p.id)}><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
            <footer className="flex flex-col gap-3 border-t border-sun-200 bg-sun-50/60 px-5 py-4">
              {role === "cliente" && (
                <>
                  <Input label="Dirección de entrega (opcional)" placeholder="Déjalo vacío para retirar en tienda" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                  <Input label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-600">Total</span>
                <span className="text-2xl font-semibold tabular-nums">{clp(total)}</span>
              </div>
              {role === "cliente" ? (
                <Button size="lg" disabled={comprar.isPending} onClick={() => comprar.mutate()}>{comprar.isPending ? "Enviando..." : "Confirmar pedido"}</Button>
              ) : (
                <Link href="/login?next=/" onClick={cerrar}><Button size="lg" className="w-full">Inicia sesión para comprar</Button></Link>
              )}
              <p className="text-center text-xs text-ink-400">El pago se coordina al retirar o recibir tu pedido.</p>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
