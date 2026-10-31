import { cn } from "@/lib/utils/cn";

export function ProgressRing({
  value,
  size = 52,
  stroke = 5,
  tone = "green",
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "green" | "blue" | "orange" | "red";
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);
  const color = {
    green: "var(--green)",
    blue: "var(--blue)",
    orange: "var(--orange)",
    red: "var(--red)",
  }[tone];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.round(clamped)} percent`}
      className={cn("shrink-0", className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--fill-secondary)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
