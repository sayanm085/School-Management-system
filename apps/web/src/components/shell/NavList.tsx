"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navForRole } from "@/components/shell/nav";
import { useDemoStore } from "@/lib/data/repository";
import { copy } from "@/lib/i18n/copy";
import { cn } from "@/lib/utils/cn";

export function NavList({
  role,
  onNavigate,
}: {
  role: "headmaster" | "teacher" | "clerk" | "management" | "support";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const locale = useDemoStore((state) => state.locale);
  const labels = copy[locale].nav;

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Console navigation">
      {navForRole(role).map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-[11px] px-3 text-[13px] font-semibold transition-colors duration-150",
              active
                ? "bg-[var(--blue-tint)] text-[var(--blue-text)]"
                : "text-[var(--ink-secondary)] hover:bg-[var(--fill)] hover:text-[var(--ink)]",
            )}
          >
            <Icon
              className={cn(
                "h-[17px] w-[17px]",
                active ? "text-[var(--blue)]" : "text-[var(--ink-tertiary)]",
              )}
              aria-hidden="true"
            />
            {labels[item.labelKey]}
          </Link>
        );
      })}
    </nav>
  );
}

