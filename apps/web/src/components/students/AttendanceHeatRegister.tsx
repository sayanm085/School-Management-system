import { cn } from "@/lib/utils/cn";

const dayLabels = ["M", "T", "W", "T", "F", "S"];

const cellStyles: Record<string, string> = {
  P: "bg-[var(--green-tint)] text-[var(--green-text)]",
  A: "bg-[var(--red-tint)] text-[var(--red-text)]",
  L: "bg-[var(--orange-tint)] text-[var(--orange-strong)]",
  H: "bg-[var(--fill)] text-[var(--ink-tertiary)]",
  "-": "border border-[var(--separator)] bg-transparent text-transparent",
};

const glyphs: Record<string, string> = {
  P: "✓",
  A: "✕",
  L: "!",
  H: "–",
  "-": "·",
};

const labels: Record<string, string> = {
  P: "present",
  A: "absent",
  L: "late",
  H: "holiday",
  "-": "not marked",
};

export function AttendanceHeatRegister({
  rows,
  compact = false,
  showLegend = true,
  hideWeekLabel = false,
}: {
  rows: string[];
  compact?: boolean;
  showLegend?: boolean;
  hideWeekLabel?: boolean;
}) {
  return (
    <div>
      <div
        className="grid grid-cols-[28px_repeat(6,minmax(0,1fr))] gap-1"
        role="group"
        aria-label="Twelve week attendance register"
      >
        <span />
        {dayLabels.map((day, index) => (
          <span
            key={`${day}-${index}`}
            className="text-center font-mono text-[9px] text-[var(--ink-tertiary)]"
          >
            {day}
          </span>
        ))}
        {rows.map((row, weekIndex) => (
          <div key={weekIndex} className="contents">
            <span className="flex items-center font-mono text-[9px] text-[var(--ink-tertiary)]">
              {hideWeekLabel
                ? ""
                : `W${String(weekIndex + 1).padStart(2, "0")}`}
            </span>
            {row.split("").map((char, dayIndex) => (
              <span
                key={`${weekIndex}-${dayIndex}`}
                aria-label={`Week ${weekIndex + 1}, ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayIndex]}: ${labels[char] ?? "not marked"}`}
                className={cn(
                  "flex items-center justify-center rounded-[6px] text-[9px] font-semibold",
                  compact ? "h-5" : "h-6",
                  cellStyles[char] ?? cellStyles["-"],
                )}
              >
                {glyphs[char] ?? ""}
              </span>
            ))}
          </div>
        ))}
      </div>
      {showLegend ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-[var(--ink-secondary)]">
          {[
            ["Present", "bg-[var(--green)]"],
            ["Absent", "bg-[var(--red)]"],
            ["Late", "bg-[var(--orange)]"],
            ["Holiday", "bg-[var(--fill-secondary)]"],
          ].map(([label, color]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
