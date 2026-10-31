import { forwardRef, useId } from "react";

import { cn } from "@/lib/utils/cn";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-[var(--radius-md)] border border-[var(--separator)] bg-[var(--surface)] px-3.5 text-[16px] text-[var(--ink)] shadow-none outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--ink-tertiary)] focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue-tint)] disabled:cursor-not-allowed disabled:bg-[var(--fill)] disabled:text-[var(--ink-tertiary)] sm:text-[15px]",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";

export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => React.ReactNode;
}) {
  const id = useId();
  const descriptionId = hint || error ? `${id}-description` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="block text-[13px] font-semibold text-[var(--ink)]"
      >
        {label}
      </label>
      {children({
        id,
        "aria-describedby": descriptionId,
        "aria-invalid": error ? true : undefined,
      })}
      {error ? (
        <p
          id={descriptionId}
          className="text-[12px] font-medium text-[var(--red-text)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={descriptionId}
          className="text-[12px] text-[var(--ink-tertiary)]"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
