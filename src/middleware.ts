import { NextRequest, NextResponse } from "next/server";

// Barrera básica: sin cookie de sesión no se entra al panel. La autorización real (roles) la hace el backend.
export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  const kind = p.startsWith("/dashboard/admin") ? "admin" : "cliente";
  const tiene = req.cookies.get(kind === "admin" ? "sm_admin_rt" : "sm_cli_rt");
  if (!tiene) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(p)}${kind === "admin" ? "&equipo=1" : ""}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/admin/:path*", "/dashboard/cliente/:path*"] };
