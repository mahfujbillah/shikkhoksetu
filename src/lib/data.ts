"use client";

import { useCallback, useEffect, useState } from "react";
import { isConfigured, supabase } from "./supabase";
import { tuitions as demoTuitions, tutors as demoTutors, type Tuition, type Tutor } from "./demo-data";

export type Source = "demo" | "live";

type TuitionRow = {
  id: number; cls: number; subjects: number[]; area: number; medium: number; gender: number;
  days: number; salary: number; applicants_count: number; created_at: string; status?: string; note?: string | null;
};
type TutorRow = {
  id: string; full_name: string; gender: 1 | 2; institution: string; subjects: number[]; areas: number[];
  experience: number; salary: number | null; rating: number; reviews_count: number; verified: boolean;
};

export const TUITION_COLS = "id, cls, subjects, area, medium, gender, days, salary, applicants_count, created_at, status, note";
export const TUTOR_COLS = "id, full_name, gender, institution, subjects, areas, experience, salary, rating, reviews_count, verified";

export function toTuition(r: TuitionRow): Tuition & { status?: string; note?: string | null } {
  const days = Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86_400_000));
  return { id: r.id, cls: r.cls, subjects: r.subjects, area: r.area, medium: r.medium, gender: r.gender, days: r.days, salary: r.salary, postedDaysAgo: days, applicants: r.applicants_count, status: r.status, note: r.note };
}

export function toTutor(r: TutorRow): Tutor {
  return {
    id: r.id, name: { bn: r.full_name, en: r.full_name }, gender: r.gender,
    institution: { bn: r.institution, en: r.institution }, subjects: r.subjects, areas: r.areas,
    exp: r.experience, salary: r.salary ?? 0, rating: Number(r.rating), reviews: r.reviews_count, verified: r.verified,
  };
}

/** Open tuitions — from the database when Supabase is configured, otherwise sample data. */
export function useTuitions(limit?: number) {
  const [items, setItems] = useState<Tuition[]>(isConfigured ? [] : demoTuitions.slice(0, limit));
  const [loading, setLoading] = useState(isConfigured);
  const load = useCallback(async () => {
    if (!isConfigured) return;
    let q = supabase().from("tuitions").select(TUITION_COLS).eq("status", "open").order("created_at", { ascending: false });
    if (limit) q = q.limit(limit);
    const { data } = await q;
    setItems(((data as TuitionRow[]) ?? []).map(toTuition));
    setLoading(false);
  }, [limit]);
  useEffect(() => { load(); }, [load]);
  return { items, loading, source: (isConfigured ? "live" : "demo") as Source };
}

export function useTutors(limit?: number) {
  const [items, setItems] = useState<Tutor[]>(isConfigured ? [] : demoTutors.slice(0, limit));
  const [loading, setLoading] = useState(isConfigured);
  useEffect(() => {
    if (!isConfigured) return;
    let q = supabase().from("tutors").select(TUTOR_COLS).order("verified", { ascending: false }).order("rating", { ascending: false });
    if (limit) q = q.limit(limit);
    q.then(({ data }) => {
      setItems(((data as TutorRow[]) ?? []).map(toTutor));
      setLoading(false);
    });
  }, [limit]);
  return { items, loading, source: (isConfigured ? "live" : "demo") as Source };
}
