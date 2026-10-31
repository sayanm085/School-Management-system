import { cn } from "@/lib/utils/cn";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-[var(--fill)]",
        className,
      )}
    />
  );
}
