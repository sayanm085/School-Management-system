"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { NavList } from "@/components/shell/NavList";
import { SchoolSeal } from "@/components/brand/SchoolSeal";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { useDemoStore } from "@/lib/data/repository";
import { useCopy } from "@/lib/i18n/copy";

export function MobileNav({
  role,
}: {
  role: "headmaster" | "teacher" | "clerk" | "management" | "support";
}) {
  const [open, setOpen] = useState(false);
  const copy = useCopy();
  const school = useDemoStore((state) => state.db.school);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={copy.shell.menu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent title={copy.shell.menu}>
        <div className="mb-5 flex items-center gap-3">
          <SchoolSeal size={38} />
          <div>
            <p className="font-bengali text-[15px] font-semibold" lang="bn">
              {school.nameBn}
            </p>
            <p className="text-[10px] text-[var(--ink-tertiary)]">
              {copy.common.academicYear} · {copy.common.demo}
            </p>
          </div>
        </div>
        <NavList role={role} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
