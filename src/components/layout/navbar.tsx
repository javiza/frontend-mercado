"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ShoppingBasket, ShoppingCart, User, LayoutDashboard, LogOut } from "lucide-react";
import { useSessionStore } from "@/store/session-store";
import { useCart } from "@/store/cart-store";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { role, adminProfile, clienteProfile } = useSessionStore();
  const items = useCart((s) => s.lineas.reduce((a, l) => a + l.cantidad, 0));
  const setAbierto = useCart((s) => s.setAbierto);
  const enPanel = pathname.startsWith("/dashboard/admin");

  async function salir() {
    await fetch(role === "admin" ? "/api/auth/admin/logout" : "/api/auth/cliente/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-sun-200/80 bg-white/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-clay-400 to-clay-600 text-white shadow-sm">
            <ShoppingBasket className="size-5" strokeWidth={2} />
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink-900">
            Fresh<span className="text-clay-600">Market</span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/#catalogo" className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-sun-100 hover:text-ink-900">Catálogo</Link>
          {role === "admin" && !enPanel && (
            <Link href="/dashboard/admin"><Button variant="secondary" size="sm"><LayoutDashboard className="size-4" /> Panel</Button></Link>
          )}
          {role === "cliente" && (
            <Link href="/dashboard/cliente"><Button variant="secondary" size="sm"><User className="size-4" /> {clienteProfile?.nombre?.split(" ")[0] ?? "Mi cuenta"}</Button></Link>
          )}
          {role ? (
            <Button variant="ghost" size="sm" onClick={salir}><LogOut className="size-4" /> Salir</Button>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm">Ingresar</Button></Link>
              <Link href="/registro"><Button size="sm">Crear cuenta</Button></Link>
            </>
          )}
          {!enPanel && role !== "admin" && (
            <button onClick={() => setAbierto(true)} aria-label="Abrir carrito" className="relative ml-1 grid size-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-800 hover:bg-sun-100">
              <ShoppingCart className="size-5" />
              {items > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-clay-600 px-1 text-[11px] font-semibold text-white">{items}</span>}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {!enPanel && role !== "admin" && (
            <button onClick={() => setAbierto(true)} aria-label="Abrir carrito" className="relative p-2 text-ink-800">
              <ShoppingCart className="size-6" />
              {items > 0 && <span className="absolute right-0 top-0 grid min-w-5 place-items-center rounded-full bg-clay-600 px-1 text-[11px] font-semibold text-white">{items}</span>}
            </button>
          )}
          <button className="p-2 text-ink-800" onClick={() => setOpen((v) => !v)} aria-label="Abrir menú">
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="flex flex-col gap-1 border-t border-sun-100 bg-white px-4 py-3 text-sm font-medium md:hidden">
          <Link className="rounded-lg px-3 py-2.5 hover:bg-sun-100" href="/#catalogo" onClick={() => setOpen(false)}>Catálogo</Link>
          {role === "admin" && <Link className="rounded-lg px-3 py-2.5 hover:bg-sun-100" href="/dashboard/admin" onClick={() => setOpen(false)}>Panel</Link>}
          {role === "cliente" && <Link className="rounded-lg px-3 py-2.5 hover:bg-sun-100" href="/dashboard/cliente" onClick={() => setOpen(false)}>Mis pedidos</Link>}
          {role ? (
            <button onClick={salir} className="rounded-lg px-3 py-2.5 text-left text-danger hover:bg-red-50">Cerrar sesión</button>
          ) : (
            <>
              <Link className="rounded-lg px-3 py-2.5 hover:bg-sun-100" href="/login" onClick={() => setOpen(false)}>Ingresar</Link>
              <Link className="rounded-lg px-3 py-2.5 hover:bg-sun-100" href="/registro" onClick={() => setOpen(false)}>Crear cuenta</Link>
            </>
          )}
          {adminProfile && <span className="px-3 pt-1 text-xs text-ink-400">{adminProfile.email}</span>}
        </div>
      )}
    </header>
  );
}
