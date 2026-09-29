import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { getSettings } from "@/server/services/common";
import { SettingsForm } from "@/components/SettingsForm";
import { Card } from "@/components/ui/card";

export default async function AdminSettings() {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) redirect("/admin");
  const s = await getSettings();
  return (
    <Card className="max-w-3xl p-6">
      <h2 className="mb-1 font-bold">Business rules</h2>
      <p className="mb-5 text-sm text-muted-foreground">Changes apply to new agreements and applications; signed agreements keep the terms they were signed with.</p>
      <SettingsForm s={{ monetizationMode: s.monetizationMode, commissionRate: Number(s.commissionRate), commissionPayer: s.commissionPayer, applyCreditCost: s.applyCreditCost, maxShortlist: s.maxShortlist, invoiceDueDays: s.invoiceDueDays }} />
    </Card>
  );
}
