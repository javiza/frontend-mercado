"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  ShieldCheck,
  UserRound,
  UserCheck,
  UserX,
  Pencil,
  Trash2,
  X,
  UserPlus,
} from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useSessionStore } from "@/store/session-store";
import type { AdminUser, Cliente } from "@/types";

type Tab = "clientes" | "equipo";

export default function AdminUsuariosPage() {
  const [tab, setTab] = useState<Tab>("clientes");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");

  // Debounce simple: evita disparar una consulta por cada tecla mientras
  // el admin escribe el nombre/RUT que está buscando.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Usuarios</h1>
        <p className="text-sm text-ink-600">
          Clientes registrados en el sitio y cuentas internas del equipo. Busca por nombre, email
          o RUT.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "clientes" ? "primary" : "ghost"}
            onClick={() => setTab("clientes")}
          >
            <UserRound className="size-4" />
            Clientes
          </Button>
          <Button
            size="sm"
            variant={tab === "equipo" ? "primary" : "ghost"}
            onClick={() => setTab("equipo")}
          >
            <ShieldCheck className="size-4" />
            Equipo interno
          </Button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-300" />
          <Input
            placeholder="Buscar por nombre, email o RUT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {tab === "clientes" ? (
        <TablaClientes q={busquedaDebounced} />
      ) : (
        <TablaEquipo q={busquedaDebounced} />
      )}
    </div>
  );
}

// --- Clientes: editar datos de contacto o eliminar la cuenta ---

const schemaClienteEdit = z.object({
  nombre: z.string().min(1, "Requerido").max(150),
  telefono: z.string().max(50).optional(),
  rut: z.string().max(20).optional(),
});

type FormClienteEdit = z.infer<typeof schemaClienteEdit>;

