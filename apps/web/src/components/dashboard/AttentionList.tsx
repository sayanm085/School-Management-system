"use client";

import {
  ChevronRight,
  CircleCheck,
  IndianRupee,
  UserRoundX,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useDatabase } from "@/lib/data/repository";
import { needsAttention } from "@/lib/data/selectors";
import { cn } from "@/lib/utils/cn";

const icons = {
  attendance: UserRoundX,
  fees: IndianRupee,
  salary: Wallet,
};

const tones = {
  danger: "bg-[var(--red-tint)] text-[var(--red-text)]",
  warning: "bg-[var(--orange-tint)] text-[var(--orange-strong)]",
  info: "bg-[var(--blue-tint)] text-[var(--blue-text)]",
};

export function AttentionList() {
  const db = useDatabase();
  const items = needsAttention(db);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <Badge tone="neutral">{items.length}</Badge>
      </CardHeader>
      <CardContent className="flex-1 p-0 pt-2">
        {items.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-8 text-[13px] text-[var(--ink-secondary)]">
            <CircleCheck className="h-4 w-4 text-[var(--green)]" />
            Nothing needs attention today.
          </div>
        ) : (
          <ul>
            {items.map((item) => {
              const Icon = icons[item.kind];
              return (
                <li key={item.kind}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-[var(--fill)]"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        tones[item.tone],
                      )}
                    >
                      <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-secondary)]">
                        {item.detail}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-[var(--ink-tertiary)]"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
