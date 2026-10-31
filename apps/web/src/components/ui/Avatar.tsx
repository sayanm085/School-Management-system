import { cn } from "@/lib/utils/cn";

const backgrounds = [
  "bg-[#EAF3FF] text-[#0066CC]",
  "bg-[#E8F8ED] text-[#166B32]",
  "bg-[#FFF3E0] text-[#8A3E00]",
  "bg-[#FFEBE9] text-[#A50D06]",
  "bg-[#F2EFFF] text-[#5B3DB8]",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const index =
    name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    backgrounds.length;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--separator)] text-[13px] font-semibold",
        backgroundClassName(backgrounds[index]),
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}

function backgroundClassName(value: string) {
  return value;
}
