// Tipos del módulo supermercado. Archivo propio (no toca tu `@/types`)
// para evitar choques con tipos de turismo que tengan el mismo nombre.

// ===== productos =====
// tipos) junto a AdminUser y Cliente, que ya tienes.

export type Categoria = {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
};

export type Producto = {
  id: number;
  nombre: string;
  descripcion?: string;
  sku?: string;
  codigoBarra?: string;
  categoria?: Categoria;
  precioVenta: number;
  precioCosto: number;
  stockActual: number;
  stockMinimo: number;
  unidadMedida: string;
  imagenUrl?: string;
  visibleTienda: boolean;
  activo: boolean;
};

// ===== inventario =====
export type ProveedorMercaderia = {
  id: number;
  nombre: string;
  rut?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
};

export type IngresoMercaderiaDetalle = {
  id: number;
  producto: { id: number; nombre: string; unidadMedida: string };
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
};

export type IngresoMercaderia = {
  id: number;
  proveedor?: ProveedorMercaderia;
  numeroDocumento?: string;
  observacion?: string;
  total: number;
  usuarioId: number;
  detalles: IngresoMercaderiaDetalle[];
  creadoEn: string;
};

export type MovimientoStock = {
  id: number;
  tipo: "INGRESO" | "VENTA" | "AJUSTE" | "MERMA" | "ANULACION_VENTA";
  cantidad: number;
  stockResultante: number;
  referencia?: string;
  creadoEn: string;
};

// ===== ventas =====
export type CanalVenta = "ONLINE" | "MOSTRADOR";
export type EstadoVenta = "PENDIENTE_PAGO" | "PAGADA" | "ENTREGADA" | "ANULADA";
export type MedioPago = "EFECTIVO" | "DEBITO" | "CREDITO" | "TRANSFERENCIA" | "WEBPAY";
export type EstadoPago = "CONFIRMADO" | "RECHAZADO" | "REEMBOLSADO";

export type VentaDetalle = {
  id: number;
  producto: { id: number; nombre: string; unidadMedida: string };
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type Venta = {
  id: number;
  canal: CanalVenta;
  estado: EstadoVenta;
  cliente?: { id: number; nombre: string };
  usuarioId?: number;
  subtotal: number;
  total: number;
  direccionEntrega?: string;
  notas?: string;
  detalles: VentaDetalle[];
  creadoEn: string;
};

export type Pago = {
  id: number;
  medio: MedioPago;
  estado: EstadoPago;
  monto: number;
  referencia?: string;
  creadoEn: string;
};

// ===== caja =====
export type EstadoCaja = "ABIERTA" | "CERRADA";

export type Caja = {
  id: number;
  usuarioId: number;
  estado: EstadoCaja;
  montoApertura: number;
  montoCierreDeclarado?: number;
  montoEsperado?: number;
  diferencia?: number;
  observaciones?: string;
  abiertaEn: string;
  cerradaEn?: string;
};

// ===== personal =====
export type Empleado = {
  id: number;
  usuario: { id: number; nombre: string; email: string; rol: string };
  cargo: string;
  sueldoBase: number;
  fechaContratacion: string;
  telefono?: string;
  direccion?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  activo: boolean;
};

export type Turno = {
  id: number;
  empleado: Empleado;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  notas?: string;
};

// ===== reportes (vistas materializadas del backend: /analytics/*) =====
export type ResumenAnalytics = {
  hoy: { ventas: number; total: number };
  mes: { ventas: number; total: number };
  stockBajo: number;
  valorInventario: number;
  actualizadoEn: string | null;
};
export type VentaDiaria = { fecha: string; canal: "ONLINE" | "MOSTRADOR"; ventas: number; total: number; ticketPromedio: number };
export type TopProducto = { productoId: number; nombre: string; unidades: number; ingresos: number; margenEstimado: number; ventas: number };
export type VentaCategoriaMes = { mes: string; categoriaId: number; categoria: string; unidades: number; ingresos: number };
export type StockCategoria = { categoriaId: number; categoria: string; productos: number; unidades: number; valorCosto: number; valorVenta: number; productosStockBajo: number };
