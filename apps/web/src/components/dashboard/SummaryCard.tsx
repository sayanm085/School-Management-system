import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export function SummaryCard({
  title,
  value,
  subtitle,
  visual,
  className,
}: {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  visual?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <div className="flex h-full flex-col justify-between p-5">
        <p className="text-[11px] font-semibold text-[var(--ink-secondary)]">
          {title}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="tabular whitespace-nowrap text-[clamp(22px,2.3vw,32px)] leading-none font-semibold tracking-[-0.035em]">
            {value}
          </p>
          {visual ? <div className="shrink-0">{visual}</div> : null}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-secondary)]">
          {subtitle}
        </p>
      </div>
    </Card>
  );
}
