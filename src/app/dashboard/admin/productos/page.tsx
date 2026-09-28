"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Package,
  Tags,
  Pencil,
  Trash2,
  Undo2,
  X,
  Plus,
  AlertTriangle,
} from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api-client";
import { numeroTexto } from "@/lib/form-helpers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Producto, Categoria } from "@/lib/supermercado-types";

type Tab = "productos" | "categorias";

export default function AdminProductosPage() {
  const [tab, setTab] = useState<Tab>("productos");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");

  // Mismo debounce que usa la pantalla de Usuarios, para no disparar una
  // consulta por cada tecla mientras se escribe la búsqueda.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">
          Productos
        </h1>
        <p className="text-sm text-ink-600">
          Catálogo de la tienda: precios, stock y categorías. El stock se ajusta solo desde
          Inventario (ingresos de mercadería) o al confirmarse una venta.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "productos" ? "primary" : "ghost"}
            onClick={() => setTab("productos")}
          >
            <Package className="size-4" />
            Productos
          </Button>
          <Button
            size="sm"
            variant={tab === "categorias" ? "primary" : "ghost"}
            onClick={() => setTab("categorias")}
          >
            <Tags className="size-4" />
            Categorías
          </Button>
        </div>

        {tab === "productos" && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-300" />
            <Input
              placeholder="Buscar por nombre, SKU o código de barra..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>

      {tab === "productos" ? (
        <TablaProductos q={busquedaDebounced} />
      ) : (
        <TablaCategorias />
      )}
    </div>
  );
}

// --- Categorías ---

const schemaCategoria = z.object({
  nombre: z.string().min(1, "Requerido").max(100),
  descripcion: z.string().max(500).optional(),
});

type FormCategoria = z.infer<typeof schemaCategoria>;

