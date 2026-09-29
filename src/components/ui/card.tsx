import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...p }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-border bg-card text-card-foreground shadow-sm", className)} {...p} />;
}
export function CardHeader({ className, ...p }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...p} />;
}
export function CardTitle({ className, ...p }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-base font-bold leading-snug", className)} {...p} />;
}
export function CardDescription({ className, ...p }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...p} />;
}
export function CardContent({ className, ...p }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0", className)} {...p} />;
}
export function CardFooter({ className, ...p }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-3 border-t border-border px-5 py-4", className)} {...p} />;
}
