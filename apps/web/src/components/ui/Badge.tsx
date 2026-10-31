import { cn } from "@/lib/utils/cn";

const tones = {
  neutral: "bg-[var(--fill)] text-[var(--ink-secondary)]",
  info: "bg-[var(--blue-tint)] text-[var(--blue-text)]",
  success: "bg-[var(--green-tint)] text-[var(--green-text)]",
  danger: "bg-[var(--red-tint)] text-[var(--red-text)]",
  warning: "bg-[var(--orange-tint)] text-[var(--orange-strong)]",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[-0.01em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({
  tone = "neutral",
  className,
  children,
  dot = true,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}) {
  const dotColor = {
    neutral: "bg-[var(--ink-tertiary)]",
    info: "bg-[var(--blue)]",
    success: "bg-[var(--green)]",
    danger: "bg-[var(--red)]",
    warning: "bg-[var(--orange)]",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} /> : null}
      {children}
    </span>
  );
}
