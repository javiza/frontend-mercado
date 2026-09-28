"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({ email: z.string().email("Email inválido"), password: z.string().min(1, "Ingresa tu contraseña") });
type Form = z.infer<typeof schema>;

function LoginForm() {
  const params = useSearchParams();
  const [equipo, setEquipo] = useState(params.get("equipo") === "1");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    const r = await fetch(equipo ? "/api/auth/admin/login" : "/api/auth/cliente/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.message || "No pudimos iniciar sesión");
      return;
    }
    const next = params.get("next");
    window.location.href = next && next.startsWith("/") ? next : equipo ? "/dashboard/admin" : "/";
  }

  return (
    <AuthShell titulo="Bienvenido de vuelta" subtitulo={equipo ? "Acceso para el equipo del supermercado." : "Ingresa para hacer y seguir tus pedidos."}>
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-sun-100 p-1 text-sm font-medium">
        {[["Cliente", false], ["Equipo", true]].map(([l, v]) => (
          <button key={String(l)} type="button" onClick={() => setEquipo(v as boolean)}
            className={`rounded-lg py-2 transition ${equipo === v ? "bg-white text-clay-700 shadow-sm" : "text-ink-600"}`}>{l as string}</button>
        ))}
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input label="Contraseña" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? "Ingresando..." : "Ingresar"}</Button>
      </form>
      {!equipo && <p className="mt-5 text-center text-sm text-ink-500">¿Primera vez? <Link href="/registro" className="font-medium text-clay-600 hover:underline">Crea tu cuenta</Link></p>}
    </AuthShell>
  );
}
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
