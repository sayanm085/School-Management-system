"use client";

import { SchoolSeal } from "@/components/brand/SchoolSeal";
import { useDemoStore } from "@/lib/data/repository";
import { cn } from "@/lib/utils/cn";

export function DashboardHero({
  eyebrow,
  title,
  subtitle,
  topNote,
  chips,
  actions,
  aside,
  banner,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  topNote?: string;
  chips?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  banner?: React.ReactNode;
}) {
  const locale = useDemoStore((state) => state.locale);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#071F3A_0%,#0A2E52_48%,#0B3B6F_100%)] text-white shadow-[0_36px_90px_-42px_rgba(7,31,58,0.75)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.32) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(ellipse at 78% 30%, black 0%, transparent 68%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 78% 30%, black 0%, transparent 68%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(201,151,0,0.32),transparent_64%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-24 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(0,102,204,0.38),transparent_66%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-8 top-1/2 hidden h-64 w-64 -translate-y-1/2 rounded-full border border-white/8 xl:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-20 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border border-white/8 xl:block"
      />

      <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:p-9 xl:grid-cols-[minmax(0,1.35fr)_minmax(290px,0.65fr)] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <SchoolSeal size={40} />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Nabagram Uchcha Vidyalaya
              </p>
              <p
                className="font-bengali truncate text-[12px] text-white/78"
                lang="bn"
              >
                নবগ্রাম উচ্চ বিদ্যালয়
              </p>
            </div>
            {topNote ? (
              <span className="ml-1 hidden rounded-full border border-white/14 bg-white/8 px-2.5 py-1 text-[10px] font-semibold text-white/70 sm:inline-flex">
                {topNote}
              </span>
            ) : null}
          </div>

          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E8C66A]">
            {eyebrow}
          </p>
          <h1
            className={cn(
              "mt-2 max-w-[23ch] text-[clamp(30px,4vw,48px)] leading-[1.04] font-semibold tracking-[-0.045em] text-balance",
              locale === "bn" && "font-bengali leading-[1.35] tracking-[-0.02em]",
            )}
          >
            {title}
          </h1>
          <p
            className={cn(
              "mt-3.5 max-w-[58ch] text-[13px] leading-relaxed text-white/68 sm:text-[14px]",
              locale === "bn" && "font-bengali leading-[1.8]",
            )}
          >
            {subtitle}
          </p>

          {chips ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">{chips}</div>
          ) : null}

          {actions ? (
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {actions}
            </div>
          ) : null}
        </div>

        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>

      {banner ? <div className="relative z-10">{banner}</div> : null}
    </section>
  );
}

export function HeroChip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "gold" | "live";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md",
        tone === "gold"
          ? "border-[#E8C66A]/30 bg-[#C99700]/14 text-[#F2D588]"
          : tone === "live"
            ? "border-white/16 bg-white/8 text-white/78"
            : "border-white/12 bg-white/[0.055] text-white/66",
      )}
    >
      {tone === "live" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-[#7BE0A6] shadow-[0_0_0_3px_rgba(123,224,166,0.14)]" />
      ) : null}
      {children}
    </span>
  );
}

export function HeroPanel({
  title,
  badge,
  children,
  footer,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative rounded-[22px] border border-white/12 bg-white/[0.065] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/52">
          {title}
        </p>
        {badge}
      </div>
      <div className="mt-4">{children}</div>
      {footer ? (
        <div className="mt-4 border-t border-white/10 pt-3">{footer}</div>
      ) : null}
    </div>
  );
}

export function HeroStat({
  value,
  label,
  accent = false,
}: {
  value: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-white/8 bg-white/[0.055] px-3 py-2.5">
      <p
        className={cn(
          "tabular text-[20px] leading-none font-semibold tracking-[-0.03em]",
          accent ? "text-[#F2D588]" : "text-white",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] text-white/58">{label}</p>
    </div>
  );
}
