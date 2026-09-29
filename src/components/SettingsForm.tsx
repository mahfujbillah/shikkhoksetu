"use client";
import { settingsAction } from "@/server/actions/admin";
import { Input, Select } from "@/components/ui/input";
import { ActionForm, Field, SubmitButton } from "./FormBits";

export function SettingsForm({ s }: { s: { monetizationMode: string; commissionRate: number; commissionPayer: string; applyCreditCost: number; maxShortlist: number; invoiceDueDays: number } }) {
  return (
    <ActionForm action={settingsAction} className="grid gap-5 sm:grid-cols-2">
      <Field label="Monetization mode"><Select name="monetizationMode" defaultValue={s.monetizationMode}><option value="COMMISSION">Commission (% of first month)</option><option value="CREDITS">Credits (pay per application)</option><option value="HYBRID">Hybrid (both)</option></Select></Field>
      <Field label="Commission rate (% of first month's salary)"><Input name="commissionRate" type="number" min={0} max={100} step={0.5} defaultValue={s.commissionRate} /></Field>
      <Field label="Commission paid by"><Select name="commissionPayer" defaultValue={s.commissionPayer}><option value="TUTOR">Tutor</option><option value="GUARDIAN">Guardian</option></Select></Field>
      <Field label="Credits per application"><Input name="applyCreditCost" type="number" min={0} max={20} defaultValue={s.applyCreditCost} /></Field>
      <Field label="Max shortlist per job"><Input name="maxShortlist" type="number" min={1} max={10} defaultValue={s.maxShortlist} /></Field>
      <Field label="Invoice due (days)"><Input name="invoiceDueDays" type="number" min={1} max={60} defaultValue={s.invoiceDueDays} /></Field>
      <div className="sm:col-span-2"><SubmitButton>Save settings</SubmitButton></div>
    </ActionForm>
  );
}
