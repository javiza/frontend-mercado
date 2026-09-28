"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, History, Lock, LockOpen } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api-client";
import { numeroTexto } from "@/lib/form-helpers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/store/session-store";
import type { AdminUser } from "@/types"; // tipo que ya existe en tu app
import type { Caja } from "@/lib/supermercado-types";

type Tab = "mi-caja" | "historial";

export default function AdminCajaPage() {
  const adminProfile = useSessionStore((s) => s.adminProfile);
  const esAdmin = adminProfile?.rol === "SUPER_ADMIN" || adminProfile?.rol === "ADMIN";
  const [tab, setTab] = useState<Tab>("mi-caja");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Caja</h1>
        <p className="text-sm text-ink-600">
          Abre tu turno antes de recibir pagos en efectivo, y ciérralo declarando lo que contaste
          al final.
        </p>
      </div>

      {esAdmin && (
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "mi-caja" ? "primary" : "ghost"} onClick={() => setTab("mi-caja")}>
            <Wallet className="size-4" />
            Mi caja
          </Button>
          <Button
            size="sm"
            variant={tab === "historial" ? "primary" : "ghost"}
            onClick={() => setTab("historial")}
          >
            <History className="size-4" />
            Historial de todas las cajas
          </Button>
        </div>
      )}

      {tab === "mi-caja" ? <MiCaja /> : <HistorialCajas />}
    </div>
  );
}

// --- Mi caja (abrir / cerrar) ---

const schemaAbrir = z.object({
  montoApertura: numeroTexto({ min: 0, mensaje: "Debe ser 0 o mayor" }),
});
type FormAbrir = z.infer<typeof schemaAbrir>;

const schemaCerrar = z.object({
  montoCierreDeclarado: numeroTexto({ min: 0, mensaje: "Debe ser 0 o mayor" }),
  observaciones: z.string().max(500).optional(),
});
type FormCerrar = z.infer<typeof schemaCerrar>;

