import Link from "next/link";

import { SchoolSeal } from "@/components/brand/SchoolSeal";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[var(--canvas)] px-5 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-40px)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SchoolSeal size={44} />
            <div>
              <p className="text-[17px] font-semibold tracking-[-0.02em]">
                Baranda
              </p>
              <p className="text-[12px] text-[var(--ink-secondary)]">
                School operations · Demo
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--separator)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--ink-secondary)]">
            Civic Modern · v1
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16 sm:py-24">
          <p className="mb-5 flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-[var(--blue-text)] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
            Nabagram Uchcha Vidyalaya · Demo
          </p>
          <h1 className="max-w-4xl text-[clamp(40px,8vw,78px)] leading-[0.98] font-semibold tracking-[-0.045em] text-[var(--ink)]">
            School operations,
            <br />
            kept well.
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--ink-secondary)]">
            A calm, modern console for admissions, attendance, examinations,
            fees, salary and school insight. Built for a West Bengal
            government-sponsored school. Demo data only.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/design"
              className="inline-flex h-11 items-center rounded-[14px] bg-[var(--blue-strong)] px-5 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(0,113,227,0.24)] transition-transform duration-150 active:scale-[0.97]"
            >
              Open design system
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-[14px] border border-[var(--separator)] bg-[var(--surface)] px-5 text-[14px] font-semibold text-[var(--ink)] transition-transform duration-150 active:scale-[0.97]"
            >
              Sign in to demo
            </Link>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--separator)] pt-5 text-[11px] text-[var(--ink-tertiary)]">
          <span>
            Baranda is an independent school-level demo. It is not connected to
            Banglar Shiksha.
          </span>
          <span className="font-bengali" lang="bn">
            নবগ্রাম উচ্চ বিদ্যালয় (ডেমো)
          </span>
        </footer>
      </div>
    </main>
  );
}
