import { NextRequest, NextResponse } from "next/server";
import { callBackend, clearSession } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  await callBackend(req, "cliente", "/clientes-auth/logout", { method: "POST" }).catch(() => null);
  const res = NextResponse.json({ ok: true });
  clearSession(res, "cliente");
  return res;
}
