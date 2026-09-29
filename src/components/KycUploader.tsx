"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import { recordKycAction } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useT } from "./LanguageProvider";

const MAX = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Uploads straight from the browser to the PRIVATE Supabase Storage bucket `kyc`
 * under <userId>/… (a Storage RLS policy only allows writing into your own folder),
 * then records the file via a Server Action that re-validates path, type and size.
 */
export function KycUploader({ userId }: { userId: string }) {
  const { t } = useT();
  const router = useRouter();
  const [type, setType] = useState("NID");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setErr("");
    if (!TYPES.includes(file.type) || file.size > MAX) return setErr(t("JPG, PNG, WEBP বা PDF, সর্বোচ্চ ৫ MB।", "JPG, PNG, WEBP or PDF, max 5 MB."));
    setBusy(true);
    const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const path = `${userId}/${type.toLowerCase()}-${crypto.randomUUID()}-${safe}`;
    const { error } = await supabaseBrowser().storage.from("kyc").upload(path, file, { contentType: file.type, upsert: false });
    if (error) { setBusy(false); return setErr(error.message); }
    const res = await recordKycAction({ type: type as "NID", storagePath: path, fileName: file.name, mimeType: file.type, sizeBytes: file.size });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto">
        <option value="NID">{t("জাতীয় পরিচয়পত্র (NID)", "National ID (NID)")}</option>
        <option value="PASSPORT">{t("পাসপোর্ট", "Passport")}</option>
        <option value="STUDENT_ID">{t("স্টুডেন্ট আইডি কার্ড", "Student ID card")}</option>
        <option value="EDUCATIONAL_CERTIFICATE">{t("শিক্ষাগত সনদ / মার্কশিট", "Certificate / transcript")}</option>
        <option value="PHOTO">{t("নিজের ছবি", "Photo")}</option>
      </Select>
      <Button type="button" disabled={busy} onClick={() => document.getElementById("kyc-file")?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />} {t("ফাইল আপলোড", "Upload file")}
      </Button>
      <input id="kyc-file" type="file" accept={TYPES.join(",")} className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {err && <p className="w-full text-sm text-destructive">{err}</p>}
    </div>
  );
}
