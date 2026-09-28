export type Rol = "SUPER_ADMIN" | "ADMIN" | "CAJERO" | "BODEGA";

export type AdminUser = { id: number; nombre: string; email: string; rol: Rol; rut?: string | null; activo: boolean };

export type Cliente = {
  id: number; nombre: string; email: string; telefono?: string | null; rut?: string | null; activo: boolean;
  telefonosAdicionales?: string[]; correosAdicionales?: string[];
};
