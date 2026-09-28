"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  nombre: z.string().min(2, "Ingresa tu nombre"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  telefono: z.string().optional(),
  rut: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function RegistroPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(v: Form) {
    const r = await fetch("/api/auth/cliente/registro", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, telefono: v.telefono || undefined, rut: v.rut || undefined }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(Array.isArray(d.message) ? d.message.join(". ") : d.message || "No pudimos crear la cuenta");
      return;
    }
    window.location.href = "/";
  }

  return (
    <AuthShell titulo="Crea tu cuenta" subtitulo="Compra en minutos y sigue el estado de tus pedidos.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nombre completo" autoComplete="name" error={errors.nombre?.message} {...register("nombre")} />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input label="Contraseña" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Teléfono (opcional)" autoComplete="tel" {...register("telefono")} />
          <Input label="RUT (opcional)" {...register("rut")} />
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? "Creando..." : "Crear cuenta"}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-500">¿Ya tienes cuenta? <Link href="/login" className="font-medium text-clay-600 hover:underline">Ingresa</Link></p>
    </AuthShell>
  );
}
