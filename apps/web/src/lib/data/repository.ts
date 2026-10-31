"use client";

import { compressToUTF16, decompressFromUTF16 } from "lz-string";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { seed } from "@/lib/data/seed";
import type { AuditEvent, Database, Role } from "@/lib/types";

export type Session = {
  staffId: string;
  employeeId: string;
  role: Role;
  nameBn: string;
  nameEn: string;
  avatar: string;
};

export type AuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
};

type DemoState = {
  db: Database;
  session: Session | null;
  locale: "en" | "bn";
  theme: "light" | "dark" | "system";
  hydrated: boolean;
  login: (
    employeeId: string,
    password: string,
  ) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  resetDemo: () => void;
  setLocale: (locale: "en" | "bn") => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setHydrated: (hydrated: boolean) => void;
  commit: (mutator: (db: Database) => void, audit?: AuditInput) => void;
};

const DEMO_PASSWORD = "demo1234";
const ALLOWED_ROLES: Role[] = [
  "headmaster",
  "teacher",
  "clerk",
  "management",
];

const compressedStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(name);
    if (!stored) return null;
    try {
      return decompressFromUTF16(stored);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(name, compressToUTF16(value));
  },
  removeItem: (name: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
  },
}));

function auditId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      db: seed,
      session: null,
      locale: "en",
      theme: "system",
      hydrated: false,

      login: (employeeId, password) => {
        const staff = get().db.staff.find(
          (person) =>
            person.employeeId.toLowerCase() === employeeId.trim().toLowerCase(),
        );

        if (!staff || !ALLOWED_ROLES.includes(staff.role)) {
          return { ok: false, error: "No staff account matches that employee ID." };
        }

        if (password !== DEMO_PASSWORD) {
          return { ok: false, error: "The demo password is incorrect." };
        }

        set({
          session: {
            staffId: staff.id,
            employeeId: staff.employeeId,
            role: staff.role,
            nameBn: staff.nameBn,
            nameEn: staff.nameEn,
            avatar: staff.avatar,
          },
        });

        return { ok: true };
      },

      logout: () => set({ session: null }),

      resetDemo: () => {
        useDemoStore.persist.clearStorage();
        set({
          db: structuredClone(seed),
          session: null,
          locale: "en",
          theme: "system",
        });
      },

      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setHydrated: (hydrated) => set({ hydrated }),

      commit: (mutator, audit) =>
        set((state) => {
          const next = structuredClone(state.db);
          mutator(next);

          if (audit) {
            const actorId = state.session?.staffId ?? "system";
            const event: AuditEvent = {
              id: auditId(),
              actorId,
              action: audit.action,
              entityType: audit.entityType,
              entityId: audit.entityId,
              summary: audit.summary,
              createdAt: new Date().toISOString(),
            };
            next.audit.unshift(event);
          }

          return { db: next };
        }),
    }),
    {
      name: "baranda-demo-v2",
      version: 2,
      storage: compressedStorage,
      skipHydration: true,
      partialize: (state) => ({
        db: state.db,
        session: state.session,
        locale: state.locale,
        theme: state.theme,
      }),
    },
  ),
);

export function useSession() {
  return useDemoStore((state) => state.session);
}

export function useDatabase() {
  return useDemoStore((state) => state.db);
}

export function commit(
  mutator: (db: Database) => void,
  audit?: AuditInput,
) {
  useDemoStore.getState().commit(mutator, audit);
}
