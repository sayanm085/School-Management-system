"use client";

import { ArrowRight, LockKeyhole, School, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SchoolSeal } from "@/components/brand/SchoolSeal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { useDemoStore } from "@/lib/data/repository";
import { useCopy } from "@/lib/i18n/copy";

export default function LoginPage() {
  const router = useRouter();
  const copy = useCopy();
  const school = useDemoStore((state) => state.db.school);
  const session = useDemoStore((state) => state.session);
  const hydrated = useDemoStore((state) => state.hydrated);
  const login = useDemoStore((state) => state.login);
  const locale = useDemoStore((state) => state.locale);
  const setLocale = useDemoStore((state) => state.setLocale);

  const [schoolCode, setSchoolCode] = useState(school.code);
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && session) router.replace("/console/dashboard");
  }, [hydrated, session, router]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (schoolCode.trim().toUpperCase() !== school.code.toUpperCase()) {
      setError(`Use the demo school code ${school.code}.`);
      return;
    }

    const result = login(employeeId, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/console/dashboard");
  }

  function pickDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmployeeId(account.employeeId);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  return (
    <main className="min-h-dvh bg-[var(--canvas)] p-4 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100dvh-32px)] max-w-6xl overflow-hidden rounded-[28px] border border-[var(--separator)] bg-[var(--surface)] shadow-[var(--shadow-raised)] lg:grid-cols-[1.08fr_0.92fr]">
        <section
          className="relative flex flex-col justify-between overflow-hidden bg-[#0B3B6F] p-6 text-white sm:p-10 lg:p-12"
          style={
            {
              "--seal-navy": "#0B3B6F",
              "--seal-gold": "#C99700",
            } as React.CSSProperties
          }
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#C99700]/10 blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <SchoolSeal size={52} />
              <div>
                <p className="font-bengali text-[18px] leading-[1.5] font-semibold" lang="bn">
                  নবগ্রাম উচ্চ বিদ্যালয়
                </p>
                <p className="text-[11px] text-white/80">{school.nameEn}</p>
              </div>
            </div>

            <div className="mt-6 max-w-lg sm:mt-20">
              <p className="text-[12px] font-semibold text-[#E8C66A]">
                {copy.login.eyebrow}
              </p>
              <h1 className="mt-3 text-[clamp(34px,5vw,58px)] leading-[1.02] font-semibold tracking-[-0.045em]">
                {copy.login.title}
              </h1>
              <p className="mt-5 hidden max-w-md text-[14px] leading-relaxed text-white/82 sm:block">
                {copy.login.body}
              </p>
            </div>
          </div>

          <div className="relative mt-8 hidden sm:block">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["480", "Students"],
                ["24", "Teaching staff"],
                ["12", "Sections"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[16px] border border-white/12 bg-white/6 p-3.5"
                >
                  <p className="tabular text-[24px] font-semibold tracking-[-0.02em]">
                    {value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/78">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/78">
              <span className="rounded-full border border-white/14 px-2.5 py-1">
                Established 1948
              </span>
              <span className="rounded-full border border-white/14 px-2.5 py-1">
                Purba Bardhaman
              </span>
              <span className="rounded-full border border-[#C99700]/35 px-2.5 py-1 text-[#E8C66A]">
                Demo only
              </span>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-[420px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone="info">{copy.common.demo}</Badge>
                <h2 className="mt-4 text-[30px] font-semibold tracking-[-0.03em]">
                  {copy.login.signInTitle}
                </h2>
                <p className="mt-1.5 text-[13px] text-[var(--ink-secondary)]">
                  {copy.login.signInSubtitle}
                </p>
              </div>
              <SegmentedControl
                value={locale}
                onChange={setLocale}
                ariaLabel={copy.shell.language}
                options={[
                  { value: "en", label: "EN" },
                  { value: "bn", label: "বাংলা" },
                ]}
              />
            </div>

            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              <Field label={copy.login.schoolCode}>
                {(props) => (
                  <Input
                    {...props}
                    value={schoolCode}
                    onChange={(event) => setSchoolCode(event.target.value)}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                )}
              </Field>

              <Field label={copy.login.employeeId}>
                {(props) => (
                  <div className="relative">
                    <UserRound
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-tertiary)]"
                      aria-hidden="true"
                    />
                    <Input
                      {...props}
                      value={employeeId}
                      onChange={(event) => setEmployeeId(event.target.value)}
                      placeholder="HM-001"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      className="pl-10"
                      required
                    />
                  </div>
                )}
              </Field>

              <Field label={copy.login.password}>
                {(props) => (
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-tertiary)]"
                      aria-hidden="true"
                    />
                    <Input
                      {...props}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="demo1234"
                      className="pl-10"
                      required
                    />
                  </div>
                )}
              </Field>

              {error ? (
                <p
                  role="alert"
                  className="rounded-[12px] bg-[var(--red-tint)] px-3 py-2.5 text-[12px] font-medium text-[var(--red-text)]"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full">
                {copy.login.submit}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>

            <div className="mt-8">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <h3 className="text-[12px] font-semibold text-[var(--ink-secondary)]">
                  {copy.login.demoAccounts}
                </h3>
                <span className="text-[11px] text-[var(--ink-tertiary)]">
                  {copy.login.demoHint}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.employeeId}
                    type="button"
                    onClick={() => pickDemo(account)}
                    className="rounded-[14px] border border-[var(--separator)] bg-[var(--surface)] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--fill)] active:scale-[0.99]"
                  >
                    <span className="block text-[12px] font-semibold">
                      {account.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-secondary)]">
                      {account.nameEn} · {account.employeeId}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-start gap-2.5 rounded-[14px] bg-[var(--fill)] p-3.5 text-[11px] leading-relaxed text-[var(--ink-secondary)]">
              <School className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{copy.login.note}</p>
            </div>

            <p className="font-bengali mt-6 text-center text-[11px] text-[var(--ink-tertiary)]" lang="bn">
              {copy.login.footer}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
