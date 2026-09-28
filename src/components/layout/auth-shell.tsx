import { ShoppingBasket } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuthShell({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-md place-items-center px-4 py-10">
      <Card className="animate-rise w-full p-7 sm:p-9">
        <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-clay-400 to-clay-600 text-white shadow-sm">
          <ShoppingBasket className="size-6" />
        </span>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <p className="mb-6 mt-1 text-sm text-ink-500">{subtitulo}</p>
        {children}
      </Card>
    </div>
  );
}
