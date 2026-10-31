"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "rounded-[16px] border border-[var(--separator)] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-raised)]",
          title: "text-[13px] font-semibold",
          description: "text-[12px] text-[var(--ink-secondary)]",
          actionButton: "bg-[var(--blue-strong)] text-white",
        },
      }}
    />
  );
}
