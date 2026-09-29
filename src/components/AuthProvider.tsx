"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { isConfigured, supabase } from "@/lib/supabase";

export type Role = "guardian" | "tutor" | "admin";
type Profile = { id: string; role: Role; full_name: string };
type Ctx = { user: User | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> };

const AuthContext = createContext<Ctx>({ user: null, profile: null, loading: false, refresh: async () => {}, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isConfigured);

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) return setProfile(null);
    const { data } = await supabase().from("profiles").select("id, role, full_name").eq("id", u.id).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    const sb = supabase();
    sb.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      await loadProfile(data.user);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refresh = useCallback(() => loadProfile(user), [loadProfile, user]);
  const signOut = useCallback(async () => {
    if (isConfigured) await supabase().auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return <AuthContext.Provider value={{ user, profile, loading, refresh, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
