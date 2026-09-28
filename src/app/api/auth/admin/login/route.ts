import { NextRequest, NextResponse } from "next/server";
import { BACKEND, clearSession, setSession } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const r = await fetch(`${BACKEND}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: await req.text(), cache: "no-store",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json(data, { status: r.status });
  const res = NextResponse.json({ user: data.user });
  setSession(res, "admin", data);
  clearSession(res, "cliente");
  return res;
}
