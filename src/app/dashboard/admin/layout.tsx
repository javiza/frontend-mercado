"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Boxes, Warehouse, ShoppingCart, Banknote, UserCog, Users, Contact, Menu, X, ShoppingBasket, BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useSessionStore } from "@/store/session-store";
import type { Rol } from "@/types";

type Item = { href: string; label: string; icon: LucideIcon; roles: Rol[] };
const TODOS: Rol[] = ["SUPER_ADMIN", "ADMIN", "CAJERO", "BODEGA"];
const GESTION: Rol[] = ["SUPER_ADMIN", "ADMIN"];

const GRUPOS: { titulo: string; items: Item[] }[] = [
  {
    titulo: "General",
    items: [
      { href: "/dashboard/admin", label: "Resumen", icon: LayoutDashboard, roles: TODOS },
      { href: "/dashboard/admin/reportes", label: "Reportes", icon: BarChart3, roles: GESTION },
    ],
  },
  {
    titulo: "Operación",
    items: [
      { href: "/dashboard/admin/ventas", label: "Ventas", icon: ShoppingCart, roles: [...GESTION, "CAJERO"] },
      { href: "/dashboard/admin/caja", label: "Caja", icon: Banknote, roles: [...GESTION, "CAJERO"] },
      { href: "/dashboard/admin/productos", label: "Productos", icon: Boxes, roles: [...GESTION, "BODEGA"] },
      { href: "/dashboard/admin/inventario", label: "Inventario", icon: Warehouse, roles: [...GESTION, "BODEGA"] },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { href: "/dashboard/admin/personal", label: "Personal", icon: UserCog, roles: GESTION },
      { href: "/dashboard/admin/usuarios", label: "Usuarios y clientes", icon: Users, roles: GESTION },
    ],
  },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const perfil = useSessionStore((s) => s.adminProfile);
  const [abierto, setAbierto] = useState(false);
  useEffect(() => setAbierto(false), [pathname]);

  const nav = (
    <nav className="flex flex-col gap-5 text-sm">
      {GRUPOS.map((g) => {
        const items = g.items.filter((i) => !perfil || i.roles.includes(perfil.rol));
        if (items.length === 0) return null;
        return (
          <div key={g.titulo} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{g.titulo}</p>
            {items.map(({ href, label, icon: Icon }) => {
              const activo = href === "/dashboard/admin" ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium transition ${
                    activo ? "bg-clay-50 text-clay-700 ring-1 ring-clay-100" : "text-ink-600 hover:bg-sun-100 hover:text-ink-900"}`}>
                  <Icon className={`size-[18px] ${activo ? "text-clay-600" : "text-ink-400"}`} />
                  {label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  const cabecera = (
    <div className="mb-6 flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-clay-50 text-clay-600"><ShoppingBasket className="size-5" /></span>
      <div className="leading-tight">
        <p className="text-sm font-semibold">Panel interno</p>
        <p className="text-xs text-ink-400">{perfil ? `${perfil.nombre.split(" ")[0]} · ${perfil.rol.replace("_", " ").toLowerCase()}` : "Cargando..."}</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <p className="font-semibold">Panel interno</p>
        <button onClick={() => setAbierto(true)} aria-label="Abrir menú" className="rounded-xl border border-ink-200 bg-white p-2"><Menu className="size-5" /></button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[236px_1fr]">
        <aside className="scrollbar-fina hidden h-max max-h-[calc(100vh-6rem)] overflow-y-auto rounded-card border border-sun-200/80 bg-white p-4 shadow-[var(--shadow-soft)] lg:sticky lg:top-24 lg:block">
          {cabecera}{nav}
        </aside>

        {abierto && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button aria-label="Cerrar menú" onClick={() => setAbierto(false)} className="absolute inset-0 bg-ocean-900/30 backdrop-blur-[2px]" />
            <div className="animate-slide-in absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto bg-white p-4 shadow-2xl">
              <div className="mb-2 flex justify-end"><button onClick={() => setAbierto(false)} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-sun-100"><X className="size-5" /></button></div>
              {cabecera}{nav}
            </div>
          </div>
        )}

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
