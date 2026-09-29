import * as React from "react";
import { cn } from "@/lib/utils";

const base = "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-[3px] focus:ring-primary/15 disabled:opacity-60 aria-[invalid=true]:border-destructive";

export function Input({ className, ...p }: React.ComponentProps<"input">) {
  return <input className={cn(base, "h-10", className)} {...p} />;
}
export function Textarea({ className, ...p }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(base, "min-h-24", className)} {...p} />;
}
export function Select({ className, ...p }: React.ComponentProps<"select">) {
  return <select className={cn(base, "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat pr-9", className)} {...p} />;
}
export function Label({ className, ...p }: React.ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...p} />;
}
