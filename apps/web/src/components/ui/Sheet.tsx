"use client";

import { Drawer } from "vaul";

import { cn } from "@/lib/utils/cn";

export const Sheet = Drawer.Root;
export const SheetTrigger = Drawer.Trigger;
export const SheetClose = Drawer.Close;

export function SheetContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
      <Drawer.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] rounded-t-[var(--radius-xl)] border border-[var(--separator)] bg-[var(--surface)] p-6 pb-[calc(24px+env(safe-area-inset-bottom))] text-[var(--ink)] shadow-[var(--shadow-raised)] outline-none",
          className,
        )}
      >
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-[var(--fill-secondary)]" />
        <Drawer.Title className="text-[20px] font-semibold tracking-[-0.02em]">
          {title}
        </Drawer.Title>
        {description ? (
          <Drawer.Description className="mt-1.5 text-[14px] leading-relaxed text-[var(--ink-secondary)]">
            {description}
          </Drawer.Description>
        ) : null}
        <div className="mt-5">{children}</div>
      </Drawer.Content>
    </Drawer.Portal>
  );
}
