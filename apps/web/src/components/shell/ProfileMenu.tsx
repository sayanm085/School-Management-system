"use client";

import { LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { roleLabel } from "@/lib/auth/demo-accounts";
import { isAssistantHeadmaster } from "@/lib/domain/timetable";
import { useDemoStore } from "@/lib/data/repository";
import { useCopy } from "@/lib/i18n/copy";

export function ProfileMenu({
  variant = "row",
}: {
  variant?: "row" | "avatar";
}) {
  const router = useRouter();
  const copy = useCopy();
  const session = useDemoStore((state) => state.session);
  const db = useDemoStore((state) => state.db);
  const locale = useDemoStore((state) => state.locale);
  const theme = useDemoStore((state) => state.theme);
  const setLocale = useDemoStore((state) => state.setLocale);
  const setTheme = useDemoStore((state) => state.setTheme);
  const logout = useDemoStore((state) => state.logout);
  const resetDemo = useDemoStore((state) => state.resetDemo);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!session) return null;

  const staff = db.staff.find((person) => person.id === session.staffId);
  const roleName =
    staff && isAssistantHeadmaster(staff)
      ? copy.dashboard.roleAssistant
      : roleLabel(session.role);

  const trigger =
    variant === "avatar" ? (
      <button
        type="button"
        aria-label={copy.shell.profile}
        className="rounded-full transition-transform duration-[160ms] ease-[var(--ease-out)] active:scale-[0.96]"
      >
        <Avatar
          name={session.nameEn}
          src={session.avatar}
          size={34}
          className="border-[var(--separator)]"
        />
      </button>
    ) : (
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors duration-150 hover:bg-[var(--fill)]"
      >
        <Avatar name={session.nameEn} src={session.avatar} size={34} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">
            {session.nameEn}
          </span>
          <span className="block truncate text-[11px] text-[var(--ink-secondary)]">
            {staff?.designation ?? roleLabel(session.role)} · {session.employeeId}
          </span>
        </span>
      </button>
    );

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent title={copy.shell.profile}>
        <div className="flex items-center gap-3">
          <Avatar name={session.nameEn} src={session.avatar} size={52} />
          <div>
            <p className="font-bengali text-[17px] font-semibold" lang="bn">
              {session.nameBn}
            </p>
            <p className="text-[12px] text-[var(--ink-secondary)]">
              {session.nameEn} · {session.employeeId}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="info">{roleName}</Badge>
              <Badge>{copy.common.demo}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <p className="mb-2 text-[12px] font-semibold">
              {copy.shell.language}
            </p>
            <SegmentedControl
              value={locale}
              onChange={setLocale}
              ariaLabel={copy.shell.language}
              options={[
                { value: "en", label: "English" },
                { value: "bn", label: "বাংলা" },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-[12px] font-semibold">
              {copy.shell.theme}
            </p>
            <SegmentedControl
              value={theme}
              onChange={setTheme}
              ariaLabel={copy.shell.theme}
              options={[
                { value: "light", label: copy.shell.light },
                { value: "dark", label: copy.shell.dark },
                { value: "system", label: copy.shell.system },
              ]}
            />
          </div>
        </div>

        <div className="mt-7 space-y-2">
          {confirmReset ? (
            <div className="rounded-[14px] bg-[var(--red-tint)] p-3.5">
              <p className="text-[12px] font-medium leading-relaxed text-[var(--red-text)]">
                {copy.shell.resetNote}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    resetDemo();
                    router.push("/login");
                  }}
                >
                  {copy.shell.resetDemo}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmReset(false)}
                >
                  {copy.common.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {copy.shell.resetDemo}
            </Button>
          )}
          <SheetClose asChild>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {copy.shell.logout}
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button variant="ghost" className="w-full justify-start">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {copy.common.close}
            </Button>
          </SheetClose>
        </div>

        <p className="mt-5 text-[10px] leading-relaxed text-[var(--ink-tertiary)]">
          Demo data is stored only in this browser. No real student or staff
          information is used.
        </p>
      </SheetContent>
    </Sheet>
  );
}
