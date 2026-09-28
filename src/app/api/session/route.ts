import { NextRequest, NextResponse } from "next/server";
import { callBackend, setSession, type Kind } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  for (const kind of ["admin", "cliente"] as Kind[]) {
    const { res, renewed } = await callBackend(req, kind, kind === "admin" ? "/auth/me" : "/clientes-auth/me");
    if (res.ok) {
      const perfil = await res.json();
      const out = NextResponse.json(kind === "admin" ? { role: "admin", adminProfile: perfil } : { role: "cliente", clienteProfile: perfil });
      if (renewed) setSession(out, kind, renewed);
      return out;
    }
  }
  return NextResponse.json({ role: null });
}
