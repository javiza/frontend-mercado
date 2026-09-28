import { create } from "zustand";
import type { AdminUser, Cliente } from "@/types";

type State = {
  role: "admin" | "cliente" | null;
  adminProfile: AdminUser | null;
  clienteProfile: Cliente | null;
  loaded: boolean;
  load: () => Promise<void>;
};

export const useSessionStore = create<State>((set) => ({
  role: null, adminProfile: null, clienteProfile: null, loaded: false,
  load: async () => {
    try {
      const r = await fetch("/api/session", { cache: "no-store" });
      const d = await r.json();
      set({ role: d.role ?? null, adminProfile: d.adminProfile ?? null, clienteProfile: d.clienteProfile ?? null, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
