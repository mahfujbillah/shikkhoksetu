import { redirect } from "next/navigation";
// v1 route → v2 equivalent
export default function LegacyBecomeTutor() {
  redirect("/signup?role=tutor");
}