function MiCaja() {
  const queryClient = useQueryClient();

  const { data: caja, isLoading } = useQuery({
    queryKey: ["mi-caja-actual"],
    queryFn: () => apiFetch<Caja | null>("/caja/actual"),
  });

  const formAbrir = useForm<FormAbrir>({
    resolver: zodResolver(schemaAbrir),
    defaultValues: { montoApertura: "0" },
  });
  const formCerrar = useForm<FormCerrar>({ resolver: zodResolver(schemaCerrar) });

  const abrir = useMutation({
    mutationFn: (values: FormAbrir) =>
      apiFetch<Caja>("/caja/abrir", {
        method: "POST",
        body: JSON.stringify({ montoApertura: Number(values.montoApertura) }),
      }),
    onSuccess: () => {
      toast.success("Caja abierta");
      queryClient.invalidateQueries({ queryKey: ["mi-caja-actual"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo abrir la caja");
    },
  });

  const cerrar = useMutation({
    mutationFn: (values: FormCerrar) =>
      apiFetch<Caja>(`/caja/${caja!.id}/cerrar`, {
        method: "PATCH",
        body: JSON.stringify({
          montoCierreDeclarado: Number(values.montoCierreDeclarado),
          observaciones: values.observaciones || undefined,
        }),
      }),
    onSuccess: (cerrada) => {
      toast.success(
        cerrada.diferencia === 0
          ? "Caja cerrada, cuadre exacto"
          : `Caja cerrada. Diferencia: $${Number(cerrada.diferencia).toLocaleString("es-CL")}`,
      );
      queryClient.invalidateQueries({ queryKey: ["mi-caja-actual"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo cerrar la caja");
    },
  });

  if (isLoading) {
    return <div className="h-32 rounded-card bg-sun-100/60 animate-pulse" />;
  }

  if (!caja) {
    return (
      <Card className="p-6 max-w-md flex flex-col gap-4">
        <div className="flex items-center gap-2 text-ink-700">
          <Lock className="size-5" />
          <h2 className="font-display text-lg font-semibold text-ink-900">No tienes caja abierta</h2>
        </div>
        <p className="text-sm text-ink-500">
          Abre tu turno con el monto inicial en efectivo antes de recibir pagos en efectivo en el
          punto de venta.
        </p>
        <form
          onSubmit={formAbrir.handleSubmit((values) => abrir.mutate(values))}
          className="flex gap-2 items-end"
        >
          <Input
            label="Monto de apertura"
            type="number"
            step="0.01"
            error={formAbrir.formState.errors.montoApertura?.message}
            {...formAbrir.register("montoApertura")}
          />
          <Button type="submit" disabled={abrir.isPending}>
            {abrir.isPending ? "Abriendo..." : "Abrir caja"}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-md flex flex-col gap-4">
      <div className="flex items-center gap-2 text-emerald-600">
        <LockOpen className="size-5" />
        <h2 className="font-display text-lg font-semibold text-ink-900">Caja abierta</h2>
      </div>
      <dl className="text-sm text-ink-600 grid grid-cols-2 gap-y-1">
        <dt>Apertura</dt>
        <dd className="text-ink-900">${Number(caja.montoApertura).toLocaleString("es-CL")}</dd>
        <dt>Desde</dt>
        <dd className="text-ink-900">{new Date(caja.abiertaEn).toLocaleString("es-CL")}</dd>
      </dl>
      <form
        onSubmit={formCerrar.handleSubmit((values) => cerrar.mutate(values))}
        className="flex flex-col gap-3"
      >
        <Input
          label="Monto contado al cerrar"
          type="number"
          step="0.01"
          error={formCerrar.formState.errors.montoCierreDeclarado?.message}
          {...formCerrar.register("montoCierreDeclarado")}
        />
        <Input
          label="Observaciones (opcional)"
          error={formCerrar.formState.errors.observaciones?.message}
          {...formCerrar.register("observaciones")}
        />
        <Button type="submit" variant="ghost" disabled={cerrar.isPending}>
          {cerrar.isPending ? "Cerrando..." : "Cerrar caja"}
        </Button>
      </form>
    </Card>
  );
}

// --- Historial (solo admin) ---

function HistorialCajas() {
  const { data: cajas, isLoading } = useQuery({
    queryKey: ["admin-cajas"],
    queryFn: () => apiFetch<Caja[]>("/caja"),
  });

  // El backend guarda solo usuarioId en Caja (no una relación); se cruza
  // acá con /users para mostrar el nombre en vez de un número pelado.
  const { data: usuarios } = useQuery({
    queryKey: ["admin-usuarios-equipo-todos"],
    queryFn: () => apiFetch<AdminUser[]>("/users"),
  });
  const nombrePorId = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-card bg-sun-100/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-sun-50 text-ink-500 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Cajero</th>
            <th className="px-4 py-3 font-medium">Apertura</th>
            <th className="px-4 py-3 font-medium">Esperado</th>
            <th className="px-4 py-3 font-medium">Declarado</th>
            <th className="px-4 py-3 font-medium">Diferencia</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sun-100">
          {(cajas ?? []).map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 text-ink-700">{nombrePorId.get(c.usuarioId) ?? `#${c.usuarioId}`}</td>
              <td className="px-4 py-3 text-ink-600">
                {new Date(c.abiertaEn).toLocaleString("es-CL")}
              </td>
              <td className="px-4 py-3 text-ink-600">
                {c.montoEsperado != null ? `$${Number(c.montoEsperado).toLocaleString("es-CL")}` : "—"}
              </td>
              <td className="px-4 py-3 text-ink-600">
                {c.montoCierreDeclarado != null
                  ? `$${Number(c.montoCierreDeclarado).toLocaleString("es-CL")}`
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {c.diferencia != null ? (
                  <span className={Number(c.diferencia) === 0 ? "text-emerald-600" : "text-red-600"}>
                    ${Number(c.diferencia).toLocaleString("es-CL")}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    c.estado === "ABIERTA" ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-500"
                  }`}
                >
                  {c.estado}
                </span>
              </td>
            </tr>
          ))}
          {(cajas ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-ink-400">
                Sin registros todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
