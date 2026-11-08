import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CLUB_CONFIG } from "@/lib/club-config";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Join — The Teals F.C. Members Portal" },
      { name: "description", content: "Register with Google to request access to The Teals F.C. members-only club portal." },
      { property: "og:title", content: "Join — The Teals F.C. Members Portal" },
      { property: "og:description", content: "Members-only portal. Register with Google and wait for an Admin to approve you." },
    ],
  }),
  component: AuthPage,
});

const GOOGLE_G = (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);

function AuthPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  // Approved members go straight into the portal.
  useEffect(() => {
    if (user && profile?.isApproved) navigate({ to: "/", replace: true });
  }, [user, profile?.isApproved, navigate]);

  // While waiting, check every 20 seconds whether an Admin has approved this account.
  const waiting = Boolean(user && profile && !profile.isApproved && profile.status === "active");
  useEffect(() => {
    if (!waiting) return;
    const t = window.setInterval(() => void refreshProfile(), 20000);
    return () => window.clearInterval(t);
  }, [waiting, refreshProfile]);

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error(result.error.message ?? "Sign in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  }

  const removed = Boolean(user && profile && profile.status !== "active");

  return (
    <div className="animate-fade-up mx-auto max-w-md py-10">
      <div className="panel-glow space-y-6 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={CLUB_CONFIG.logoUrl} alt="" className="drop-glow h-16 w-16 object-contain" />
          <h1 className="page-title text-3xl">
            {removed ? "Access Removed" : waiting ? "Waiting for Approval" : "Members Only"}
          </h1>
        </div>

        {loading || (user && !profile && !removed) ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Checking your account…</p>
        ) : removed ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-secondary-foreground">
              Your access to {CLUB_CONFIG.name} has been removed. Contact the club management if you think this is a mistake.
            </p>
            <Button variant="soft" className="w-full" onClick={signOut}>Sign Out</Button>
          </div>
        ) : waiting && profile ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber/40 bg-surface text-2xl">⏳</div>
            <p className="text-sm text-secondary-foreground">
              Thanks for registering, <strong className="text-foreground">{profile.name}</strong>. An Admin needs to approve your account
              before you can see the club pages. Once approved you become a <strong className="text-primary">Member</strong> and Team
              Chat unlocks.
            </p>
            <p className="text-xs text-muted-foreground">Signed in as {profile.email}. This page checks automatically.</p>
            <div className="flex gap-2">
              <Button variant="hero" className="flex-1" onClick={() => void refreshProfile()}>Check Again</Button>
              <Button variant="soft" className="flex-1" onClick={signOut}>Sign Out</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-xs text-muted-foreground">
              The {CLUB_CONFIG.name} portal is private. Register with your Google account, then an Admin approves you before you can
              see any section.
            </p>
            <button type="button" className="google-btn" onClick={google} disabled={busy}>
              {GOOGLE_G}
              <span>{busy ? "Opening Google…" : "Continue with Google"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
