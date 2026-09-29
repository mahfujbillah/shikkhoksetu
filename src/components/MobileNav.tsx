"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileNav({ links, signedIn, logoutLabel }: { links: { href: string; label: string }[]; signedIn: boolean; logoutLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className="rounded-lg p-2 hover:bg-muted" aria-label="Menu" aria-expanded={open}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-border bg-background px-4 py-3 shadow-lg">
          {links.map((l) => <Link key={l.href + l.label} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-muted">{l.label}</Link>)}
          {signedIn && <form action="/auth/signout" method="post"><button className="block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted">{logoutLabel}</button></form>}
        </div>
      )}
    </>
  );
}
