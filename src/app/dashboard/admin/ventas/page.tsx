"use client";

import { Fragment, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShoppingCart,
  History,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Ban,
  PackageCheck,
} from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api-client";
import { numeroTexto } from "@/lib/form-helpers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Cliente } from "@/types"; // tipo que ya existe en tu app
import type { Producto, Venta, Pago, MedioPago, CanalVenta, EstadoVenta } from "@/lib/supermercado-types";

type Tab = "pos" | "historial";

export default function AdminVentasPage() {
  const [tab, setTab] = useState<Tab>("pos");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Ventas</h1>
        <p className="text-sm text-ink-600">
          Punto de venta de mostrador e historial de ventas (online y mostrador).
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "pos" ? "primary" : "ghost"} onClick={() => setTab("pos")}>
          <ShoppingCart className="size-4" />
          Punto de venta
        </Button>
        <Button
          size="sm"
          variant={tab === "historial" ? "primary" : "ghost"}
          onClick={() => setTab("historial")}
        >
          <History className="size-4" />
          Historial
        </Button>
      </div>

      {tab === "pos" ? <PuntoDeVenta /> : <Historial />}
    </div>
  );
}

// --- Punto de venta (mostrador) ---

type LineaCarrito = { producto: Producto; cantidad: number };

function PuntoDeVenta() {
  const queryClient = useQueryClient();
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [ventaEnCurso, setVentaEnCurso] = useState<Venta | null>(null);

  const { data: productos } = useQuery({
    queryKey: ["pos-productos", busquedaProducto],
    queryFn: () =>
      apiFetch<Producto[]>(
        `/productos?soloVisibles=false${busquedaProducto ? `&q=${encodeURIComponent(busquedaProducto)}` : ""}`,
      ),
  });

  const { data: clientes } = useQuery({
    queryKey: ["pos-clientes", busquedaCliente],
    queryFn: () =>
      apiFetch<Cliente[]>(`/clientes?q=${encodeURIComponent(busquedaCliente)}`),
    enabled: busquedaCliente.trim().length >= 2,
  });

  function agregarAlCarrito(p: Producto) {
    setCarrito((actual) => {
      const existe = actual.find((l) => l.producto.id === p.id);
      if (existe) {
        return actual.map((l) =>
          l.producto.id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l,
        );
      }
      return [...actual, { producto: p, cantidad: 1 }];
    });
  }

  function cambiarCantidad(productoId: number, delta: number) {
    setCarrito((actual) =>
      actual
        .map((l) => (l.producto.id === productoId ? { ...l, cantidad: l.cantidad + delta } : l))
        .filter((l) => l.cantidad > 0),
    );
  }

  function quitarLinea(productoId: number) {
    setCarrito((actual) => actual.filter((l) => l.producto.id !== productoId));
  }

  function limpiarTodo() {
    setCarrito([]);
    setClienteSeleccionado(null);
    setBusquedaCliente("");
    setVentaEnCurso(null);
  }

  const total = useMemo(
    () => carrito.reduce((acc, l) => acc + Number(l.producto.precioVenta) * l.cantidad, 0),
    [carrito],
  );

  const crearVenta = useMutation({
    mutationFn: () =>
      apiFetch<Venta>("/ventas/mostrador", {
        method: "POST",
        body: JSON.stringify({
          clienteId: clienteSeleccionado?.id,
          detalles: carrito.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
        }),
      }),
    onSuccess: (venta) => {
      setVentaEnCurso(venta);
      toast.success("Venta creada, ahora registra el cobro");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear la venta");
    },
  });

  // Ya se creó la venta (PENDIENTE_PAGO) y ahora toca cobrar.
  if (ventaEnCurso) {
    return (
      <CobroVenta
        venta={ventaEnCurso}
        onVentaActualizada={setVentaEnCurso}
        onFinalizar={() => {
          limpiarTodo();
          queryClient.invalidateQueries({ queryKey: ["admin-productos"] });
          queryClient.invalidateQueries({ queryKey: ["admin-ventas"] });
        }}
      />
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <Card className="p-4 flex flex-col gap-3">
        <Input
          placeholder="Buscar producto por nombre, SKU o código de barra..."
          value={busquedaProducto}
          onChange={(e) => setBusquedaProducto(e.target.value)}
        />
        <div className="grid sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
          {(productos ?? [])
            .filter((p) => p.activo)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => agregarAlCarrito(p)}
                className="text-left rounded-card border border-sun-200 p-3 hover:border-sun-400 hover:bg-sun-50/60 transition"
              >
                <div className="font-medium text-ink-900">{p.nombre}</div>
                <div className="text-xs text-ink-400">
                  Stock: {p.stockActual} {p.unidadMedida}
                </div>
                <div className="text-sm font-medium text-ink-700 mt-1">
                  ${Number(p.precioVenta).toLocaleString("es-CL")}
                </div>
              </button>
            ))}
          {(productos ?? []).length === 0 && (
            <p className="text-sm text-ink-400 col-span-2 text-center py-6">
              No se encontraron productos.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-4 flex flex-col gap-3 h-fit sticky top-4">
        <h2 className="font-display text-lg font-semibold text-ink-900">Carrito</h2>

        <div className="relative">
          <Input
            placeholder="Cliente (opcional, buscar por nombre/RUT)"
            value={clienteSeleccionado ? clienteSeleccionado.nombre : busquedaCliente}
            onChange={(e) => {
              setClienteSeleccionado(null);
              setBusquedaCliente(e.target.value);
            }}
          />
          {!clienteSeleccionado && busquedaCliente.trim().length >= 2 && (clientes ?? []).length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-card border border-sun-200 bg-white shadow-md max-h-48 overflow-y-auto">
              {(clientes ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-sun-50"
                  onClick={() => {
                    setClienteSeleccionado(c);
                    setBusquedaCliente("");
                  }}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
          {carrito.map((l) => (
            <div key={l.producto.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1">
                <div className="text-ink-900">{l.producto.nombre}</div>
                <div className="text-xs text-ink-400">
                  ${Number(l.producto.precioVenta).toLocaleString("es-CL")} c/u
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => cambiarCantidad(l.producto.id, -1)}>
                <Minus className="size-3" />
              </Button>
              <span className="w-6 text-center">{l.cantidad}</span>
              <Button size="sm" variant="ghost" onClick={() => cambiarCantidad(l.producto.id, 1)}>
                <Plus className="size-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => quitarLinea(l.producto.id)}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
          {carrito.length === 0 && (
            <p className="text-sm text-ink-400 text-center py-6">Agrega productos del catálogo.</p>
          )}
        </div>

        <div className="border-t border-sun-200 pt-3 flex items-center justify-between">
          <span className="font-medium text-ink-700">Total</span>
          <span className="font-display text-xl font-semibold text-ink-900">
            ${total.toLocaleString("es-CL")}
          </span>
        </div>

        <Button
          disabled={carrito.length === 0 || crearVenta.isPending}
          onClick={() => crearVenta.mutate()}
        >
          {crearVenta.isPending ? "Creando venta..." : "Continuar al cobro"}
        </Button>
      </Card>
    </div>
  );
}

// --- Cobro: registra uno o más pagos hasta completar el total ---

const schemaPago = z.object({
  medio: z.enum(["EFECTIVO", "DEBITO", "CREDITO", "TRANSFERENCIA"]),
  monto: numeroTexto({ min: 1, mensaje: "Debe ser mayor a 0" }),
  referencia: z.string().max(150).optional(),
});

type FormPago = z.infer<typeof schemaPago>;

function CobroVenta({
  venta,
  onVentaActualizada,
  onFinalizar,
}: {
  venta: Venta;
  onVentaActualizada: (v: Venta) => void;
  onFinalizar: () => void;
}) {
  const { data: pagos } = useQuery({
    queryKey: ["venta-pagos", venta.id],
    queryFn: () => apiFetch<Pago[]>(`/ventas/${venta.id}/pagos`),
  });

  const pagado = (pagos ?? [])
    .filter((p) => p.estado === "CONFIRMADO")
    .reduce((acc, p) => acc + Number(p.monto), 0);
  const restante = Number(venta.total) - pagado;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormPago>({
    resolver: zodResolver(schemaPago),
    defaultValues: { medio: "EFECTIVO", monto: String(restante), referencia: "" },
  });

  const registrarPago = useMutation({
    mutationFn: (values: FormPago) =>
      apiFetch<Pago>(`/ventas/${venta.id}/pagos`, {
        method: "POST",
        body: JSON.stringify({ ...values, monto: Number(values.monto), referencia: values.referencia || undefined }),
      }),
    onSuccess: async () => {
      toast.success("Pago registrado");
      const actualizada = await apiFetch<Venta>(`/ventas/${venta.id}`);
      onVentaActualizada(actualizada);
      reset({ medio: "EFECTIVO", monto: String(Number(actualizada.total) - pagado), referencia: "" });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo registrar el pago");
    },
  });

  const yaPagada = venta.estado === "PAGADA" || venta.estado === "ENTREGADA";

  return (
    <Card className="p-6 max-w-xl mx-auto flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink-900">
          Venta #{venta.id} — {yaPagada ? "Pagada" : "Cobro"}
        </h2>
        <p className="text-sm text-ink-600">
          Total: <span className="font-medium">${Number(venta.total).toLocaleString("es-CL")}</span>
          {!yaPagada && (
            <> · Restante: <span className="font-medium text-red-600">${restante.toLocaleString("es-CL")}</span></>
          )}
        </p>
      </div>

      {(pagos ?? []).length > 0 && (
        <div className="flex flex-col gap-1 text-sm">
          {(pagos ?? []).map((p) => (
            <div key={p.id} className="flex justify-between text-ink-600">
              <span>{p.medio}</span>
              <span>${Number(p.monto).toLocaleString("es-CL")}</span>
            </div>
          ))}
        </div>
      )}

      {yaPagada ? (
        <div className="flex flex-col items-center gap-3 py-4 text-emerald-600">
          <CheckCircle2 className="size-10" />
          <p className="font-medium">Venta pagada completa</p>
          <Button onClick={onFinalizar}>Nueva venta</Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((values) => registrarPago.mutate(values))}
          className="grid sm:grid-cols-2 gap-3"
        >
          <Select label="Medio de pago" error={errors.medio?.message} {...register("medio")}>
            <option value="EFECTIVO">Efectivo</option>
            <option value="DEBITO">Débito</option>
            <option value="CREDITO">Crédito</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </Select>
          <Input
            label="Monto"
            type="number"
            step="0.01"
            error={errors.monto?.message}
            {...register("monto")}
          />
          <Input
            label="Referencia (opcional)"
            className="sm:col-span-2"
            placeholder="N° de voucher/operación"
            error={errors.referencia?.message}
            {...register("referencia")}
          />
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={registrarPago.isPending}>
              {registrarPago.isPending ? "Registrando..." : "Registrar pago"}
            </Button>
            <Button type="button" variant="ghost" onClick={onFinalizar}>
              Cancelar venta / volver
            </Button>
          </div>
          <p className="sm:col-span-2 text-xs text-ink-400">
            El pago en efectivo exige tener una caja abierta (módulo Caja).
          </p>
        </form>
      )}
    </Card>
  );
}

// --- Historial ---

function Historial() {
  const queryClient = useQueryClient();
  const [expandido, setExpandido] = useState<number | null>(null);
  const [filtroCanal, setFiltroCanal] = useState<CanalVenta | "">("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoVenta | "">("");

  const { data: ventas, isLoading } = useQuery({
    queryKey: ["admin-ventas", filtroCanal, filtroEstado],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtroCanal) params.set("canal", filtroCanal);
      if (filtroEstado) params.set("estado", filtroEstado);
      return apiFetch<Venta[]>(`/ventas${params.toString() ? `?${params}` : ""}`);
    },
  });

  const anular = useMutation({
    mutationFn: (id: number) => apiFetch<Venta>(`/ventas/${id}/anular`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Venta anulada, stock devuelto");
      queryClient.invalidateQueries({ queryKey: ["admin-ventas"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo anular la venta");
    },
  });

  const entregar = useMutation({
    mutationFn: (id: number) => apiFetch<Venta>(`/ventas/${id}/entregar`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Venta marcada como entregada");
      queryClient.invalidateQueries({ queryKey: ["admin-ventas"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "No se pudo marcar como entregada");
    },
  });

  function handleAnular(v: Venta) {
    const confirmado = window.confirm(
      `¿Anular la venta #${v.id}? El stock de sus productos se devuelve automáticamente.`,
    );
    if (confirmado) anular.mutate(v.id);
  }

  const badgeEstado: Record<EstadoVenta, string> = {
    PENDIENTE_PAGO: "bg-amber-100 text-amber-700",
    PAGADA: "bg-emerald-100 text-emerald-700",
    ENTREGADA: "bg-sky-100 text-sky-700",
    ANULADA: "bg-ink-100 text-ink-500",
  };

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
      <div className="flex flex-wrap gap-3">
        <Select value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value as CanalVenta | "")}>
          <option value="">Todos los canales</option>
          <option value="ONLINE">Online</option>
          <option value="MOSTRADOR">Mostrador</option>
        </Select>
        <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoVenta | "")}>
          <option value="">Todos los estados</option>
          <option value="PENDIENTE_PAGO">Pendiente de pago</option>
          <option value="PAGADA">Pagada</option>
          <option value="ENTREGADA">Entregada</option>
          <option value="ANULADA">Anulada</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sun-50 text-ink-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium" />
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Canal</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sun-100">
            {(ventas ?? []).map((v) => (
              <Fragment key={v.id}>
                <tr className="cursor-pointer hover:bg-sun-50/60" onClick={() => setExpandido(expandido === v.id ? null : v.id)}>
                  <td className="px-4 py-3 text-ink-400">
                    {expandido === v.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </td>
                  <td className="px-4 py-3 text-ink-700">#{v.id}</td>
                  <td className="px-4 py-3 text-ink-700">
                    {new Date(v.creadoEn).toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{v.canal}</td>
                  <td className="px-4 py-3 text-ink-900">{v.cliente?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    ${Number(v.total).toLocaleString("es-CL")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${badgeEstado[v.estado]}`}>
                      {v.estado.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {v.canal === "ONLINE" && v.estado === "PAGADA" && (
                        <Button size="sm" variant="ghost" onClick={() => entregar.mutate(v.id)}>
                          <PackageCheck className="size-4" />
                        </Button>
                      )}
                      {(v.estado === "PENDIENTE_PAGO" || v.estado === "PAGADA") && (
                        <Button size="sm" variant="ghost" onClick={() => handleAnular(v)}>
                          <Ban className="size-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandido === v.id && (
                  <tr>
                    <td colSpan={8} className="bg-sun-50/40 px-4 py-3">
                      <table className="w-full text-xs">
                        <tbody>
                          {v.detalles.map((d) => (
                            <tr key={d.id}>
                              <td className="py-1 text-ink-700">{d.producto.nombre}</td>
                              <td className="py-1 text-ink-700">
                                {d.cantidad} {d.producto.unidadMedida}
                              </td>
                              <td className="py-1 text-ink-700">
                                ${Number(d.precioUnitario).toLocaleString("es-CL")}
                              </td>
                              <td className="py-1 text-ink-700">
                                ${Number(d.subtotal).toLocaleString("es-CL")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {v.direccionEntrega && (
                        <p className="mt-2 text-ink-500">Entrega: {v.direccionEntrega}</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {(ventas ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-ink-400">
                  No hay ventas con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
