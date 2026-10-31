"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { navForRole } from "@/components/shell/nav";
import { can, canAccessSection } from "@/lib/auth/permissions";
import { useDemoStore } from "@/lib/data/repository";
import { useCopy } from "@/lib/i18n/copy";
import { cn } from "@/lib/utils/cn";

export function CommandPalette({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const copy = useCopy();
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!session) return null;

  const staff = db.staff.find((person) => person.id === session.staffId) ?? null;
  const pages = navForRole(session.role);
  const students = can(session.role, "students.view")
    ? db.students
        .filter((student) => canAccessSection(staff, student.sectionId))
        .slice(0, 60)
    : [];

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={copy.shell.commandTitle}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-[var(--separator)] bg-[var(--surface)] text-[var(--ink-secondary)] transition-colors duration-150 hover:bg-[var(--fill)]",
          compact
            ? "h-9 w-9 justify-center"
            : "h-9 min-w-[230px] justify-start px-3",
        )}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        {compact ? null : (
          <>
            <span className="flex-1 text-left text-[12px]">
              {copy.common.searchShort}
            </span>
            <kbd className="rounded-[5px] border border-[var(--separator)] bg-[var(--fill)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--ink-tertiary)]">
              ⌘K
            </kbd>
          </>
        )}
      </button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-[20px] border border-[var(--separator)] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-raised)] outline-none"
          >
            <DialogPrimitive.Title className="sr-only">
              {copy.shell.commandTitle}
            </DialogPrimitive.Title>
            <Command label={copy.shell.commandTitle} loop>
              <div className="flex items-center gap-2 border-b border-[var(--separator)] px-4">
                <Search
                  className="h-4 w-4 text-[var(--ink-tertiary)]"
                  aria-hidden="true"
                />
                <Command.Input
                  autoFocus
                  placeholder={copy.shell.commandPlaceholder}
                  className="h-14 flex-1 bg-transparent text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-tertiary)]"
                />
                <kbd className="rounded-[5px] border border-[var(--separator)] bg-[var(--fill)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--ink-tertiary)]">
                  Esc
                </kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-[13px] text-[var(--ink-secondary)]">
                  {copy.shell.noResults}
                </Command.Empty>
                <Command.Group
                  heading={copy.shell.pages}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[var(--ink-tertiary)]"
                >
                  {pages.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.href}
                        value={`${copy.nav[item.labelKey]} ${item.href}`}
                        onSelect={() => go(item.href)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] data-[selected=true]:bg-[var(--fill)]"
                      >
                        <Icon
                          className="h-4 w-4 text-[var(--ink-tertiary)]"
                          aria-hidden="true"
                        />
                        {copy.nav[item.labelKey]}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
                {students.length > 0 ? (
                  <Command.Group
                    heading={copy.shell.students}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[var(--ink-tertiary)]"
                  >
                    {students.map((student) => (
                      <Command.Item
                        key={student.id}
                        value={`${student.nameEn} ${student.nameBn} ${student.admissionNo}`}
                        onSelect={() => go(`/console/students/${student.id}`)}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-[13px] data-[selected=true]:bg-[var(--fill)]"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="font-bengali text-[14px] font-medium" lang="bn">
                            {student.nameBn}
                          </span>
                          <span className="text-[12px] text-[var(--ink-secondary)]">
                            {student.nameEn}
                          </span>
                        </span>
                        <span className="text-[10px] text-[var(--ink-tertiary)]">
                          {student.sectionId} · Roll {student.rollNo}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
              </Command.List>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
