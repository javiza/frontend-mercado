export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Llama al backend a través del proxy de Next (/api/backend/...), que agrega el token desde una cookie httpOnly. */
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const m = (data as { message?: string | string[] } | null)?.message;
    throw new ApiError(res.status, Array.isArray(m) ? m.join(". ") : m || "Ocurrió un error inesperado");
  }
  return data as T;
}
function safeJson(t: string) { try { return JSON.parse(t); } catch { return null; } }
