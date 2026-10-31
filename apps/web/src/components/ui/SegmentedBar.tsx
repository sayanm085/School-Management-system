import { cn } from "@/lib/utils/cn";

export function SegmentedBar({
  filled,
  total,
  tone = "blue",
  className,
}: {
  filled: number;
  total: number;
  tone?: "blue" | "green" | "orange" | "red";
  className?: string;
}) {
  const color = {
    blue: "bg-[var(--blue)]",
    green: "bg-[var(--green)]",
    orange: "bg-[var(--orange)]",
    red: "bg-[var(--red)]",
  }[tone];

  return (
    <div
      className={cn("flex gap-1", className)}
      role="img"
      aria-label={`${filled} of ${total}`}
    >
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 w-4 rounded-full",
            index < filled ? color : "bg-[var(--fill-secondary)]",
          )}
        />
      ))}
    </div>
  );
}
