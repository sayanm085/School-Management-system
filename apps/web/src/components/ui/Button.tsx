"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] font-semibold transition-transform duration-[160ms] ease-[var(--ease-out)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--blue-strong)] text-white shadow-[0_6px_18px_rgba(0,102,204,0.20)] hover:brightness-[0.96]",
        secondary:
          "border border-[var(--separator)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--fill)]",
        tinted:
          "bg-[var(--blue-tint)] text-[var(--blue-text)] hover:bg-[var(--blue-tint)]",
        success:
          "bg-[var(--green-strong)] text-white hover:brightness-[1.03]",
        destructive:
          "bg-[var(--red-strong)] text-white hover:bg-[var(--red)]",
        ghost:
          "text-[var(--ink-secondary)] hover:bg-[var(--fill)] hover:text-[var(--ink)]",
        link: "text-[var(--blue-text)] underline-offset-4 hover:underline",
        "on-dark":
          "bg-white text-[#082746] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] hover:bg-white/90",
        "on-dark-ghost":
          "border border-white/18 bg-white/8 text-white backdrop-blur-md hover:bg-white/14",
      },
      size: {
        sm: "h-9 px-3 text-[13px]",
        md: "h-10 px-4 text-[14px]",
        lg: "h-12 px-5 text-[15px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {children}
          </>
        )}
      </Component>
    );
  },
);

Button.displayName = "Button";
