"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, UserRoundX, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { canManageCover, coverSummary } from "@/lib/domain/timetable";
import { useDemoStore } from "@/lib/data/repository";
import { staffById, TODAY } from "@/lib/data/selectors";
import { formatCopy, useCopy } from "@/lib/i18n/copy";
import type { Substitution } from "@/lib/types";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sub-${Date.now()}`;
}

export function CoverAlert() {
  const copy = useCopy();
  const router = useRouter();
  const pathname = usePathname();
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const locale = useDemoStore((state) => state.locale);
  const commit = useDemoStore((state) => state.commit);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const staff = staffById(db, session?.staffId);
  const allowed = Boolean(session && canManageCover(staff));
  const summary = allowed ? coverSummary(db) : null;
  const next = summary?.nextCover ?? null;
  const suggestion = next?.suggestion ?? null;
  const entryId = next?.entry.id ?? null;
  const onCoverDesk = pathname.startsWith("/console/timetable");

  useEffect(() => {
    if (!allowed || !entryId || onCoverDesk) {
      setVisible(false);
      return;
    }
    if (dismissed.includes(entryId)) return;
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, [allowed, entryId, onCoverDesk, dismissed]);

  if (!allowed || !next) return null;

  const sectionLabel = next.entry.sectionId.replace("-", " ");
  const subjectLabel =
    locale === "bn" ? next.subject?.nameBn : next.subject?.nameEn;
  const absentName =
    locale === "bn" ? next.absentTeacher?.nameBn : next.absentTeacher?.nameEn;
  const substituteName =
    locale === "bn"
      ? suggestion?.staff.nameBn
      : suggestion?.staff.nameEn;
  const substituteFirstName = substituteName?.split(" ")[0];

  function dismiss() {
    setVisible(false);
    if (!entryId) return;
    setDismissed((current) =>
      current.includes(entryId) ? current : [...current, entryId],
    );
  }

  function assign() {
    if (!session || !suggestion || !next) return;
    const substitution: Substitution = {
      id: makeId(),
      date: TODAY,
      day: next.entry.day,
      period: next.entry.period,
      sectionId: next.entry.sectionId,
      subjectId: next.entry.subjectId,
      absentTeacherId: next.entry.teacherId,
      substituteTeacherId: suggestion.staff.id,
      status: "assigned",
      assignedBy: session.staffId,
      reason: `Cover assigned from the live cover alert · ${suggestion.reason}.`,
      createdAt: new Date().toISOString(),
    };
    commit(
      (database) => {
        database.substitutions.push(substitution);
      },
      {
        action: "substitution.assigned",
        entityType: "substitution",
        entityId: substitution.id,
        summary: `${suggestion.staff.nameEn} assigned to cover ${next.entry.sectionId} period ${next.entry.period}`,
      },
    );
    toast.success(copy.cover.coverAssigned, {
      description: formatCopy(copy.cover.coverAssignedBody, {
        teacher: suggestion.staff.nameEn,
        section: next.entry.sectionId.replace("-", " "),
        subject: next.subject?.nameEn ?? "",
        period: next.entry.period,
      }),
    });
    setVisible(false);
  }

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {visible
          ? `${copy.cover.coverAlertTitle}. ${formatCopy(copy.cover.coverAlertBody, {
              teacher: absentName ?? "",
              substitute: substituteName ?? "",
            })}`
          : ""}
      </div>
      <AnimatePresence>
        {visible ? (
          <motion.aside
            key={entryId}
            aria-labelledby="cover-alert-title"
            aria-describedby="cover-alert-body"
            initial={{ y: 18, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 430, damping: 34 }}
            className="fixed bottom-4 left-4 right-4 z-40 overflow-hidden rounded-[22px] border border-[var(--separator)] bg-[var(--surface)] shadow-[0_26px_70px_-24px_rgba(7,31,58,0.5)] sm:bottom-6 sm:left-auto sm:right-6 sm:w-[392px]"
          >
            <div className="flex items-start gap-3 p-4 pb-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--orange-tint)] text-[var(--orange-strong)]">
                <UserRoundX className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--orange-strong)]">
                  {copy.cover.coverAlertTitle} · P{next.entry.period}
                </p>
                <p
                  id="cover-alert-title"
                  className="mt-0.5 text-[14px] font-semibold tracking-[-0.015em]"
                >
                  {sectionLabel} · {subjectLabel}
                </p>
                <p
                  id="cover-alert-body"
                  className="mt-1 text-[11px] leading-relaxed text-[var(--ink-secondary)]"
                >
                  {suggestion
                    ? formatCopy(copy.cover.coverAlertBody, {
                        teacher: absentName ?? "",
                        substitute: substituteName ?? "",
                      })
                    : `${absentName ?? ""} · ${copy.cover.noFreeTeachers}`}
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label={copy.common.close}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--ink-tertiary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--ink)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {suggestion ? (
              <div className="mx-4 flex items-center gap-3 rounded-[14px] border border-[var(--separator)] bg-[var(--fill)] px-3 py-2.5">
                <Avatar
                  name={suggestion.staff.nameEn}
                  src={suggestion.staff.avatar}
                  size={34}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold">
                    {substituteName}
                  </p>
                  <p className="truncate text-[10px] text-[var(--ink-secondary)]">
                    {suggestion.reason}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--green-tint)] px-2 py-0.5 text-[9px] font-semibold text-[var(--green-text)]">
                  {copy.cover.freeNow}
                </span>
              </div>
            ) : null}

            <div className="flex items-center gap-2 p-4 pt-3">
              {suggestion ? (
                <Button size="sm" className="flex-1" onClick={assign}>
                  {formatCopy(copy.cover.assignNow, {
                    name: substituteFirstName ?? suggestion.staff.nameEn,
                  })}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                className={suggestion ? "" : "flex-1"}
                onClick={() => {
                  setVisible(false);
                  router.push("/console/timetable");
                }}
              >
                {copy.cover.review}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
