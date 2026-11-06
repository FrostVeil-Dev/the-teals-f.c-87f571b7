import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/club/ui";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a New Password — The Teals F.C." },
      { name: "description", content: "Choose a new password for your Teals F.C. club portal account." },
      { property: "og:title", content: "Set a New Password — The Teals F.C." },
      { property: "og:description", content: "Choose a new password for your club portal account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated — you're signed in.");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <form onSubmit={submit} className="panel-glow space-y-4 p-6 sm:p-8">
        <h1 className="page-title text-3xl">Set a New Password</h1>
        <p className="text-xs text-muted-foreground">Open this page from the reset link in your email.</p>
        <Field label="New password">
          <input className="field" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password">
          <input className="field" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy}>
          {busy ? "Saving…" : "Update Password"}
        </Button>
      </form>
    </div>
  );
}
