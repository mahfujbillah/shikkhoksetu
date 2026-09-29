"use client";
import { cancelAgreementAction, signAgreementAction } from "@/server/actions/marketplace";
import { Input } from "@/components/ui/input";
import { ActionButton, ActionForm, Field, SubmitButton } from "./FormBits";
import { useT } from "./LanguageProvider";

export function SignAgreement({ agreementId, name, canSign }: { agreementId: string; name: string; canSign: boolean }) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      {canSign && (
        <ActionForm action={signAgreementAction} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          {(s) => (<>
            <input type="hidden" name="agreementId" value={agreementId} />
            <Field label={t(`স্বাক্ষর — আপনার পূর্ণ নাম লিখুন: “${name}”`, `Signature — type your full name: “${name}”`)} name="signature" state={s}><Input name="signature" required autoComplete="off" placeholder={name} /></Field>
            <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[var(--primary)]" /> {t("আমি উপরের শর্তাবলি পড়েছি ও মেনে নিচ্ছি।", "I have read and accept the terms above.")}</label>
            <SubmitButton className="mt-4 w-full">{t("স্বাক্ষর করুন ও নিয়োগ নিশ্চিত করুন", "Sign & confirm the hire")}</SubmitButton>
          </>)}
        </ActionForm>
      )}
      <ActionButton action={cancelAgreementAction} fields={{ agreementId }} variant="ghost" size="sm" confirm={t("চুক্তিটি প্রত্যাহার করবেন?", "Withdraw this agreement?")}>{t("চুক্তি প্রত্যাহার", "Withdraw agreement")}</ActionButton>
    </div>
  );
}

export function PrintButton() {
  const { t } = useT();
  return <button type="button" onClick={() => window.print()} className="no-print rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">{t("প্রিন্ট / PDF", "Print / PDF")}</button>;
}
