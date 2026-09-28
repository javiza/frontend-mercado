import { NextRequest, NextResponse } from "next/server";
import { callBackend, kindForPath, setSession } from "@/lib/server-auth";

async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const { res, renewed } = await callBackend(req, kindForPath(joined), `/${joined}${req.nextUrl.search}`, {
    method: req.method,
    body: hasBody ? await req.text() : undefined,
  });
  const body = res.status === 204 ? null : await res.text();
  const out = new NextResponse(body, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
  if (renewed) setSession(out, kindForPath(joined), renewed);
  return out;
}
export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
