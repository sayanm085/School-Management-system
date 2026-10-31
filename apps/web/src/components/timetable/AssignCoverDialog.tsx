"use client";

import { Hand, ShieldCheck, UserRoundX } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/Dialog";
import { useDemoStore } from "@/lib/data/repository";
import type { UncoveredPeriod } from "@/lib/domain/timetable";
import { formatCopy, useCopy } from "@/lib/i18n/copy";
import { cn } from "@/lib/utils/cn";

export function AssignCoverDialog({
  open,
  onOpenChange,
  item,
  mode,
  claimTeacherId,
  preselectedTeacherId,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: UncoveredPeriod | null;
  mode: "assign" | "claim";
  claimTeacherId?: string;
  preselectedTeacherId?: string | null;
  onConfirm: (teacherId: string) => void;
}) {
  const copy = useCopy();
  const locale = useDemoStore((state) => state.locale);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setSelected(
      mode === "claim"
        ? (claimTeacherId ?? null)
        : (preselectedTeacherId ??
            item.suggestion?.staff.id ??
            item.freeTeachers[0]?.staff.id ??
            null),
    );
  }, [open, item, mode, claimTeacherId, preselectedTeacherId]);

  if (!item) return null;

  const sectionLabel = item.entry.sectionId.replace("-", " ");
  const subjectName =
    locale === "bn" ? item.subject?.nameBn : item.subject?.nameEn;
  const absentName =
    locale === "bn" ? item.absentTeacher?.nameBn : item.absentTeacher?.nameEn;
  const selectedTeacher = item.freeTeachers.find(
    (candidate) => candidate.staff.id === selected,
  );
  const canConfirm = mode === "claim" ? Boolean(claimTeacherId) : Boolean(selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-32px)] max-w-lg overflow-y-auto">
        <div className="flex items-start gap-3 pr-8">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              mode === "claim"
                ? "bg-[var(--green-tint)] text-[var(--green-text)]"
                : "bg-[var(--orange-tint)] text-[var(--orange-strong)]",
            )}
          >
            {mode === "claim" ? (
              <Hand className="h-5 w-5" aria-hidden="true" />
            ) : (
              <UserRoundX className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle>
              {mode === "claim"
                ? copy.cover.takingThisClass
                : copy.cover.assignCover}
            </DialogTitle>
            <DialogDescription>
              {sectionLabel} · {subjectName} · P{item.entry.period} ·{" "}
              {item.entry.start}–{item.entry.end} · {copy.cover.room}{" "}
              {item.entry.room}
            </DialogDescription>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-[13px] bg-[var(--fill)] px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
              {copy.cover.regularTeacher}
            </p>
            <p className="mt-1 truncate text-[12px] font-semibold">
              {absentName}
            </p>
            <p className="text-[10px] text-[var(--orange-strong)]">
              {copy.cover.fromLeave}
            </p>
          </div>
          <div className="rounded-[13px] bg-[var(--fill)] px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
              {copy.cover.class}
            </p>
            <p className="mt-1 truncate text-[12px] font-semibold">
              {sectionLabel}
            </p>
            <p className="text-[10px] text-[var(--ink-secondary)]">
              {item.section?.room ?? item.entry.room} · {copy.cover.period}{" "}
              {item.entry.period}
            </p>
          </div>
        </div>

        {mode === "assign" ? (
          <div className="mt-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold">
                {copy.cover.chooseTeacher}
              </p>
              <span className="text-[10px] text-[var(--ink-tertiary)]">
                {formatCopy(copy.cover.periodCount, {
                  count: item.freeTeachers.length,
                })}
              </span>
            </div>

            {item.freeTeachers.length === 0 ? (
              <p className="mt-3 rounded-[13px] bg-[var(--orange-tint)] px-3 py-3 text-[12px] font-medium text-[var(--orange-strong)]">
                {copy.cover.noFreeTeachers}
              </p>
            ) : (
              <div
                role="radiogroup"
                aria-label={copy.cover.chooseTeacher}
                tabIndex={0}
                className="mt-3 max-h-[286px] space-y-1.5 overflow-y-auto pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
              >
                {item.freeTeachers.map((candidate) => {
                  const active = candidate.staff.id === selected;
                  const suggested =
                    item.suggestion?.staff.id === candidate.staff.id;
                  const candidateName =
                    locale === "bn"
                      ? candidate.staff.nameBn
                      : candidate.staff.nameEn;
                  return (
                    <button
                      key={candidate.staff.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSelected(candidate.staff.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]",
                        active
                          ? "border-[var(--blue)] bg-[var(--blue-tint)]"
                          : "border-[var(--separator)] bg-[var(--surface)] hover:bg-[var(--fill)]",
                      )}
                    >
                      <Avatar
                        name={candidate.staff.nameEn}
                        src={candidate.staff.avatar}
                        size={36}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[12px] font-semibold">
                            {candidateName}
                          </span>
                          {suggested ? (
                            <Badge tone="success" className="shrink-0 px-1.5 py-0.5 text-[8px]">
                              {copy.cover.suggested}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-[var(--ink-secondary)]">
                          {suggested && item.suggestion
                            ? item.suggestion.reason
                            : copy.cover.freeThisPeriod}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[9px] text-[var(--ink-tertiary)]">
                          {formatCopy(copy.cover.load, {
                            count: candidate.load,
                          })}
                        </span>
                        <span
                          className={cn(
                            "mt-1 ml-auto flex h-4 w-4 items-center justify-center rounded-full border",
                            active
                              ? "border-[var(--blue)] bg-[var(--blue)]"
                              : "border-[var(--ink-tertiary)]/40",
                          )}
                          aria-hidden="true"
                        >
                          {active ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-[var(--ink-tertiary)]">
              {copy.cover.freeTeacherHint}
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-[15px] bg-[var(--green-tint)] px-4 py-3.5">
            <p className="text-[12px] font-semibold text-[var(--green-text)]">
              {copy.cover.teacherFreeNow}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--green-text)]">
              {copy.cover.claimConfirmBody}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--separator)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-1.5 text-[9px] leading-relaxed text-[var(--ink-tertiary)]">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            {copy.cover.auditNote}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {copy.common.cancel}
            </Button>
            <Button
              variant={mode === "claim" ? "success" : "primary"}
              disabled={!canConfirm}
              onClick={() => {
                if (mode === "claim" && claimTeacherId) {
                  onConfirm(claimTeacherId);
                  return;
                }
                if (selected) onConfirm(selected);
              }}
            >
              {mode === "claim"
                ? copy.cover.claimCover
                : selectedTeacher
                  ? formatCopy(copy.cover.assignNow, {
                      name:
                        locale === "bn"
                          ? selectedTeacher.staff.nameBn.split(" ")[0]
                          : selectedTeacher.staff.nameEn.split(" ")[0],
                    })
                  : copy.cover.confirmAssign}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
