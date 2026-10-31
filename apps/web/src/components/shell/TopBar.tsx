"use client";

import { usePathname } from "next/navigation";

import { CommandPalette } from "@/components/shell/CommandPalette";
import { MobileNav } from "@/components/shell/MobileNav";
import { NotificationSheet } from "@/components/shell/NotificationSheet";
import { ProfileMenu } from "@/components/shell/ProfileMenu";
import { navForRole } from "@/components/shell/nav";
import { useDemoStore } from "@/lib/data/repository";
import { useCopy } from "@/lib/i18n/copy";

export function TopBar() {
  const pathname = usePathname();
  const copy = useCopy();
  const session = useDemoStore((state) => state.session);

  if (!session) return null;

  const current =
    navForRole(session.role).find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? navForRole(session.role)[0];

  return (
    <header className="console-topbar sticky top-0 z-20 px-4 pt-3 sm:px-6 lg:px-8">
      <div className="glass-strong mx-auto flex max-w-[1440px] items-center gap-2 rounded-[18px] border border-[var(--separator)] px-2.5 py-2 shadow-[var(--shadow-card)] sm:gap-2.5 sm:px-3">
        <div className="lg:hidden">
          <MobileNav role={session.role} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            Baranda · Demo
          </p>
          <p className="truncate text-[12px] font-semibold sm:text-[13px]">
            {current ? copy.nav[current.labelKey] : "Baranda"}
          </p>
        </div>
        <div className="hidden sm:block">
          <CommandPalette />
        </div>
        <div className="sm:hidden">
          <CommandPalette compact />
        </div>
        <span className="hidden h-5 w-px bg-[var(--separator)] md:block" />
        <span className="hidden items-center gap-1.5 text-[10px] font-medium text-[var(--ink-secondary)] md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
          Sat 31 Oct 2026
        </span>
        <NotificationSheet />
        <ProfileMenu variant="avatar" />
      </div>
    </header>
  );
}
