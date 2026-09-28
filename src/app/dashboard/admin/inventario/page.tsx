"use client";

import { Fragment, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Truck,
  Building2,
  AlertTriangle,
  Pencil,
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api-client";
import { numeroTexto } from "@/lib/form-helpers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  Producto,
  ProveedorMercaderia,
  IngresoMercaderia,
  MovimientoStock,
} from "@/lib/supermercado-types";

type Tab = "ingresos" | "proveedores" | "stock-bajo";

export default function AdminInventarioPage() {
  const [tab, setTab] = useState<Tab>("ingresos");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Inventario</h1>
        <p className="text-sm text-ink-600">
          Ingresos de mercadería, proveedores y alertas de stock bajo. Cada ingreso suma stock
          automáticamente y queda registrado en el historial de movimientos.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={tab === "ingresos" ? "primary" : "ghost"}
          onClick={() => setTab("ingresos")}
        >
          <Truck className="size-4" />
          Ingresos
        </Button>
        <Button
          size="sm"
          variant={tab === "proveedores" ? "primary" : "ghost"}
          onClick={() => setTab("proveedores")}
        >
          <Building2 className="size-4" />
          Proveedores
        </Button>
        <Button
          size="sm"
          variant={tab === "stock-bajo" ? "primary" : "ghost"}
          onClick={() => setTab("stock-bajo")}
        >
          <AlertTriangle className="size-4" />
          Stock bajo
        </Button>
      </div>

      {tab === "ingresos" && <TablaIngresos />}
      {tab === "proveedores" && <TablaProveedores />}
      {tab === "stock-bajo" && <TablaStockBajo />}
    </div>
  );
}

// --- Ingresos de mercadería ---

const schemaIngreso = z.object({
  proveedorId: z.string().optional(),
  numeroDocumento: z.string().max(50).optional(),
  observacion: z.string().max(1000).optional(),
  detalles: z
    .array(
      z.object({
        productoId: z.string().min(1, "Elige un producto"),
        cantidad: numeroTexto({ min: 1, entero: true, mensaje: "Mínimo 1" }),
        costoUnitario: numeroTexto({ min: 0, mensaje: "Debe ser 0 o mayor" }),
      }),
    )
    .min(1, "Agrega al menos un producto"),
});

type FormIngreso = z.infer<typeof schemaIngreso>;

