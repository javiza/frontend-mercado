import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { CartDrawer } from "@/components/tienda/cart-drawer";

export const metadata: Metadata = {
  title: { default: "FreshMarket · Tu supermercado online", template: "%s · FreshMarket" },
  description: "Compra tu supermercado desde casa: productos frescos, precios claros y retiro o despacho.",
};
export const viewport: Viewport = { themeColor: "#f4f8fc" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <Providers>
          <Navbar />
          <main>{children}</main>
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
