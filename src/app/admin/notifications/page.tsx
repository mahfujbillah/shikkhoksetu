import { db } from "@/lib/db";
import { timeAgo } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { requireAdmin } from "@/server/auth";
import { CrmHeader, Section } from "@/components/admin/Crm";
import { AnnounceForm } from "@/components/admin/CrmForms";

export default async function AdminNotifications() {
  const me = await requireAdmin();
  const { t, lang } = await getT();
  const sent = await db.auditLog.findMany({ where: { action: "ANNOUNCEMENT" }, orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { fullName: true } } } });
  return (
    <>
      <CrmHeader title={t("নোটিফিকেশন পাঠান", "Send notifications")} desc={t("ব্যবহারকারীরা ড্যাশবোর্ডের ঘণ্টা আইকনে এই বার্তা দেখবেন।", "Users see these under the bell icon in their dashboard.")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t("নতুন ঘোষণা", "New announcement")}><AnnounceForm isSuper={me.isSuperAdmin} /></Section>
        <Section title={t("আগে পাঠানো", "Previously sent")}>
          <ul className="divide-y divide-border text-sm">
            {sent.length === 0 ? <li className="text-muted-foreground">—</li> : sent.map((s) => {
              const m = (s.meta ?? {}) as { title?: string; recipients?: number };
              return <li key={s.id} className="py-2"><p className="font-medium">{m.title}</p><p className="text-xs text-muted-foreground">{s.entityId} · {m.recipients} {t("জন", "recipients")} · {s.actor?.fullName} · {timeAgo(s.createdAt, lang)}</p></li>;
            })}
          </ul>
        </Section>
      </div>
    </>
  );
}
