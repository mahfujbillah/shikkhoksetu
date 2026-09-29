"use client";
import { grantCreditsAction, setBlockedAction, setRoleAction } from "@/server/actions/admin";
import { Select } from "@/components/ui/input";
import { ActionButton, ActionForm, SubmitButton } from "./FormBits";

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  return (
    <ActionForm action={setRoleAction} className="flex items-center gap-1" hideMessage>
      <input type="hidden" name="userId" value={userId} />
      <Select name="role" defaultValue={role} className="h-8 w-36 py-1 text-xs"><option value="STUDENT_GUARDIAN">Guardian</option><option value="TUTOR">Tutor</option><option value="ADMIN">Admin</option></Select>
      <SubmitButton size="sm" variant="outline">Save</SubmitButton>
    </ActionForm>
  );
}

export function BlockButton({ userId, blocked }: { userId: string; blocked: boolean }) {
  return <ActionButton action={setBlockedAction} fields={{ userId, blocked: String(!blocked) }} size="sm" variant={blocked ? "outline" : "destructive"} confirm={blocked ? undefined : "Block this user?"}>{blocked ? "Unblock" : "Block"}</ActionButton>;
}

export function GrantCredits({ tutorProfileId }: { tutorProfileId: string }) {
  return <ActionButton action={grantCreditsAction} fields={{ tutorProfileId, credits: "10" }} size="sm" variant="ghost">+10 credits</ActionButton>;
}
