export const clp = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(n ?? 0));
export const fechaCorta = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
