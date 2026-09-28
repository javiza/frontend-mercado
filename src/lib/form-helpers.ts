import { z } from "zod";

type OpcionesNumero = {
  min?: number;
  entero?: boolean;
  distintoDeCero?: boolean;
  mensaje?: string;
};

/**
 * Campo numérico de formulario. Un <input type="number"> entrega TEXTO, así
 * que el schema lo valida como texto y quien arma el body lo convierte con
 * Number(). Se evita a propósito z.coerce.number(): en zod 4 su tipo de
 * entrada pasó a ser `unknown`, lo que rompe el tipado de react-hook-form +
 * zodResolver y hace fallar `next build` en la verificación de tipos.
 * Así funciona igual con zod 3 y zod 4.
 */
export function numeroTexto({ min, entero = false, distintoDeCero = false, mensaje }: OpcionesNumero = {}) {
  return z.string().refine((v) => {
    if (v.trim() === "") return false;
    const n = Number(v);
    if (!Number.isFinite(n)) return false;
    if (entero && !Number.isInteger(n)) return false;
    if (min !== undefined && n < min) return false;
    if (distintoDeCero && n === 0) return false;
    return true;
  }, mensaje ?? "Ingresa un número válido");
}
