import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils/cn";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "h-10 w-full appearance-none rounded-[12px] border border-[var(--separator)] bg-[var(--surface)] pl-3 pr-9 text-[13px] font-medium text-[var(--ink)] outline-none transition-colors focus:border-[var(--blue)] focus:ring-4 focus:ring-[var(--blue-tint)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-tertiary)]"
      aria-hidden="true"
    />
  </div>
));

Select.displayName = "Select";
