import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "rounded-xl bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary/90 transition-all",
        club: "rounded-xl border border-primary/30 bg-secondary font-bold text-secondary-foreground hover:border-primary hover:bg-secondary/80",
        soft: "rounded-xl border border-primary/40 bg-teal-deep/60 font-bold text-primary hover:bg-teal-deep",
        violet: "rounded-xl border border-violet/40 bg-violet/15 font-bold text-violet hover:bg-violet/25",
        cyan: "rounded-xl border border-cyan/40 bg-cyan/15 font-bold text-cyan hover:bg-cyan/25",
        danger: "rounded-xl border border-destructive/40 bg-destructive/15 font-bold text-destructive hover:bg-destructive/25",
        chip: "rounded-xl border border-border bg-deep text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground",
        chipActive: "rounded-xl bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md shadow-primary/20",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 px-5 text-sm",
        icon: "h-9 w-9",
        chip: "h-8 px-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
