"use client";
import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { kycFileUrlAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";

/** Opens a private KYC file via a 2-minute signed URL (never a public link). */
export function KycFileButton({ docId }: { docId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <span className="inline-flex flex-col">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={async () => {
        setBusy(true); setErr("");
        const r = await kycFileUrlAction(docId);
        setBusy(false);
        if (r.ok && r.data) window.open(r.data.url, "_blank", "noopener"); else setErr(r.ok ? "" : r.error);
      }}>{busy ? <Loader2 className="animate-spin" /> : <Eye />} View</Button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </span>
  );
}
