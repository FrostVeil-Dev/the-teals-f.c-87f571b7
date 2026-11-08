import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Chip, ClubDialog, Field, PageHeader, SafeImg } from "@/components/club/ui";
import { check, playbookQuery, principlesQuery, squadQuery } from "@/lib/club-data";
import { TacticalBoard } from "@/components/club/tactical-board";
import { canManageClubData } from "@/lib/ranks";
import { cn } from "@/lib/utils";
import { EditableField, EditableText } from "@/components/club/site-editor";

export const Route = createFileRoute("/_authenticated/_approved/playbook")({
  head: () => ({
    meta: [
      { title: "Team Playbook — The Teals F.C." },
      { name: "description", content: "Interactive formation board, attacking combinations, defensive rules and team principles of The Teals F.C." },
      { property: "og:title", content: "Team Playbook — The Teals F.C." },
      { property: "og:description", content: "Official tactical blueprint and interactive formation board." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(playbookQuery), context.queryClient.ensureQueryData(principlesQuery), context.queryClient.ensureQueryData(squadQuery)]),
  component: PlaybookPage,
});


const SHEETS = [
  { title: "Page 1: Attacking Positions & Philosophy", src: "/assets/aistudio/playbook1_42ada1b2.png" },
  { title: "Page 2: Defensive Roles & Tiki-Taka Combinations", src: "/assets/aistudio/playbook2_4789387d.png" },
  { title: "Page 3: Defensive Set Pieces & Team Principles", src: "/assets/aistudio/playbook3_672c0c01.png" },
];

function PlaybookPage() {
  const { profile } = useAuth();
  const canEdit = profile ? canManageClubData(profile.role) : false;
  const { data: tactics } = useSuspenseQuery(playbookQuery);
  const { data: principles } = useSuspenseQuery(principlesQuery);
  const queryClient = useQueryClient();
  const [sheetsOpen, setSheetsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", category: "Custom Play", keyPlayers: "", description: "" });

  async function addTactic(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Please provide title and instructions");
      return;
    }
    setBusy(true);
    try {
      check(
        await supabase.from("playbook_tactics").insert({
          title: form.title.trim(),
          category: form.category.trim() || "Tactics",
          key_players: form.keyPlayers.trim(),
          description: form.description.trim(),
          sheet_page: 1,
        }),
      );
      toast.success("Tactic added to Playbook!");
      setAddOpen(false);
      setForm({ title: "", category: "Custom Play", keyPlayers: "", description: "" });
      await queryClient.invalidateQueries({ queryKey: playbookQuery.queryKey });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this tactical play?")) return;
    try {
      check(await supabase.from("playbook_tactics").delete().eq("id", id));
      toast.info("Tactic removed");
      await queryClient.invalidateQueries({ queryKey: playbookQuery.queryKey });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="animate-fade-up space-y-10 pb-16">
      <PageHeader
        contentKey="playbook"
        eyebrow="Team Tactics & Formations"
        icon="📋"
        title="Team Playbook"
        subtitle="Official tactical blueprint, attacking combinations, and defensive coverage rules."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="club" onClick={() => setSheetsOpen(true)}>
              📄 View Original Sheets
            </Button>
            {canEdit && (
              <Button variant="hero" onClick={() => setAddOpen(true)}>
                + Add Tactic
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-2 rounded-3xl border border-primary/40 bg-teal-deep/40 p-6 shadow-xl">
<EditableText as="div" k="playbook.philosophy.eyebrow" fallback="Main Philosophy (School Football — Team Tactical Plan)" label="small heading" className="eyebrow" />
        <EditableText as="h2" k="playbook.philosophy.title" fallback={'"Freedom, Aggression, Teamwork & Intelligent Movement"'} label="philosophy heading" className="page-title block text-2xl sm:text-3xl" />
        <EditableText as="p" multiline k="playbook.philosophy.text" fallback="The objective is to let players use their individual strengths while maintaining a proper team structure. Everyone has a role, but players should still make decisions based on the match situation." label="philosophy text" className="block text-sm leading-relaxed text-secondary-foreground" />
      </div>

      <TacticalBoard />

      <section className="space-y-4">
<EditableText as="h3" k="playbook.breakdown.title" fallback="🧠 Tactical Plan Breakdown" label="heading" className="page-title block text-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tactics.map((t) => (
            <div key={t.id} className="panel flex flex-col justify-between space-y-3 p-6 transition-colors hover:border-primary/30">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Chip>{t.category}</Chip>
                  <span className="text-[11px] text-muted-foreground">Sheet Page {t.sheet_page ?? "1-3"}</span>
                </div>
                <EditableField as="h4" table="playbook_tactics" id={t.id} column="title" queryKey={playbookQuery.queryKey} label="play title" value={t.title} className="block font-display text-xl font-bold" />
                <EditableField
                  as="p"
                  kind="multiline"
                  table="playbook_tactics"
                  id={t.id}
                  column="description"
                  queryKey={playbookQuery.queryKey}
                  label="play description"
                  value={t.description}
                  className="block whitespace-pre-line text-xs leading-relaxed text-secondary-foreground"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>
                  Key:{" "}
                  <EditableField as="strong" table="playbook_tactics" id={t.id} column="key_players" queryKey={playbookQuery.queryKey} label="key players" value={t.key_players || "Full Team"} className="text-primary" />
                </span>
                {canEdit && (
                  <button onClick={() => remove(t.id)} className="p-1 hover:text-destructive" aria-label="Delete play">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-glow space-y-6 p-8">
        <div className="flex items-center justify-between">
<EditableText as="h3" k="playbook.principles.title" fallback="⭐ 8 Overall Team Principles" label="heading" className="page-title block text-2xl" />
          <span className="eyebrow">Non-Negotiable</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((pr) => (
            <div key={pr.num} className="panel-deep space-y-1.5 p-4 transition-colors hover:border-primary/30">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">{pr.num}</span>
                <EditableField as="h5" table="team_principles" idColumn="num" id={pr.num} column="title" queryKey={principlesQuery.queryKey} label="principle title" value={pr.title} className="text-sm font-black" />
              </div>
              <EditableField
                as="p"
                kind="multiline"
                table="team_principles"
                idColumn="num"
                id={pr.num}
                column="description"
                queryKey={principlesQuery.queryKey}
                label="principle text"
                value={pr.description}
                className="block pl-8 text-[11px] leading-relaxed text-muted-foreground"
              />
            </div>
          ))}
        </div>
        <div className="bg-banner space-y-2 rounded-2xl border border-primary/30 p-6 text-center">
<EditableText as="div" k="playbook.final.eyebrow" fallback="Final Tactical Message" label="small heading" className="eyebrow" />
          <EditableText as="p" multiline k="playbook.final.text" fallback={'"Teals FC should combine individual freedom with collective football. Attackers take on opponents with confidence, midfielders connect through passing and movement, and defenders stay organized and aggressive."'} label="final message" className="mx-auto block max-w-2xl text-sm text-secondary-foreground" />
          <EditableText as="div" k="playbook.final.objective" fallback="Objective: Play with freedom, pass with intelligence, attack with confidence, and defend together!" label="objective line" className="block pt-2 text-xs font-black uppercase tracking-wider text-primary sm:text-sm" />
        </div>
      </section>

      <ClubDialog open={sheetsOpen} onOpenChange={setSheetsOpen} title="Official Tactical Plan Documents" wide>
        <div className="space-y-4">
          <p className="text-xs text-secondary-foreground">The official 3-page tactical plan sheets created by Teals FC coaching staff:</p>
          {SHEETS.map((s) => (
            <div key={s.src} className="panel-deep p-3">
              <span className="mb-2 block text-xs font-bold text-primary">{s.title}</span>
              <img src={s.src} alt={s.title} className="w-full rounded-lg shadow-lg" />
            </div>
          ))}
        </div>
      </ClubDialog>

      <ClubDialog open={addOpen} onOpenChange={setAddOpen} title="Add Custom Tactical Drill / Play">
        <form onSubmit={addTactic} className="space-y-3.5">
          <Field label="Play Title *">
            <input className="field" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Overlapping Fullback Cross to Far Post" />
          </Field>
          <Field label="Category">
            <input className="field" maxLength={80} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Key Players Involved">
            <input className="field" maxLength={200} value={form.keyPlayers} onChange={(e) => setForm({ ...form, keyPlayers: e.target.value })} placeholder="e.g. Hani, Henil, Ayaan" />
          </Field>
          <Field label="Tactical Instructions *">
            <textarea className="field" rows={4} required maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe movement, passing sequences, and execution steps..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="club" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={busy}>Add to Playbook</Button>
          </div>
        </form>
      </ClubDialog>
    </div>
  );
}
