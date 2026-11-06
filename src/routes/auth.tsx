import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/club/ui";
import { CLUB_CONFIG } from "@/lib/club-config";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — The Teals F.C." },
      { name: "description", content: "Sign in or join The Teals F.C. club portal to access team chat and member features." },
      { property: "og:title", content: "Sign In — The Teals F.C." },
      { property: "og:description", content: "Sign in or join The Teals F.C. club portal." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/", replace: true });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back to The Teals!");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() || undefined } },
        });
        if (error) throw error;
        setNotice("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message ?? "Sign in failed");
  }

  return (
    <div className="animate-fade-up mx-auto max-w-md py-10">
      <div className="panel-glow space-y-6 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={CLUB_CONFIG.logoUrl} alt="" className="drop-glow h-16 w-16 object-contain" />
          <h1 className="page-title text-3xl">
            {mode === "signin" ? "Sign In" : mode === "signup" ? "Join The Teals" : "Reset Password"}
          </h1>
          <p className="text-xs text-muted-foreground">
            New members start as <strong className="text-primary">Member</strong>. An Admin reviews your account and unlocks Team Chat.
          </p>
        </div>

        {mode !== "forgot" && (
          <div className="space-y-2">
            <Button type="button" variant="club" className="h-11 w-full" onClick={() => oauth("google")}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path fill="currentColor" d="M12.24 10.285v3.6h5.11c-.22 1.39-1.55 4.075-5.11 4.075-3.08 0-5.6-2.55-5.6-5.69s2.52-5.69 5.6-5.69c1.75 0 2.92.75 3.59 1.39l2.84-2.73C16.89 3.48 14.77 2.5 12.24 2.5 7.02 2.5 2.79 6.74 2.79 12s4.23 9.5 9.45 9.5c5.46 0 9.08-3.84 9.08-9.25 0-.62-.07-1.09-.15-1.565h-8.93z" />
              </svg>
              Continue with Google
            </Button>
            <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>
              Continue with Lovable
            </button>
            <div className="flex items-center gap-3 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3.5">
          {mode === "signup" && (
            <Field label="Display name">
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Henil" maxLength={60} />
            </Field>
          )}
          <Field label="Email">
            <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          {mode !== "forgot" && (
            <Field label="Password">
              <input
                className="field"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </Field>
          )}
          {notice && <p className="rounded-xl border border-primary/30 bg-teal-deep/40 p-3 text-xs text-primary">{notice}</p>}
          <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
          {mode === "signin" && (
            <>
              <button className="font-bold text-primary hover:underline" onClick={() => setMode("signup")}>
                New here? Create an account
              </button>
              <button className="hover:text-foreground" onClick={() => setMode("forgot")}>
                Forgot your password?
              </button>
            </>
          )}
          {mode !== "signin" && (
            <button className="font-bold text-primary hover:underline" onClick={() => setMode("signin")}>
              Back to sign in
            </button>
          )}
          <Link to="/" className="pt-2 hover:text-foreground">
            ← Back to the club portal
          </Link>
        </div>
      </div>
    </div>
  );
}
