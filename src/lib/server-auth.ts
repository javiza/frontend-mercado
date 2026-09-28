import type { NextRequest, NextResponse } from "next/server";

export type Kind = "admin" | "cliente";
export const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";
const NAMES = { admin: { at: "sm_admin_at", rt: "sm_admin_rt" }, cliente: { at: "sm_cli_at", rt: "sm_cli_rt" } } as const;
const REFRESH_PATH = { admin: "/auth/refresh", cliente: "/clientes-auth/refresh" } as const;
type Tokens = { accessToken: string; refreshToken: string };

const cookieOpts = (maxAge: number) => ({
  httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge,
});

export function setSession(res: NextResponse, kind: Kind, t: Tokens) {
  res.cookies.set(NAMES[kind].at, t.accessToken, cookieOpts(60 * 60 * 12));
  res.cookies.set(NAMES[kind].rt, t.refreshToken, cookieOpts(60 * 60 * 24 * (kind === "admin" ? 7 : 30)));
}
export function clearSession(res: NextResponse, kind: Kind) {
  res.cookies.set(NAMES[kind].at, "", { path: "/", maxAge: 0 });
  res.cookies.set(NAMES[kind].rt, "", { path: "/", maxAge: 0 });
}
export const readToken = (req: NextRequest, kind: Kind) => req.cookies.get(NAMES[kind].at)?.value;

/** Llama al backend con el token de la cookie; si vence, renueva con el refresh token y reintenta una vez. */
export async function callBackend(req: NextRequest, kind: Kind, path: string, init: RequestInit = {}) {
  const send = (token?: string) =>
    fetch(`${BACKEND}${path}`, {
      ...init, cache: "no-store",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

  let res = await send(readToken(req, kind));
  let renewed: Tokens | undefined;
  const rt = req.cookies.get(NAMES[kind].rt)?.value;
  if (res.status === 401 && rt) {
    const r = await fetch(`${BACKEND}${REFRESH_PATH[kind]}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: rt }), cache: "no-store",
    });
    if (r.ok) {
      renewed = (await r.json()) as Tokens;
      res = await send(renewed.accessToken);
    }
  }
  return { res, renewed };
}

export const kindForPath = (p: string): Kind =>
  p.startsWith("clientes-auth") || p.startsWith("ventas/online") || p.startsWith("ventas/mias") ? "cliente" : "admin";
