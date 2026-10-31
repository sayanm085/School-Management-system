import { forwardRef } from "react";

import { cn } from "@/lib/utils/cn";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[96px] w-full resize-y rounded-[var(--radius-md)] border border-[var(--separator)] bg-[var(--surface)] px-3.5 py-3 text-[16px] leading-relaxed text-[var(--ink)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--ink-tertiary)] focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue-tint)] disabled:cursor-not-allowed disabled:bg-[var(--fill)] sm:text-[15px]",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
