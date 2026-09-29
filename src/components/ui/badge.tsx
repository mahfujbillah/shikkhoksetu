import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5", {
  variants: {
    variant: {
      default: "bg-primary/10 text-primary",
      secondary: "bg-muted text-foreground/80",
      outline: "border border-border text-foreground/80",
      success: "bg-success/15 text-success",
      warning: "bg-accent/20 text-accent-foreground",
      destructive: "bg-destructive/10 text-destructive",
      verified: "bg-primary text-primary-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
