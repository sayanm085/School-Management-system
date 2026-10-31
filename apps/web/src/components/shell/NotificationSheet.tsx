"use client";

import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { useDemoStore } from "@/lib/data/repository";
import { useCopy } from "@/lib/i18n/copy";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

export function NotificationSheet() {
  const copy = useCopy();
  const db = useDemoStore((state) => state.db);
  const notices = db.notices.filter(
    (notice) => notice.status === "published",
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={copy.shell.notifications}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-secondary)] transition-colors duration-150 hover:bg-[var(--fill)] hover:text-[var(--ink)]"
        >
          <Bell className="h-[17px] w-[17px]" aria-hidden="true" />
          {notices.length > 0 ? (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--red)] ring-2 ring-[var(--surface)]" />
          ) : null}
        </button>
      </SheetTrigger>
      <SheetContent title={copy.shell.notifications}>
        {notices.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-secondary)]">
            {copy.shell.noticesEmpty}
          </p>
        ) : (
          <ul className="space-y-2">
            {notices.map((notice) => (
              <li
                key={notice.id}
                className="rounded-[14px] border border-[var(--separator)] bg-[var(--surface)] p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] font-semibold">{notice.title}</p>
                  <span className="shrink-0 text-[10px] text-[var(--ink-tertiary)]">
                    {formatShortDate(notice.publishedAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--ink-secondary)]">
                  {notice.bodyEn}
                </p>
                <Badge
                  tone={notice.audience === "all" ? "info" : "neutral"}
                  className="mt-2.5"
                >
                  {notice.audience}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <SheetClose asChild>
          <button
            type="button"
            className={cn(
              "mt-5 w-full rounded-[12px] bg-[var(--fill)] px-3 py-2.5 text-[12px] font-semibold text-[var(--ink-secondary)]",
            )}
          >
            {copy.common.close}
          </button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
