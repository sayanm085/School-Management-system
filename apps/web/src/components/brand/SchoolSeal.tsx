import { cn } from "@/lib/utils/cn";

type SchoolSealProps = {
  size?: number;
  className?: string;
};

export function SchoolSeal({ size = 48, className }: SchoolSealProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="32" r="31" fill="var(--seal-navy)" />
      <circle
        cx="32"
        cy="32"
        r="26.5"
        stroke="var(--seal-gold)"
        strokeWidth="1.4"
      />
      <path
        d="M19 22.5c4.6-1.7 8.9-1.1 13 1.4v17.6c-4.1-2.5-8.4-3.1-13-1.4V22.5Z"
        fill="var(--seal-gold)"
      />
      <path
        d="M45 22.5c-4.6-1.7-8.9-1.1-13 1.4v17.6c4.1-2.5 8.4-3.1 13-1.4V22.5Z"
        fill="var(--seal-gold)"
        opacity="0.82"
      />
      <path
        d="m32 23.9 1.3 2.7 2.9.4-2.1 2.1.5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2.1 2.9-.4L32 23.9Z"
        fill="var(--seal-navy)"
      />
      <path
        d="M16.5 45.5c5.2-3.4 10.4-3.4 15.5 0 5.1-3.4 10.3-3.4 15.5 0"
        stroke="var(--seal-gold)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20.5 50c3.8-2.2 7.7-2.2 11.5 0 3.8-2.2 7.7-2.2 11.5 0"
        stroke="var(--seal-gold)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <text
        x="32"
        y="17"
        textAnchor="middle"
        fill="var(--seal-gold)"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="5.4"
        letterSpacing="0.9"
      >
        NUV · 1948
      </text>
    </svg>
  );
}
