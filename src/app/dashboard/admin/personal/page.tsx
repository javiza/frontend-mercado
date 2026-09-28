"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, CalendarClock, Pencil, Plus, X, Trash2 } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api-client";
import { numeroTexto } from "@/lib/form-helpers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminUser } from "@/types"; // tipo que ya existe en tu app
import type { Empleado, Turno } from "@/lib/supermercado-types";

type Tab = "empleados" | "turnos";

export default function AdminPersonalPage() {
  const [tab, setTab] = useState<Tab>("empleados");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Personal</h1>
        <p className="text-sm text-ink-600">
          Fichas de RR.HH. del equipo (cargo, sueldo, contrato) y calendario de turnos.
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "empleados" ? "primary" : "ghost"} onClick={() => setTab("empleados")}>
          <Users className="size-4" />
          Empleados
        </Button>
        <Button size="sm" variant={tab === "turnos" ? "primary" : "ghost"} onClick={() => setTab("turnos")}>
          <CalendarClock className="size-4" />
          Turnos
        </Button>
      </div>

      {tab === "empleados" ? <TablaEmpleados /> : <TablaTurnos />}
    </div>
  );
}

// --- Empleados ---

const schemaEmpleado = z.object({
  usuarioId: z.string().min(1, "Elige una cuenta"),
  cargo: z.string().min(1, "Requerido").max(100),
  sueldoBase: numeroTexto({ min: 0, mensaje: "Debe ser 0 o mayor" }),
  fechaContratacion: z.string().min(1, "Requerido"),
  telefono: z.string().max(50).optional(),
  direccion: z.string().max(500).optional(),
  contactoEmergenciaNombre: z.string().max(150).optional(),
  contactoEmergenciaTelefono: z.string().max(50).optional(),
});

type FormEmpleado = z.infer<typeof schemaEmpleado>;