function TablaClientes({ q }: { q: string }) {
  const queryClient = useQueryClient();
  const adminProfile = useSessionStore((s) => s.adminProfile);
  // Eliminar cliente es definitivo y el backend lo restringe a
  // SUPER_ADMIN (ver ClientesController.eliminar); un ADMIN normal sí
  // puede editar/deshabilitar/reactivar clientes. Ocultamos el botón
  // acá para que no le aparezca una acción que el backend le va a
  // rechazar con 403.
  const esSuperAdmin = adminProfile?.rol === "SUPER_ADMIN";
  const [editando, setEditando] = useState<Cliente | null>(null);

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["admin-clientes", q],
    queryFn: () =>
      apiFetch<Cliente[]>(`/clientes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormClienteEdit>({ resolver: zodResolver(schemaClienteEdit) });

  function abrirEdicion(c: Cliente) {
    setEditando(c);
    reset({ nombre: c.nombre, telefono: c.telefono ?? "", rut: c.rut ?? "" });
  }

  function cerrarEdicion() {
    setEditando(null);
    reset({ nombre: "", telefono: "", rut: "" });
  }

  const actualizar = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FormClienteEdit }) =>
      apiFetch<Cliente>(`/clientes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...values,
          telefono: values.telefono || undefined,
          rut: values.rut || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Cliente actualizado");
      cerrarEdicion();
      queryClient.invalidateQueries({ queryKey: ["admin-clientes"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar el cliente");
    },
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activar }: { id: number; activar: boolean }) =>
      apiFetch<Cliente>(`/clientes/${id}/${activar ? "reactivate" : "deactivate"}`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Cliente actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-clientes"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar el cliente");
    },
  });

  // Borrado definitivo (a diferencia de deactivate): reservas, cotizaciones
  // y movimientos financieros del cliente no se borran, solo quedan sin
  // cliente vinculado (ver ClientesService.eliminar en el backend).
  const eliminar = useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/clientes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Cliente eliminado de forma definitiva");
      queryClient.invalidateQueries({ queryKey: ["admin-clientes"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar el cliente");
    },
  });

  function handleEliminar(c: Cliente) {
    const confirmado = window.confirm(
      `¿Eliminar definitivamente a "${c.nombre}"? Sus reservas y cotizaciones no se borran, pero quedan sin cliente asociado. Esta acción no se puede deshacer.`,
    );
    if (confirmado) eliminar.mutate(c.id);
  }

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
      {editando && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Editando: {editando.nombre}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={cerrarEdicion}>
              <X className="size-4" />
            </Button>
          </div>
          <form
            onSubmit={handleSubmit((values) => actualizar.mutate({ id: editando.id, values }))}
            className="grid sm:grid-cols-2 gap-4"
          >
            <Input label="Nombre" error={errors.nombre?.message} {...register("nombre")} />
            <Input label="Teléfono" error={errors.telefono?.message} {...register("telefono")} />
            <Input label="RUT" error={errors.rut?.message} {...register("rut")} />
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={actualizar.isPending}>
                {actualizar.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button type="button" variant="ghost" onClick={cerrarEdicion}>
                Cancelar
              </Button>
            </div>
          </form>
          <p className="text-xs text-ink-400 mt-3">
            El email es el usuario de acceso del cliente y no se puede cambiar desde acá.
          </p>
        </Card>
      )}

      {!clientes || clientes.length === 0 ? (
        <div className="rounded-card border border-dashed border-sun-300 bg-sun-50/50 py-12 text-center text-ink-400 text-sm">
          {q ? "No hay clientes que coincidan con la búsqueda." : "Todavía no hay clientes registrados."}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sun-50 text-left text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">RUT</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sun-100">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-sun-50/50">
                    <td className="px-4 py-3 font-medium text-ink-900">{c.nombre}</td>
                    <td className="px-4 py-3 text-ink-600">{c.email}</td>
                    <td className="px-4 py-3 text-ink-600">{c.rut || "—"}</td>
                    <td className="px-4 py-3 text-ink-600">{c.telefono || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          c.activo ? "bg-emerald-500/15 text-emerald-700" : "bg-ink-100 text-ink-500"
                        }`}
                      >
                        {c.activo ? "Activo" : "Deshabilitado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Editar cliente"
                          onClick={() => abrirEdicion(c)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={toggleActivo.isPending}
                          onClick={() => toggleActivo.mutate({ id: c.id, activar: !c.activo })}
                        >
                          {c.activo ? (
                            <>
                              <UserX className="size-4" />
                              Deshabilitar
                            </>
                          ) : (
                            <>
                              <UserCheck className="size-4" />
                              Reactivar
                            </>
                          )}
                        </Button>
                        {esSuperAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:bg-danger/10"
                            disabled={eliminar.isPending}
                            onClick={() => handleEliminar(c)}
                            aria-label="Eliminar cliente definitivamente"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// --- Equipo interno: crear, editar y eliminar cuentas de administrador ---


// Etiquetas legibles por rol. Cajero y Bodega son los roles del módulo de
// supermercado (ver LEEME-INTEGRACION del backend).
const ETIQUETA_ROL: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  CAJERO: "Cajero",
  BODEGA: "Bodega",
};

const schemaAdmin = z
  .object({
    nombre: z.string().min(1, "Requerido").max(150),
    email: z.string().email("Email inválido").max(150),
    password: z.string().max(100).optional(),
    rol: z.enum(["ADMIN", "SUPER_ADMIN", "CAJERO", "BODEGA"]),
    rut: z.string().max(20).optional(),
  })
  .refine((v) => !v.password || v.password.length >= 6, {
    message: "Mínimo 6 caracteres",
    path: ["password"],
  });

type FormAdmin = z.infer<typeof schemaAdmin>;

function TablaEquipo({ q }: { q: string }) {
  const queryClient = useQueryClient();
  const adminProfile = useSessionStore((s) => s.adminProfile);
  const esSuperAdmin = adminProfile?.rol === "SUPER_ADMIN";

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<AdminUser | null>(null);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["admin-usuarios-equipo", q],
    queryFn: () =>
      apiFetch<AdminUser[]>(`/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormAdmin>({ resolver: zodResolver(schemaAdmin) });

  function abrirCreacion() {
    setEditando(null);
    setFormAbierto(true);
    reset({ nombre: "", email: "", password: "", rol: "ADMIN", rut: "" });
  }

  function abrirEdicion(u: AdminUser) {
    setEditando(u);
    setFormAbierto(true);
    reset({ nombre: u.nombre, email: u.email, password: "", rol: u.rol, rut: u.rut ?? "" });
  }

  function cerrarFormulario() {
    setFormAbierto(false);
    setEditando(null);
    reset({ nombre: "", email: "", password: "", rol: "ADMIN", rut: "" });
  }

  const crear = useMutation({
    mutationFn: (values: FormAdmin) =>
      apiFetch<AdminUser>("/users", {
        method: "POST",
        body: JSON.stringify({ ...values, rut: values.rut || undefined }),
      }),
    onSuccess: () => {
      toast.success("Administrador creado");
      cerrarFormulario();
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios-equipo"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear el administrador");
    },
  });

  const actualizar = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FormAdmin }) =>
      apiFetch<AdminUser>(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...values,
          rut: values.rut || undefined,
          // Password vacía = el admin no la quiso cambiar; no se manda.
          password: values.password || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Cuenta actualizada");
      cerrarFormulario();
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios-equipo"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar la cuenta");
    },
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activar }: { id: number; activar: boolean }) =>
      apiFetch<AdminUser>(`/users/${id}/${activar ? "reactivate" : "deactivate"}`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Cuenta actualizada");
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios-equipo"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar la cuenta");
    },
  });

  // Borrado definitivo: noticias.autor_id y movimientos_financieros.usuario_id
  // quedan sin autor/usuario vinculado (onDelete: SET NULL), no se pierden.
  const eliminar = useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Cuenta eliminada de forma definitiva");
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios-equipo"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar la cuenta");
    },
  });

  function onSubmit(values: FormAdmin) {
    if (!editando && !values.password) {
      setError("password", { message: "Requerido" });
      return;
    }
    if (editando) {
      actualizar.mutate({ id: editando.id, values });
    } else {
      crear.mutate(values);
    }
  }

  function handleEliminar(u: AdminUser) {
    const confirmado = window.confirm(
      `¿Eliminar definitivamente la cuenta de "${u.nombre}"? Esta acción no se puede deshacer.`,
    );
    if (confirmado) eliminar.mutate(u.id);
  }

  const ordenados = useMemo(
    () => (usuarios ? [...usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre)) : []),
    [usuarios],
  );

  const guardando = crear.isPending || actualizar.isPending;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-card bg-sun-100/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Crear/editar/eliminar cuentas es solo para SUPER_ADMIN — el
          backend ya lo exige (ver UsersController), acá solo se ocultan
          los controles para que un ADMIN normal no los vea y choque con
          un 403. Ver también (Mi cuenta) para cambiar la propia password. */}
      {esSuperAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => (formAbierto ? cerrarFormulario() : abrirCreacion())}>
            {formAbierto ? <X className="size-4" /> : <UserPlus className="size-4" />}
            {formAbierto ? "Cancelar" : "Nuevo administrador"}
          </Button>
        </div>
      )}

      {esSuperAdmin && formAbierto && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
            {editando ? `Editando: ${editando.nombre}` : "Nuevo administrador"}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 gap-4">
            <Input label="Nombre" error={errors.nombre?.message} {...register("nombre")} />
            <Input
              label="Email"
              type="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label={editando ? "Nueva password (opcional)" : "Password"}
              type="password"
              placeholder={editando ? "Déjalo vacío para no cambiarla" : undefined}
              error={errors.password?.message}
              {...register("password")}
            />
            <Select label="Rol" error={errors.rol?.message} {...register("rol")}>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super admin</option>
              <option value="CAJERO">Cajero</option>
              <option value="BODEGA">Bodega</option>
            </Select>
            <Input label="RUT (opcional)" error={errors.rut?.message} {...register("rut")} />
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear administrador"}
              </Button>
              <Button type="button" variant="ghost" onClick={cerrarFormulario}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {ordenados.length === 0 ? (
        <div className="rounded-card border border-dashed border-sun-300 bg-sun-50/50 py-12 text-center text-ink-400 text-sm">
          {q ? "No hay cuentas que coincidan con la búsqueda." : "No hay cuentas internas cargadas."}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sun-50 text-left text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">RUT</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sun-100">
                {ordenados.map((u) => {
                  const esUnoMismo = u.id === adminProfile?.id;
                  return (
                    <tr key={u.id} className="hover:bg-sun-50/50">
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {u.nombre}
                        {esUnoMismo && <span className="ml-2 text-xs text-ink-400">(tú)</span>}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{u.email}</td>
                      <td className="px-4 py-3 text-ink-600">{u.rut || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-clay-500/15 text-clay-700">
                          {ETIQUETA_ROL[u.rol] ?? u.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            u.activo ? "bg-emerald-500/15 text-emerald-700" : "bg-ink-100 text-ink-500"
                          }`}
                        >
                          {u.activo ? "Activo" : "Deshabilitado"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {esSuperAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Editar cuenta"
                              onClick={() => abrirEdicion(u)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                          {esSuperAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={toggleActivo.isPending}
                              onClick={() => toggleActivo.mutate({ id: u.id, activar: !u.activo })}
                            >
                              {u.activo ? (
                                <>
                                  <UserX className="size-4" />
                                  Deshabilitar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="size-4" />
                                  Reactivar
                                </>
                              )}
                            </Button>
                          )}
                          {esSuperAdmin && !esUnoMismo && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger hover:bg-danger/10"
                              disabled={eliminar.isPending}
                              onClick={() => handleEliminar(u)}
                              aria-label="Eliminar cuenta definitivamente"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