function TablaIngresos() {
  const queryClient = useQueryClient();
  const [formAbierto, setFormAbierto] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);

  const { data: ingresos, isLoading } = useQuery({
    queryKey: ["admin-ingresos"],
    queryFn: () => apiFetch<IngresoMercaderia[]>("/inventario/ingresos"),
  });

  const { data: proveedores } = useQuery({
    queryKey: ["admin-proveedores-mercaderia-activos"],
    queryFn: () => apiFetch<ProveedorMercaderia[]>("/proveedores-mercaderia"),
  });

  const { data: productos } = useQuery({
    queryKey: ["admin-productos-todos"],
    queryFn: () => apiFetch<Producto[]>("/productos"),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormIngreso>({
    resolver: zodResolver(schemaIngreso),
    defaultValues: {
      proveedorId: "",
      numeroDocumento: "",
      observacion: "",
      detalles: [{ productoId: "", cantidad: "1", costoUnitario: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "detalles" });

  function abrirFormulario() {
    setFormAbierto(true);
    reset({
      proveedorId: "",
      numeroDocumento: "",
      observacion: "",
      detalles: [{ productoId: "", cantidad: "1", costoUnitario: "0" }],
    });
  }

  function cerrarFormulario() {
    setFormAbierto(false);
  }

  const crear = useMutation({
    mutationFn: (values: FormIngreso) =>
      apiFetch<IngresoMercaderia>("/inventario/ingresos", {
        method: "POST",
        body: JSON.stringify({
          proveedorId: values.proveedorId ? Number(values.proveedorId) : undefined,
          numeroDocumento: values.numeroDocumento || undefined,
          observacion: values.observacion || undefined,
          detalles: values.detalles.map((d) => ({
            productoId: Number(d.productoId),
            cantidad: Number(d.cantidad),
            costoUnitario: Number(d.costoUnitario),
          })),
        }),
      }),
    onSuccess: () => {
      toast.success("Ingreso registrado, stock actualizado");
      cerrarFormulario();
      queryClient.invalidateQueries({ queryKey: ["admin-ingresos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-productos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-productos-todos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock-bajo"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo registrar el ingreso");
    },
  });

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
        <Button size="sm" onClick={() => (formAbierto ? cerrarFormulario() : abrirFormulario())}>
          {formAbierto ? <X className="size-4" /> : <Plus className="size-4" />}
          {formAbierto ? "Cancelar" : "Nuevo ingreso"}
        </Button>
      </div>

      {formAbierto && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">Nuevo ingreso</h2>
          <form onSubmit={handleSubmit((values) => crear.mutate(values))} className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <Select label="Proveedor (opcional)" {...register("proveedorId")}>
                <option value="">Sin proveedor</option>
                {(proveedores ?? [])
                  .filter((p) => p.activo)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
              </Select>
              <Input label="N° documento (opcional)" {...register("numeroDocumento")} />
              <Input label="Observación (opcional)" {...register("observacion")} />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-ink-700">Productos</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => append({ productoId: "", cantidad: "1", costoUnitario: "0" })}
                >
                  <Plus className="size-4" />
                  Agregar línea
                </Button>
              </div>

              {errors.detalles?.message && (
                <p className="text-sm text-red-600">{errors.detalles.message}</p>
              )}

              {fields.map((field, index) => (
                <div key={field.id} className="grid sm:grid-cols-[1fr_120px_140px_auto] gap-2 items-start">
                  <Select
                    error={errors.detalles?.[index]?.productoId?.message}
                    {...register(`detalles.${index}.productoId` as const)}
                  >
                    <option value="">Elige un producto...</option>
                    {(productos ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.sku ? `(${p.sku})` : ""}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    placeholder="Cantidad"
                    error={errors.detalles?.[index]?.cantidad?.message}
                    {...register(`detalles.${index}.cantidad` as const)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Costo unitario"
                    error={errors.detalles?.[index]?.costoUnitario?.message}
                    {...register(`detalles.${index}.costoUnitario` as const)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={crear.isPending}>
                {crear.isPending ? "Guardando..." : "Registrar ingreso"}
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
              <th className="px-4 py-3 font-medium" />
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Proveedor</th>
              <th className="px-4 py-3 font-medium">N° documento</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sun-100">
            {(ingresos ?? []).map((ing) => (
              <Fragment key={ing.id}>
                <tr
                  className="cursor-pointer hover:bg-sun-50/60"
                  onClick={() => setExpandido(expandido === ing.id ? null : ing.id)}
                >
                  <td className="px-4 py-3 text-ink-400">
                    {expandido === ing.id ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {new Date(ing.creadoEn).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-3 text-ink-900">{ing.proveedor?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-600">{ing.numeroDocumento ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    ${Number(ing.total).toLocaleString("es-CL")}
                  </td>
                </tr>
                {expandido === ing.id && (
                  <tr key={`${ing.id}-detalle`}>
                    <td colSpan={5} className="bg-sun-50/40 px-4 py-3">
                      <table className="w-full text-xs">
                        <thead className="text-ink-400">
                          <tr>
                            <th className="text-left py-1">Producto</th>
                            <th className="text-left py-1">Cantidad</th>
                            <th className="text-left py-1">Costo unitario</th>
                            <th className="text-left py-1">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ing.detalles.map((d) => (
                            <tr key={d.id}>
                              <td className="py-1 text-ink-700">{d.producto.nombre}</td>
                              <td className="py-1 text-ink-700">
                                {d.cantidad} {d.producto.unidadMedida}
                              </td>
                              <td className="py-1 text-ink-700">
                                ${Number(d.costoUnitario).toLocaleString("es-CL")}
                              </td>
                              <td className="py-1 text-ink-700">
                                ${Number(d.subtotal).toLocaleString("es-CL")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {ing.observacion && (
                        <p className="mt-2 text-ink-500">Obs: {ing.observacion}</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {(ingresos ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-400">
                  Todavía no hay ingresos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// --- Proveedores ---

const schemaProveedor = z.object({
  nombre: z.string().min(1, "Requerido").max(150),
  rut: z.string().max(20).optional(),
  contacto: z.string().max(150).optional(),
  telefono: z.string().max(50).optional(),
  email: z.string().email("Email inválido").max(150).optional().or(z.literal("")),
  direccion: z.string().max(500).optional(),
});

type FormProveedor = z.infer<typeof schemaProveedor>;

function TablaProveedores() {
  const queryClient = useQueryClient();
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<ProveedorMercaderia | null>(null);

  const { data: proveedores, isLoading } = useQuery({
    queryKey: ["admin-proveedores-mercaderia"],
    queryFn: () => apiFetch<ProveedorMercaderia[]>("/proveedores-mercaderia"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormProveedor>({ resolver: zodResolver(schemaProveedor) });

  function abrirCreacion() {
    setEditando(null);
    setFormAbierto(true);
    reset({ nombre: "", rut: "", contacto: "", telefono: "", email: "", direccion: "" });
  }

  function abrirEdicion(p: ProveedorMercaderia) {
    setEditando(p);
    setFormAbierto(true);
    reset({
      nombre: p.nombre,
      rut: p.rut ?? "",
      contacto: p.contacto ?? "",
      telefono: p.telefono ?? "",
      email: p.email ?? "",
      direccion: p.direccion ?? "",
    });
  }

  function cerrarFormulario() {
    setFormAbierto(false);
    setEditando(null);
  }

  function aBody(values: FormProveedor) {
    return {
      ...values,
      rut: values.rut || undefined,
      contacto: values.contacto || undefined,
      telefono: values.telefono || undefined,
      email: values.email || undefined,
      direccion: values.direccion || undefined,
    };
  }

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-proveedores-mercaderia"] });
    queryClient.invalidateQueries({ queryKey: ["admin-proveedores-mercaderia-activos"] });
  };

  const crear = useMutation({
    mutationFn: (values: FormProveedor) =>
      apiFetch<ProveedorMercaderia>("/proveedores-mercaderia", { method: "POST", body: JSON.stringify(aBody(values)) }),
    onSuccess: () => {
      toast.success("Proveedor creado");
      cerrarFormulario();
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear el proveedor");
    },
  });

  const actualizar = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FormProveedor }) =>
      apiFetch<ProveedorMercaderia>(`/proveedores-mercaderia/${id}`, {
        method: "PATCH",
        body: JSON.stringify(aBody(values)),
      }),
    onSuccess: () => {
      toast.success("Proveedor actualizado");
      cerrarFormulario();
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar el proveedor");
    },
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activar }: { id: number; activar: boolean }) =>
      apiFetch<ProveedorMercaderia>(`/proveedores-mercaderia/${id}/${activar ? "reactivate" : "deactivate"}`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Proveedor actualizado");
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar el proveedor");
    },
  });

  const guardando = crear.isPending || actualizar.isPending;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded-card bg-sun-100/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => (formAbierto ? cerrarFormulario() : abrirCreacion())}>
          {formAbierto ? <X className="size-4" /> : <Plus className="size-4" />}
          {formAbierto ? "Cancelar" : "Nuevo proveedor"}
        </Button>
      </div>

      {formAbierto && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
            {editando ? `Editando: ${editando.nombre}` : "Nuevo proveedor"}
          </h2>
          <form
            onSubmit={handleSubmit((values) =>
              editando
                ? actualizar.mutate({ id: editando.id, values })
                : crear.mutate(values),
            )}
            className="grid sm:grid-cols-2 gap-4"
          >
            <Input label="Nombre" error={errors.nombre?.message} {...register("nombre")} />
            <Input label="RUT (opcional)" error={errors.rut?.message} {...register("rut")} />
            <Input
              label="Contacto (opcional)"
              error={errors.contacto?.message}
              {...register("contacto")}
            />
            <Input
              label="Teléfono (opcional)"
              error={errors.telefono?.message}
              {...register("telefono")}
            />
            <Input
              label="Email (opcional)"
              type="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Dirección (opcional)"
              error={errors.direccion?.message}
              {...register("direccion")}
            />
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear proveedor"}
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
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sun-100">
            {(proveedores ?? []).map((p) => (
              <tr key={p.id} className={!p.activo ? "opacity-50" : undefined}>
                <td className="px-4 py-3 font-medium text-ink-900">{p.nombre}</td>
                <td className="px-4 py-3 text-ink-600">{p.contacto ?? "—"}</td>
                <td className="px-4 py-3 text-ink-600">{p.telefono ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.activo ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => abrirEdicion(p)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={toggleActivo.isPending}
                      onClick={() => toggleActivo.mutate({ id: p.id, activar: !p.activo })}
                    >
                      {p.activo ? "Desactivar" : "Reactivar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(proveedores ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-400">
                  No hay proveedores todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// --- Stock bajo ---

const schemaAjuste = z.object({
  delta: numeroTexto({ entero: true, distintoDeCero: true, mensaje: "Debe ser un entero distinto de 0" }),
  motivo: z.string().min(1, "Requerido").max(200),
});

type FormAjuste = z.infer<typeof schemaAjuste>;

function TablaStockBajo() {
  const queryClient = useQueryClient();
  const [ajustando, setAjustando] = useState<Producto | null>(null);

  const { data: productos, isLoading } = useQuery({
    queryKey: ["admin-stock-bajo"],
    queryFn: () => apiFetch<Producto[]>("/productos/stock-bajo"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormAjuste>({ resolver: zodResolver(schemaAjuste) });

  function abrirAjuste(p: Producto) {
    setAjustando(p);
    reset({ delta: "0", motivo: "" });
  }

  const ajustar = useMutation({
    mutationFn: ({ productoId, values }: { productoId: number; values: FormAjuste }) =>
      apiFetch<Producto>(`/inventario/productos/${productoId}/ajuste`, {
        method: "PATCH",
        body: JSON.stringify({ delta: Number(values.delta), motivo: values.motivo }),
      }),
    onSuccess: () => {
      toast.success("Stock ajustado");
      setAjustando(null);
      queryClient.invalidateQueries({ queryKey: ["admin-stock-bajo"] });
      queryClient.invalidateQueries({ queryKey: ["admin-productos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-productos-todos"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo ajustar el stock");
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded-card bg-sun-100/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {ajustando && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Ajustar stock: {ajustando.nombre}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAjustando(null)}>
              <X className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-ink-400 mb-3">
            Usa un número positivo para sumar (ej: conteo físico encontró más) o negativo para
            restar (ej: merma por vencimiento o rotura). Queda registrado en el historial.
          </p>
          <form
            onSubmit={handleSubmit((values) =>
              ajustar.mutate({ productoId: ajustando.id, values }),
            )}
            className="grid sm:grid-cols-[140px_1fr_auto] gap-3 items-end"
          >
            <Input
              label="Ajuste (+/-)"
              type="number"
              error={errors.delta?.message}
              {...register("delta")}
            />
            <Input label="Motivo" error={errors.motivo?.message} {...register("motivo")} />
            <Button type="submit" disabled={ajustar.isPending}>
              {ajustar.isPending ? "Guardando..." : "Confirmar"}
            </Button>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sun-50 text-ink-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Stock actual</th>
              <th className="px-4 py-3 font-medium">Stock mínimo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sun-100">
            {(productos ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-ink-900">{p.nombre}</td>
                <td className="px-4 py-3 text-red-600 font-medium">
                  {p.stockActual} {p.unidadMedida}
                </td>
                <td className="px-4 py-3 text-ink-600">{p.stockMinimo}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={() => abrirAjuste(p)}>
                    Ajustar stock
                  </Button>
                </td>
              </tr>
            ))}
            {(productos ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-400">
                  Todo el stock está por sobre el mínimo. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