function TablaCategorias() {
  const queryClient = useQueryClient();
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);

  const { data: categorias, isLoading } = useQuery({
    queryKey: ["admin-categorias"],
    queryFn: () => apiFetch<Categoria[]>("/categorias"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormCategoria>({ resolver: zodResolver(schemaCategoria) });

  function abrirCreacion() {
    setEditando(null);
    setFormAbierto(true);
    reset({ nombre: "", descripcion: "" });
  }

  function abrirEdicion(c: Categoria) {
    setEditando(c);
    setFormAbierto(true);
    reset({ nombre: c.nombre, descripcion: c.descripcion ?? "" });
  }

  function cerrarFormulario() {
    setFormAbierto(false);
    setEditando(null);
    reset({ nombre: "", descripcion: "" });
  }

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-categorias"] });
    // El selector de categoría en el form de Productos usa esta misma
    // lista, así que también se refresca.
    queryClient.invalidateQueries({ queryKey: ["admin-productos"] });
  };

  const crear = useMutation({
    mutationFn: (values: FormCategoria) =>
      apiFetch<Categoria>("/categorias", {
        method: "POST",
        body: JSON.stringify({ ...values, descripcion: values.descripcion || undefined }),
      }),
    onSuccess: () => {
      toast.success("Categoría creada");
      cerrarFormulario();
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear la categoría");
    },
  });

  const actualizar = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FormCategoria }) =>
      apiFetch<Categoria>(`/categorias/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...values, descripcion: values.descripcion || undefined }),
      }),
    onSuccess: () => {
      toast.success("Categoría actualizada");
      cerrarFormulario();
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar la categoría");
    },
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activar }: { id: number; activar: boolean }) =>
      apiFetch<Categoria>(`/categorias/${id}/${activar ? "reactivate" : "deactivate"}`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Categoría actualizada");
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar la categoría");
    },
  });

  const guardando = crear.isPending || actualizar.isPending;

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
      <div className="flex justify-end">
        <Button size="sm" onClick={() => (formAbierto ? cerrarFormulario() : abrirCreacion())}>
          {formAbierto ? <X className="size-4" /> : <Plus className="size-4" />}
          {formAbierto ? "Cancelar" : "Nueva categoría"}
        </Button>
      </div>

      {formAbierto && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
            {editando ? `Editando: ${editando.nombre}` : "Nueva categoría"}
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
            <Input
              label="Descripción (opcional)"
              error={errors.descripcion?.message}
              {...register("descripcion")}
            />
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear categoría"}
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
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sun-100">
            {(categorias ?? []).map((c) => (
              <tr key={c.id} className={!c.activo ? "opacity-50" : undefined}>
                <td className="px-4 py-3 font-medium text-ink-900">{c.nombre}</td>
                <td className="px-4 py-3 text-ink-600">{c.descripcion ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.activo ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {c.activo ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => abrirEdicion(c)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={toggleActivo.isPending}
                      onClick={() => toggleActivo.mutate({ id: c.id, activar: !c.activo })}
                    >
                      {c.activo ? "Desactivar" : "Reactivar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(categorias ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-400">
                  No hay categorías todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// --- Productos ---

const schemaProducto = z.object({
  nombre: z.string().min(1, "Requerido").max(150),
  descripcion: z.string().max(1000).optional(),
  sku: z.string().max(50).optional(),
  codigoBarra: z.string().max(50).optional(),
  categoriaId: z.string().optional(), // el <select> siempre da string; se convierte antes de mandar
  precioVenta: numeroTexto({ min: 0, mensaje: "Debe ser 0 o mayor" }),
  precioCosto: numeroTexto({ min: 0, mensaje: "Debe ser 0 o mayor" }),
  stockMinimo: numeroTexto({ min: 0, entero: true, mensaje: "Debe ser un entero de 0 o más" }),
  unidadMedida: z.string().max(20).optional(),
  visibleTienda: z.boolean().optional(),
});

type FormProducto = z.infer<typeof schemaProducto>;

function TablaProductos({ q }: { q: string }) {
  const queryClient = useQueryClient();
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  const { data: productos, isLoading } = useQuery({
    queryKey: ["admin-productos", q],
    queryFn: () =>
      apiFetch<Producto[]>(`/productos${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });

  const { data: categorias } = useQuery({
    queryKey: ["admin-categorias"],
    queryFn: () => apiFetch<Categoria[]>("/categorias?soloActivas=true"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormProducto>({ resolver: zodResolver(schemaProducto) });

  function abrirCreacion() {
    setEditando(null);
    setFormAbierto(true);
    reset({
      nombre: "",
      descripcion: "",
      sku: "",
      codigoBarra: "",
      categoriaId: "",
      precioVenta: "0",
      precioCosto: "0",
      stockMinimo: "0",
      unidadMedida: "UNIDAD",
      visibleTienda: true,
    });
  }

  function abrirEdicion(p: Producto) {
    setEditando(p);
    setFormAbierto(true);
    reset({
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      sku: p.sku ?? "",
      codigoBarra: p.codigoBarra ?? "",
      categoriaId: p.categoria ? String(p.categoria.id) : "",
      precioVenta: String(p.precioVenta),
      precioCosto: String(p.precioCosto),
      stockMinimo: String(p.stockMinimo),
      unidadMedida: p.unidadMedida,
      visibleTienda: p.visibleTienda,
    });
  }

  function cerrarFormulario() {
    setFormAbierto(false);
    setEditando(null);
    reset();
  }

  // stockActual queda afuera a propósito: no se edita a mano acá, se ajusta
  // desde Inventario (ingreso de mercadería o ajuste de stock) para que el
  // historial de movimientos siempre cuadre con el número final.
  function aBody(values: FormProducto) {
    return {
      ...values,
      precioVenta: Number(values.precioVenta),
      precioCosto: Number(values.precioCosto),
      stockMinimo: Number(values.stockMinimo),
      descripcion: values.descripcion || undefined,
      sku: values.sku || undefined,
      codigoBarra: values.codigoBarra || undefined,
      categoriaId: values.categoriaId ? Number(values.categoriaId) : undefined,
      unidadMedida: values.unidadMedida || undefined,
    };
  }

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["admin-productos"] });

  const crear = useMutation({
    mutationFn: (values: FormProducto) =>
      apiFetch<Producto>("/productos", { method: "POST", body: JSON.stringify(aBody(values)) }),
    onSuccess: () => {
      toast.success("Producto creado");
      cerrarFormulario();
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear el producto");
    },
  });

  const actualizar = useMutation({
    mutationFn: ({ id, values }: { id: number; values: FormProducto }) =>
      apiFetch<Producto>(`/productos/${id}`, {
        method: "PATCH",
        body: JSON.stringify(aBody(values)),
      }),
    onSuccess: () => {
      toast.success("Producto actualizado");
      cerrarFormulario();
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar el producto");
    },
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activar }: { id: number; activar: boolean }) =>
      apiFetch<Producto>(`/productos/${id}/${activar ? "reactivate" : "deactivate"}`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Producto actualizado");
      invalidar();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo actualizar el producto");
    },
  });

  function handleDesactivar(p: Producto) {
    const confirmado = window.confirm(
      `¿Desactivar "${p.nombre}"? Deja de venderse online y en mostrador hasta que lo reactives.`,
    );
    if (confirmado) toggleActivo.mutate({ id: p.id, activar: false });
  }

  const guardando = crear.isPending || actualizar.isPending;

  const ordenados = useMemo(
    () => (productos ? [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre)) : []),
    [productos],
  );

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
          {formAbierto ? "Cancelar" : "Nuevo producto"}
        </Button>
      </div>

      {formAbierto && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
            {editando ? `Editando: ${editando.nombre}` : "Nuevo producto"}
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
            <Select label="Categoría" error={errors.categoriaId?.message} {...register("categoriaId")}>
              <option value="">Sin categoría</option>
              {(categorias ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            <Input
              label="Descripción (opcional)"
              error={errors.descripcion?.message}
              {...register("descripcion")}
            />
            <Input label="SKU (opcional)" error={errors.sku?.message} {...register("sku")} />
            <Input
              label="Código de barra (opcional)"
              error={errors.codigoBarra?.message}
              {...register("codigoBarra")}
            />
            <Input
              label="Unidad de medida"
              placeholder="UNIDAD, KG, LITRO..."
              error={errors.unidadMedida?.message}
              {...register("unidadMedida")}
            />
            <Input
              label="Precio de venta"
              type="number"
              step="0.01"
              error={errors.precioVenta?.message}
              {...register("precioVenta")}
            />
            <Input
              label="Precio de costo"
              type="number"
              step="0.01"
              error={errors.precioCosto?.message}
              {...register("precioCosto")}
            />
            <Input
              label="Stock mínimo (alerta)"
              type="number"
              error={errors.stockMinimo?.message}
              {...register("stockMinimo")}
            />
            {!editando && (
              <p className="sm:col-span-2 text-xs text-ink-400">
                El stock inicial de un producto nuevo se carga después desde Inventario →
                Ingreso de mercadería, no acá.
              </p>
            )}
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-ink-600">
              <input type="checkbox" {...register("visibleTienda")} />
              Visible en la tienda online
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear producto"}
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
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sun-100">
            {ordenados.map((p) => {
              const stockBajo = p.stockActual <= p.stockMinimo;
              return (
                <tr key={p.id} className={!p.activo ? "opacity-50" : undefined}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{p.nombre}</div>
                    {p.sku && <div className="text-xs text-ink-400">SKU: {p.sku}</div>}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{p.categoria?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-900">
                    ${Number(p.precioVenta).toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className={stockBajo ? "text-red-600 font-medium" : "text-ink-700"}>
                        {p.stockActual} {p.unidadMedida}
                      </span>
                      {stockBajo && (
                        <AlertTriangle className="size-4 text-red-500" aria-label="Stock bajo" />
                      )}
                    </div>
                  </td>
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
                      {p.activo ? (
                        <Button size="sm" variant="ghost" onClick={() => handleDesactivar(p)}>
                          <Trash2 className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActivo.mutate({ id: p.id, activar: true })}
                        >
                          <Undo2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {ordenados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-400">
                  No se encontraron productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
