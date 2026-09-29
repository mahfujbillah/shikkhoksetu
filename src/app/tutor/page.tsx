import { redirect } from "next/navigation";
// v1 route (/tutor?id=…) → v2 (/tutors)
export default function LegacyTutor() {
  redirect("/tutors");
}
