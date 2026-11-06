import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Chip, ClubDialog, Field, PageHeader, SafeImg } from "@/components/club/ui";
import { check, playbookQuery, principlesQuery } from "@/lib/club-data";
import { canManageClubData } from "@/lib/ranks";
import { cn } from "@/lib/utils";
import { EditableField, EditableText } from "@/components/club/site-editor";

export const Route = createFileRoute("/playbook")({
  head: () => ({
    meta: [
      { title: "Team Playbook — The Teals F.C." },
      { name: "description", content: "Interactive formation board, attacking combinations, defensive rules and team principles of The Teals F.C." },
      { property: "og:title", content: "Team Playbook — The Teals F.C." },
      { property: "og:description", content: "Official tactical blueprint and interactive formation board." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(playbookQuery), context.queryClient.ensureQueryData(principlesQuery)]),
  component: PlaybookPage,
});

interface PitchPlayer {
  id: string;
  name: string;
  num: number;
  pos: string;
  x: number;
  y: number;
  role: string;
  photo: string;
}

const FORMATIONS: Record<string, { name: string; description: string; players: PitchPlayer[] }> = {
  "2-3-1": {
    name: "2-3-1 Attacking (7-a-Side)",
    description:
      "Our primary high-tempo system: Faraz & Johan form the defensive cover, Faizan & Hani control tempo, and the Ryhaan-Ayaan-Henil trident attack the box.",
    players: [
      { id: "henil", name: "Henil", num: 10, pos: "ST", x: 50, y: 15, role: "Box Attacker | Box Presence & Finishing", photo: "/assets/cards/card_henil.png" },
      { id: "ayaan", name: "Ayaan", num: 7, pos: "LW", x: 22, y: 35, role: "Wide Attacker / Second Striker", photo: "/assets/cards/card_ayaan.png" },
      { id: "hani", name: "Hani", num: 8, pos: "CM", x: 50, y: 42, role: "Playmaker | Creative Engine", photo: "/assets/cards/card_hani.png" },
      { id: "ryhaan", name: "Ryhaan", num: 11, pos: "RW", x: 78, y: 35, role: "Ball Carrier & Line Breaker", photo: "/assets/cards/card_ryhaan.png" },
      { id: "faizan", name: "Faizan", num: 6, pos: "DM", x: 50, y: 62, role: "Rodri Role | Defensive Anchor & Controller", photo: "/assets/cards/card_faizan.png" },
      { id: "johan", name: "Johan", num: 3, pos: "CB", x: 33, y: 78, role: "Last Line of Defence | Sweeper Cover", photo: "/assets/cards/card_johan.png" },
      { id: "faraz", name: "Faraz", num: 4, pos: "CB", x: 67, y: 78, role: "Destroyer | Ball Hunter (Aggressive Pressure)", photo: "/assets/cards/card_faraz.png" },
      { id: "alvin", name: "Alvin", num: 1, pos: "GK", x: 50, y: 92, role: "The Wall | Reliable Goalkeeper", photo: "/assets/cards/card_alvin.png" },
    ],
  },
  "3-2-1": {
    name: "3-2-1 Solid Base (7-a-Side)",
    description: "Compact defensive shape used to protect leads. 3 disciplined defenders with wingbacks pressing the flanks.",
    players: [
      { id: "henil", name: "Henil", num: 10, pos: "ST", x: 50, y: 18, role: "Target & Counter-Attacker", photo: "/assets/cards/card_henil.png" },
      { id: "hani", name: "Hani", num: 8, pos: "CM", x: 38, y: 45, role: "Counter Transition Playmaker", photo: "/assets/cards/card_hani.png" },
      { id: "faizan", name: "Faizan", num: 6, pos: "DM", x: 62, y: 45, role: "Shield & Interceptor", photo: "/assets/cards/card_faizan.png" },
      { id: "dhanush", name: "Dhanush", num: 5, pos: "LWB", x: 20, y: 72, role: "Flexible Defender", photo: "/assets/cards/card_dhanush.png" },
      { id: "johan", name: "Johan", num: 3, pos: "CB", x: 50, y: 76, role: "Central Sweeper", photo: "/assets/cards/card_johan.png" },
      { id: "faraz", name: "Faraz", num: 4, pos: "RWB", x: 80, y: 72, role: "Destroyer on the Flank", photo: "/assets/cards/card_faraz.png" },
      { id: "alvin", name: "Alvin", num: 1, pos: "GK", x: 50, y: 92, role: "The Wall | Shot Stopper", photo: "/assets/cards/card_alvin.png" },
    ],
  },
  "4-3-3": {
    name: "4-3-3 Total Football (11-a-Side)",
    description: "Full-pitch formation emphasizing triangular tiki-taka passing, wide wingers stretching the defense, and an overlapping backline.",
    players: [
      { id: "henil", name: "Henil", num: 10, pos: "ST", x: 50, y: 15, role: "Complete Striker", photo: "/assets/cards/card_henil.png" },
      { id: "ayaan", name: "Ayaan", num: 7, pos: "LW", x: 18, y: 25, role: "Inverted Attacking Winger", photo: "/assets/cards/card_ayaan.png" },
      { id: "ryhaan", name: "Ryhaan", num: 11, pos: "RW", x: 82, y: 25, role: "Explosive Line Breaker", photo: "/assets/cards/card_ryhaan.png" },
      { id: "hani", name: "Hani", num: 8, pos: "CM", x: 35, y: 45, role: "Creative Midfield Maestro", photo: "/assets/cards/card_hani.png" },
      { id: "faizan", name: "Faizan", num: 6, pos: "DM", x: 50, y: 56, role: "Rodri Controller", photo: "/assets/cards/card_faizan.png" },
      { id: "sreeram", name: "Sreeram", num: 14, pos: "CM", x: 65, y: 45, role: "Box-to-Box Runner", photo: "/assets/cards/card_sreeram.png" },
      { id: "dhanush", name: "Dhanush", num: 5, pos: "LB", x: 15, y: 75, role: "Left Fullback", photo: "/assets/cards/card_dhanush.png" },
      { id: "johan", name: "Johan", num: 3, pos: "CB", x: 38, y: 78, role: "Covering Center Back", photo: "/assets/cards/card_johan.png" },
      { id: "faraz", name: "Faraz", num: 4, pos: "CB", x: 62, y: 78, role: "Destroyer Center Back", photo: "/assets/cards/card_faraz.png" },
      { id: "vivek", name: "Vivek", num: 2, pos: "RB", x: 85, y: 75, role: "Right Fullback", photo: "/assets/aistudio/Screenshot_2026-11-06_162433_9e604cdf.png" },
      { id: "alvin", name: "Alvin", num: 1, pos: "GK", x: 50, y: 92, role: "The Wall", photo: "/assets/cards/card_alvin.png" },
    ],
  },
};

const DEFAULT_FORMATION = FORMATIONS["2-3-1"]!;

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
  const [formationKey, setFormationKey] = useState("2-3-1");
  const formation = FORMATIONS[formationKey] ?? DEFAULT_FORMATION;
  const [selectedId, setSelectedId] = useState("henil");
  const selected = formation.players.find((p) => p.id === selectedId) ?? formation.players[0]!;
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

      <section className="panel-glow space-y-6 p-6 sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
<EditableText as="h3" k="playbook.board.title" fallback="🏟 Interactive Tactical Board" label="heading" className="page-title block text-2xl" />
            <p className="text-xs text-muted-foreground">Click any player on the pitch to inspect position & role instructions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(FORMATIONS).map((key) => (
              <Button
                key={key}
                size="chip"
                variant={key === formationKey ? "chipActive" : "chip"}
                onClick={() => {
                  setFormationKey(key);
                  setSelectedId(FORMATIONS[key]?.players[0]?.id ?? "henil");
                }}
              >
                {key}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="relative h-[460px] w-full overflow-hidden rounded-3xl border-4 border-deep shadow-2xl sm:h-[520px] lg:col-span-8">
            <div className="bg-pitch absolute inset-0 opacity-95" />
            <svg className="pointer-events-none absolute inset-0 h-full w-full stroke-chalk/40" fill="none" strokeWidth="2">
              <rect x="15" y="15" width="calc(100% - 30px)" height="calc(100% - 30px)" rx="10" />
              <line x1="15" y1="50%" x2="calc(100% - 15px)" y2="50%" />
              <circle cx="50%" cy="50%" r="45" />
              <rect x="25%" y="15" width="50%" height="70" />
              <rect x="35%" y="15" width="30%" height="30" />
              <rect x="25%" y="calc(100% - 85px)" width="50%" height="70" />
              <rect x="35%" y="calc(100% - 45px)" width="30%" height="30" />
            </svg>
            {formation.players.map((p) => {
              const isSel = p.id === selected.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className="group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-transform hover:scale-110"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  aria-label={`${p.name} (${p.pos})`}
                >
                  <div
                    className={cn(
                      "relative h-10 w-10 rounded-full bg-surface p-0.5 transition-all sm:h-12 sm:w-12",
                      isSel ? "scale-110 ring-4 ring-primary ring-offset-2 ring-offset-deep" : "ring-2 ring-chalk/60 group-hover:ring-primary",
                    )}
                  >
                    <SafeImg src={p.photo} alt={p.name} className="h-full w-full rounded-full object-cover" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-surface bg-primary text-[10px] font-black text-primary-foreground">
                      {p.num}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "mt-1 whitespace-nowrap rounded border border-primary/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                      isSel ? "bg-primary text-primary-foreground" : "bg-deep/80 text-foreground",
                    )}
                  >
                    {p.name} ({p.pos})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-primary/30 bg-deep p-5 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-primary/50 bg-deep">
                  <SafeImg src={selected.photo} alt={selected.name} className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 right-1 rounded bg-primary px-1.5 text-xs font-black text-primary-foreground">#{selected.num}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display text-2xl font-black">{selected.name}</h4>
                    <Chip className="rounded">{selected.pos}</Chip>
                  </div>
                  <div className="text-xs font-bold text-primary">{selected.role}</div>
                  <div className="pt-1 text-xs leading-relaxed text-secondary-foreground">
                    Key Focus: Execute tactical responsibilities as outlined in Section 1 of the club master plan.
                  </div>
                </div>
              </div>
            </div>
            <div className="panel-deep space-y-3 p-5">
              <span className="eyebrow">{formation.name}</span>
              <p className="text-xs leading-relaxed text-secondary-foreground">{formation.description}</p>
            </div>
            <div className="space-y-2 rounded-2xl border border-primary/30 bg-teal-deep/40 p-4 text-xs text-secondary-foreground">
<EditableText as="span" k="playbook.trident.title" fallback="The Attacking Trident" label="heading" className="block font-black uppercase text-primary" />
              <EditableText as="p" multiline k="playbook.trident.text" fallback="Ryhaan breaks lines with pace ➔ Ayaan & Henil shift into striker positions ➔ Continuous passing options and clinical box finishing." label="trident text" className="block" />
            </div>
          </div>
        </div>
      </section>

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
