"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { SchoolSeal } from "@/components/brand/SchoolSeal";
import { ProfileMenu } from "@/components/shell/ProfileMenu";
import { NavList } from "@/components/shell/NavList";
import { Badge } from "@/components/ui/Badge";
import { useDemoStore } from "@/lib/data/repository";
import { useCopy } from "@/lib/i18n/copy";

export function Sidebar() {
  const copy = useCopy();
  const session = useDemoStore((state) => state.session);

  if (!session) return null;

  return (
    <aside className="console-sidebar glass fixed bottom-4 left-4 top-4 z-30 hidden w-[248px] flex-col rounded-[24px] border border-[var(--separator)] p-3 shadow-[var(--shadow-sidebar)] lg:flex">
      <Link
        href="/console/dashboard"
        className="flex items-center gap-3 rounded-[14px] px-2 py-2"
      >
        <SchoolSeal size={40} />
        <span>
          <span className="block text-[15px] font-semibold tracking-[-0.02em]">
            Baranda
          </span>
          <span className="block text-[10px] text-[var(--ink-tertiary)]">
            School operations
          </span>
        </span>
      </Link>

      <div className="mt-3 rounded-[13px] bg-[var(--fill)] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bengali text-[12px] font-semibold" lang="bn">
            নবগ্রাম উচ্চ বিদ্যালয়
          </span>
          <CalendarDays
            className="h-3.5 w-3.5 text-[var(--ink-tertiary)]"
            aria-hidden="true"
          />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-[10px] text-[var(--ink-secondary)]">
            {copy.common.academicYear}
          </span>
          <Badge tone="neutral">{copy.common.demoShort}</Badge>
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto pr-0.5">
        <NavList role={session.role} />
      </div>

      <div className="mt-3 border-t border-[var(--separator)] pt-3">
        <ProfileMenu />
      </div>
    </aside>
  );
}
