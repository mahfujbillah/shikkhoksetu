import { Badge } from "@/components/ui/badge";
import { makeT, type Lang } from "@/lib/i18n";

const MAP: Record<string, { v: "default" | "secondary" | "success" | "warning" | "destructive" | "outline"; bn: string; en: string }> = {
  OPEN: { v: "default", bn: "খোলা", en: "Open" },
  SHORTLISTED: { v: "warning", bn: "শর্টলিস্টেড", en: "Shortlisted" },
  CONFIRMED: { v: "success", bn: "নিশ্চিত", en: "Confirmed" },
  CANCELLED: { v: "secondary", bn: "বাতিল", en: "Cancelled" },
  PENDING: { v: "secondary", bn: "অপেক্ষমাণ", en: "Pending" },
  REJECTED: { v: "destructive", bn: "বাতিল", en: "Rejected" },
  WITHDRAWN: { v: "outline", bn: "প্রত্যাহার", en: "Withdrawn" },
  PENDING_SIGNATURES: { v: "warning", bn: "স্বাক্ষর বাকি", en: "Awaiting signature" },
  ACTIVE: { v: "success", bn: "চলমান", en: "Active" },
  COMPLETED: { v: "default", bn: "সম্পন্ন", en: "Completed" },
  TERMINATED: { v: "destructive", bn: "সমাপ্ত", en: "Terminated" },
  ISSUED: { v: "warning", bn: "বকেয়া", en: "Due" },
  OVERDUE: { v: "destructive", bn: "মেয়াদোত্তীর্ণ", en: "Overdue" },
  PAID: { v: "success", bn: "পরিশোধিত", en: "Paid" },
  VOID: { v: "outline", bn: "বাতিল", en: "Void" },
  SCHEDULED: { v: "default", bn: "নির্ধারিত", en: "Scheduled" },
  NO_SHOW: { v: "destructive", bn: "অনুপস্থিত", en: "No-show" },
  VERIFIED: { v: "success", bn: "যাচাইকৃত", en: "Verified" },
  UNVERIFIED: { v: "secondary", bn: "যাচাই হয়নি", en: "Unverified" },
  APPROVED: { v: "success", bn: "অনুমোদিত", en: "Approved" },
  DUE: { v: "warning", bn: "বকেয়া", en: "Due" },
};

export function StatusBadge({ status, lang }: { status: string; lang: Lang }) {
  const m = MAP[status] ?? { v: "secondary" as const, bn: status, en: status };
  return <Badge variant={m.v}>{makeT(lang)(m.bn, m.en)}</Badge>;
}