function TablaEmpleados() {
  const queryClient = useQueryClient();
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Empleado | null>(null);

  const { data: empleados, isLoading } = useQuery({
    queryKey: ["admin-empleados"],
    queryFn: () => apiFetch<Empleado[]>("/empleados"),
  });

  // Para el selector de "crear ficha nueva" — cualquier cuenta de /users
  // sirve (Admin, Cajero, Bodega...); si ya tiene ficha, el backend avisa
  // con un error claro al guardar.
  const { data: usuarios } = useQuery({
    queryKey: ["admin-usuarios-equipo-todos"],
    queryFn: () => apiFetch<AdminUser[]>("/users"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormEmpleado>({ resolver: zodResolver(schemaEmpleado) });

  function abrirCreacion() {
    setEditando(null);
    setFormAbierto(true);
    reset({
      usuarioId: "",
      cargo: "",
      sueldoBase: "0",
      fechaContratacion: "",
      telefono: "",
      direccion: "",
      contactoEmergenciaNombre: "",
      contactoEmergenciaTelefono: "",
    });
  }

  function abrirEdicion(e: Empleado) {
    setEditando(e);
    setFormAbierto(true);
    reset({
      usuarioId: String(e.usuario.id),
      cargo: e.cargo,
      sueldoBase: String(e.sueldoBase),
      fechaContratacion: e.fechaContratacion.slice(0, 10),
      telefono: e.telefono ?? "",
      direccion: e.direccion ?? "",
      contactoEmergenciaNombre: e.contactoEmergenciaNombre ?? "",
      contactoEmergenciaTelefono: e.contactoEmergenciaTelefono ?? "",
    });
  }

  function cerrarFormulario() {
    setFormAbierto(false);
    setEditando(null);
  }

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["admin-empleados"] });

  const crear = useMutation({
    mutationFn: (values: FormEmpleado) =>
      apiFetch<Empleado>("/empleados", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          usuarioId: Number(values.usuarioId),
          sueldoBase: Number(values.sueldoBase),
        }),
      }),
    onSuccess: () => {
      toast.success("Ficha de empleado creada");
      cerrarFormulario();
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear la ficha");
    },
  });

  const actualizar = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FormEmpleado }) =>
      apiFetch<Empleado>(`/empleados/${id}`, {
        method: "PATCH",
        // usuarioId no se edita (UpdateEmpleadoDto lo excluye): se saca del
        // body para no chocar con un ValidationPipe con forbidNonWhitelisted.
        body: JSON.stringify({
          cargo: values.cargo,
          sueldoBase: Number(values.sueldoBase),
          fechaContratacion: values.fechaContratacion,
          telefono: values.telefono || undefined,
          direccion: values.direccion || undefined,
          contactoEmergenciaNombre: values.contactoEmergenciaNombre || undefined,
          contactoEmergenciaTelefono: values.contactoEmergenciaTelefono || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Ficha actualizada");
      cerrarFormulario();
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar la ficha");
    },
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activar }: { id: number; activar: boolean }) =>
      apiFetch<Empleado>(`/empleados/${id}/${activar ? "reactivate" : "deactivate"}`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Ficha actualizada");
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar la ficha");
    },
  });

  const guardando = crear.isPending || actualizar.isPending;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-card bg-sun-100/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => (formAbierto ? cerrarFormulario() : abrirCreacion())}>
          {formAbierto ? <X className="size-4" /> : <Plus className="size-4" />}
          {formAbierto ? "Cancelar" : "Nueva ficha"}
        </Button>
      </div>

      {formAbierto && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
            {editando ? `Editando: ${editando.usuario.nombre}` : "Nueva ficha de empleado"}
          </h2>
          <form
            onSubmit={handleSubmit((values) =>
              editando
                ? actualizar.mutate({ id: editando.id, values })
                : crear.mutate(values),
            )}
            className="grid sm:grid-cols-2 gap-4"
          >
            {!editando && (
              <Select
                label="Cuenta de usuario"
                error={errors.usuarioId?.message}
                {...register("usuarioId")}
              >
                <option value="">Elige una cuenta...</option>
                {(usuarios ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.rol})
                  </option>
                ))}
              </Select>
            )}
            <Input label="Cargo" placeholder="Cajero, Bodeguero..." error={errors.cargo?.message} {...register("cargo")} />
            <Input
              label="Sueldo base"
              type="number"
              step="0.01"
              error={errors.sueldoBase?.message}
              {...register("sueldoBase")}
            />
            <Input
              label="Fecha de contratación"
              type="date"
              error={errors.fechaContratacion?.message}
              {...register("fechaContratacion")}
            />
            <Input label="Teléfono (opcional)" error={errors.telefono?.message} {...register("telefono")} />
            <Input
              label="Dirección (opcional)"
              error={errors.direccion?.message}
              {...register("direccion")}
            />
            <Input
              label="Contacto de emergencia (opcional)"
              error={errors.contactoEmergenciaNombre?.message}
              {...register("contactoEmergenciaNombre")}
            />
            <Input
              label="Teléfono de emergencia (opcional)"
              error={errors.contactoEmergenciaTelefono?.message}
              {...register("contactoEmergenciaTelefono")}
            />
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear ficha"}
              </Button>
              <Button type="button" variant="ghost" onClick={cerrarFormulario}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sun-50 text-ink-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium">Sueldo base</th>
              <th className="px-4 py-3 font-medium">Contratado</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sun-100">
            {(empleados ?? []).map((e) => (
              <tr key={e.id} className={!e.activo ? "opacity-50" : undefined}>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink-900">{e.usuario.nombre}</div>
                  <div className="text-xs text-ink-400">{e.usuario.email}</div>
                </td>
                <td className="px-4 py-3 text-ink-600">{e.cargo}</td>
                <td className="px-4 py-3 text-ink-900">
                  ${Number(e.sueldoBase).toLocaleString("es-CL")}
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {new Date(e.fechaContratacion).toLocaleDateString("es-CL")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      e.activo ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {e.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => abrirEdicion(e)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={toggleActivo.isPending}
                      onClick={() => toggleActivo.mutate({ id: e.id, activar: !e.activo })}
                    >
                      {e.activo ? "Desactivar" : "Reactivar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(empleados ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-400">
                  No hay fichas de empleado todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// --- Turnos ---

const schemaTurno = z.object({
  empleadoId: z.string().min(1, "Elige un empleado"),
  fecha: z.string().min(1, "Requerido"),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm"),
  notas: z.string().max(300).optional(),
});

type FormTurno = z.infer<typeof schemaTurno>;

function TablaTurnos() {
  const queryClient = useQueryClient();
  const [formAbierto, setFormAbierto] = useState(false);
  const [filtroEmpleado, setFiltroEmpleado] = useState("");

  const { data: empleados } = useQuery({
    queryKey: ["admin-empleados-activos"],
    queryFn: () => apiFetch<Empleado[]>("/empleados?soloActivos=true"),
  });

  const { data: turnos, isLoading } = useQuery({
    queryKey: ["admin-turnos", filtroEmpleado],
    queryFn: () =>
      apiFetch<Turno[]>(`/turnos${filtroEmpleado ? `?empleadoId=${filtroEmpleado}` : ""}`),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormTurno>({ resolver: zodResolver(schemaTurno) });

  function abrirCreacion() {
    setFormAbierto(true);
    reset({ empleadoId: "", fecha: "", horaInicio: "", horaFin: "", notas: "" });
  }

  const crear = useMutation({
    mutationFn: (values: FormTurno) =>
      apiFetch<Turno>("/turnos", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          empleadoId: Number(values.empleadoId),
          notas: values.notas || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Turno creado");
      setFormAbierto(false);
      queryClient.invalidateQueries({ queryKey: ["admin-turnos"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear el turno");
    },
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/turnos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Turno eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-turnos"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar el turno");
    },
  });

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={filtroEmpleado} onChange={(e) => setFiltroEmpleado(e.target.value)}>
          <option value="">Todos los empleados</option>
          {(empleados ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.usuario.nombre}
            </option>
          ))}
        </Select>
        <Button size="sm" onClick={() => (formAbierto ? setFormAbierto(false) : abrirCreacion())}>
          {formAbierto ? <X className="size-4" /> : <Plus className="size-4" />}
          {formAbierto ? "Cancelar" : "Nuevo turno"}
        </Button>
      </div>

      {formAbierto && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Nuevo turno</h2>
          <form
            onSubmit={handleSubmit((values) => crear.mutate(values))}
            className="grid sm:grid-cols-2 gap-4"
          >
            <Select label="Empleado" error={errors.empleadoId?.message} {...register("empleadoId")}>
              <option value="">Elige un empleado...</option>
              {(empleados ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.usuario.nombre}
                </option>
              ))}
            </Select>
            <Input label="Fecha" type="date" error={errors.fecha?.message} {...register("fecha")} />
            <Input
              label="Hora de inicio"
              placeholder="09:00"
              error={errors.horaInicio?.message}
              {...register("horaInicio")}
            />
            <Input
              label="Hora de fin"
              placeholder="17:00"
              error={errors.horaFin?.message}
              {...register("horaFin")}
            />
            <Input
              label="Notas (opcional)"
              className="sm:col-span-2"
              error={errors.notas?.message}
              {...register("notas")}
            />
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={crear.isPending}>
                {crear.isPending ? "Guardando..." : "Crear turno"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setFormAbierto(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sun-50 text-ink-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Horario</th>
              <th className="px-4 py-3 font-medium">Notas</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sun-100">
            {(turnos ?? []).map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-ink-900">{t.empleado.usuario.nombre}</td>
                <td className="px-4 py-3 text-ink-600">
                  {new Date(t.fecha).toLocaleDateString("es-CL")}
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {t.horaInicio} – {t.horaFin}
                </td>
                <td className="px-4 py-3 text-ink-500">{t.notas ?? "—"}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={() => eliminar.mutate(t.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {(turnos ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-400">
                  No hay turnos para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
