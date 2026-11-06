import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getRank, type Rank } from "@/lib/ranks";

export interface ClubProfile {
  id: string;
  name: string;
  email: string;
  photoURL: string | null;
  chatAccess: boolean;
  isReviewed: boolean;
  status: string;
  role: string; // display label e.g. "WEB HANDLER"
  rank: Rank;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ClubProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(userId: string): Promise<ClubProfile | null> {
  const [{ data: profile }, { data: roleRow }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile) return null;
  const removed = profile.status !== "active";
  const rank = getRank(removed ? "member" : roleRow?.role ?? "member");
  return {
    id: profile.id,
    name: profile.display_name,
    email: profile.email,
    photoURL: profile.photo_url,
    chatAccess: !removed && (profile.chat_access || rank.key === "web_handler"),
    isReviewed: profile.is_reviewed,
    status: profile.status,
    role: rank.id,
    rank,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ClubProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshFor = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setProfile(null);
      return;
    }
    setProfile(await loadProfile(s.user.id));
  }, []);

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return;
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        // Defer the database read so it never blocks the auth callback.
        setTimeout(() => {
          void refreshFor(s).finally(() => active && setLoading(false));
        }, 0);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [refreshFor]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile: () => refreshFor(session),
    }),
    [session, profile, loading, refreshFor],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
