import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Chip, ClubDialog, Field, PageHeader, PermissionNote, RankBadge, SafeImg } from "@/components/club/ui";
import { check, squadQuery, type PlayerAttributes, type PlayerStats, type SquadMember } from "@/lib/club-data";
import { canManageClubData } from "@/lib/ranks";
import { FALLBACK_IMAGE } from "@/lib/club-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [
      { title: "Squad & Player Cards — The Teals F.C." },
      { name: "description", content: "The Teals F.C. squad roster with Ultimate Team style player cards, ratings and scouting dossiers." },
      { property: "og:title", content: "Squad & Player Cards — The Teals F.C." },
      { property: "og:description", content: "Meet the squad: forwards, midfielders, defenders and goalkeepers." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(squadQuery),
  component: MembersPage,
});

const CATEGORIES = [
  { id: "Forward", title: "Attackers & Forwards", icon: "⚡", short: "Forwards" },
  { id: "Midfielder", title: "Midfield Engines & Playmakers", icon: "🎯", short: "Midfielders" },
  { id: "Defender", title: "Defenders & Destroyers", icon: "🛡", short: "Defenders" },
  { id: "Goalkeeper", title: "Goalkeepers", icon: "🧤", short: "Goalkeepers" },
] as const;

type FormState = {
  name: string;
  number: string;
  category: string;
  card_position: string;
  rating: string;
  club_role: string;
  position: string;
  photo: string;
  tactical_role: string;
  bio: string;
};

const emptyForm: FormState = {
  name: "",
  number: "10",
  category: "Forward",
  card_position: "",
  rating: "99",
  club_role: "Member",
  position: "",
  photo: "",
  tactical_role: "",
  bio: "",
};

function PlayerCard({ player, onOpen }: { player: SquadMember; onOpen: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      aria-label={`View profile of ${player.name} (${player.card_position} ${player.rating})`}
      className="group relative mx-auto flex w-full max-w-[270px] cursor-pointer select-none flex-col items-center transition-transform duration-300 hover:-translate-y-2 hover:scale-[1.03]"
    >
      <div className="bg-player-card relative flex aspect-[387/360] w-full items-center justify-center overflow-hidden rounded-[30px] border-2 border-primary/30 p-1 transition-all group-hover:border-primary group-hover:glow-teal">
        <SafeImg
          src={player.card_image || player.photo}
          alt={`${player.name} player card`}
          loading="lazy"
          className="block h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="relative z-10 -mt-3 w-full px-2">
        <div className="rounded-2xl border border-primary/40 bg-deep/95 p-2.5 text-center shadow-xl backdrop-blur-md transition-colors group-hover:border-primary">
          <div className="mb-1 flex items-center justify-between gap-1">
            <RankBadge role={player.club_role} />
            <Chip>
              #{player.number ?? "—"} • {player.card_position}
            </Chip>
          </div>
          <div className="truncate font-display text-xl font-black uppercase tracking-wider">{player.name}</div>
          <div className="flex items-center justify-center gap-1.5 truncate text-[11px] font-bold text-primary">
            <span className="truncate">{player.position}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-success">{player.rating} OVR</span>
          </div>
          <div className="mt-1.5 border-t border-border pt-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary/80 group-hover:text-primary">
            Inspect Profile ➔
          </div>
        </div>
      </div>
    </div>
  );
}

function AttributePill({ label, value }: { label: string; value: number }) {
  const tone = value >= 100 ? "tone-cyan" : value >= 90 ? "tone-emerald" : "tone-teal";
  return (
    <div className={cn("flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-xs", tone)}>
      <span className="text-[10px] font-extrabold text-muted-foreground">{label}</span>
      <span className="text-sm font-black">{value}</span>
    </div>
  );
}

function MembersPage() {
  const { profile } = useAuth();
  const canEdit = profile ? canManageClubData(profile.role) : false;
  const { data: members } = useSuspenseQuery(squadQuery);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<SquadMember | null>(null);
  const [editing, setEditing] = useState<SquadMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: squadQuery.queryKey });

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(p: SquadMember) {
    setViewing(null);
    setEditing(p);
    setForm({
      name: p.name,
      number: String(p.number ?? ""),
      category: p.category,
      card_position: p.card_position,
      rating: String(p.rating),
      club_role: p.club_role,
      position: p.position,
      photo: p.photo ?? "",
      tactical_role: p.tactical_role ?? "",
      bio: p.bio ?? "",
    });
    setFormOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter player name");
      return;
    }
    const photo = form.photo.trim() || FALLBACK_IMAGE;
    const payload = {
      name: form.name.trim(),
      number: parseInt(form.number, 10) || null,
      category: form.category,
      card_position: form.card_position.trim().toUpperCase() || "CF",
      rating: parseInt(form.rating, 10) || 98,
      club_role: form.club_role,
      position: form.position.trim() || form.category,
      photo,
      card_image: photo,
      tactical_role: form.tactical_role.trim(),
      bio: form.bio.trim(),
    };
    setBusy(true);
    try {
      if (editing) {
        check(await supabase.from("squad_members").update(payload).eq("id", editing.id));
        toast.success("Player details updated!");
      } else {
        check(
          await supabase.from("squad_members").insert({
            ...payload,
            chat_access: form.club_role !== "Member",
            stats: { appearances: 0, goals: 0, assists: 0 },
          }),
        );
        toast.success("Player added to squad!");
      }
      setFormOpen(false);
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: SquadMember) {
    if (p.club_role === "WEB HANDLER") {
      toast.error("The WEB HANDLER cannot be removed!");
      return;
    }
    if (!window.confirm(`Remove ${p.name} from the roster?`)) return;
    try {
      check(await supabase.from("squad_members").delete().eq("id", p.id));
      toast.info("Member removed");
      setViewing(null);
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const renderCard = (p: SquadMember) => (
    <div key={p.id} className="group/card relative">
      <PlayerCard player={p} onOpen={() => setViewing(p)} />
      {canEdit && (
        <div className="absolute right-3 top-3 z-30 flex items-center gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
          <button
            onClick={() => openEdit(p)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 bg-surface/90 text-secondary-foreground shadow-lg hover:bg-primary hover:text-primary-foreground"
            aria-label={`Edit ${p.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => remove(p)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-destructive/40 bg-surface/90 text-secondary-foreground shadow-lg hover:bg-destructive hover:text-destructive-foreground"
            aria-label={`Delete ${p.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  const attrs = (viewing?.attributes ?? {}) as PlayerAttributes;
  const stats = (viewing?.stats ?? {}) as PlayerStats;
  const isGk = viewing?.category === "Goalkeeper";

  return (
    <div className="animate-fade-up space-y-8 pb-20">
      <PageHeader
        eyebrow="Official Squad"
        icon="👥"
        title="Club Members & Squad Cards"
        subtitle="Interactive Ultimate Team cards with position ratings and tactical dossiers. Click any player card to inspect their scouting description and statistics."
        actions={
          canEdit ? (
            <Button variant="hero" onClick={openAdd}>
              + Add Player / Member
            </Button>
          ) : (
            <PermissionNote>
              Roster management for <strong className="text-primary">Admin+</strong>
            </PermissionNote>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface/60 p-2">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
          <Button size="chip" variant={filter === "all" ? "chipActive" : "chip"} onClick={() => setFilter("all")}>
            All ({members.length})
          </Button>
          {CATEGORIES.map((c) => (
            <Button key={c.id} size="chip" variant={filter === c.id ? "chipActive" : "chip"} onClick={() => setFilter(c.id)}>
              {c.icon} {c.short} ({members.filter((m) => m.category === c.id).length})
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-primary">
          <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
          Tap any card to inspect scouting description
        </div>
      </div>

      <div className="space-y-12">
        {filter === "all" ? (
          CATEGORIES.map((cat) => {
            const group = members.filter((m) => m.category === cat.id);
            if (group.length === 0) return null;
            return (
              <section key={cat.id} className="space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <h2 className="page-title text-2xl">{cat.title}</h2>
                    <span className="text-xs font-bold text-primary">({group.length})</span>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:inline">Tap card to inspect</span>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{group.map(renderCard)}</div>
              </section>
            );
          })
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {members.filter((m) => m.category === filter).map(renderCard)}
          </div>
        )}
      </div>

      <ClubDialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} title={`${viewing?.name ?? ""} • Official Player Dossier`} wide>
        {viewing && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
              <div className="flex justify-center md:col-span-5">
                <div className="bg-player-card glow-teal w-full max-w-[260px] overflow-hidden rounded-[32px] border-2 border-primary/60 p-1">
                  <SafeImg src={viewing.card_image || viewing.photo} alt={`${viewing.name} card`} className="block h-auto w-full object-contain" />
                </div>
              </div>
              <div className="space-y-4 md:col-span-7">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <RankBadge role={viewing.club_role} />
                    <Chip>
                      #{viewing.number ?? "—"} {viewing.card_position}
                    </Chip>
                    <Chip tone="emerald">{viewing.rating} OVR</Chip>
                  </div>
                  <h2 className="page-title text-3xl sm:text-4xl">{viewing.name}</h2>
                  <div className="text-xs font-bold text-primary">{viewing.position}</div>
                </div>
                <div className="space-y-1.5 rounded-2xl border border-primary/30 bg-surface/90 p-3.5">
                  <div className="eyebrow text-[10px]">📋 Scouting Summary & Description</div>
                  <p className="text-sm leading-relaxed">
                    {viewing.bio ||
                      "Dynamic team player contributing with tactical discipline, quick movement, and full dedication to The Teals F.C. football philosophy."}
                  </p>
                </div>
                <div className="panel-deep space-y-1 p-3">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tactical Role:</span>
                  <div className="text-xs font-bold text-primary">
                    {viewing.tactical_role || "All-round positional play with pass and move discipline."}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Player Attributes</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <AttributePill label="PAC" value={attrs.pac ?? 90} />
                    <AttributePill label="SHO" value={attrs.sho ?? 85} />
                    <AttributePill label="PAS" value={attrs.pas ?? 88} />
                    <AttributePill label="DRI" value={attrs.dri ?? 90} />
                    <AttributePill label="DEF" value={attrs.def ?? 80} />
                    <AttributePill label="PHY" value={attrs.phy ?? 85} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-surface/60 p-3 text-center">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Appearances</div>
                    <div className="text-lg font-black">{stats.appearances ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">{isGk ? "Saves" : "Goals"}</div>
                    <div className="text-lg font-black text-primary">{isGk ? stats.saves ?? 0 : stats.goals ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">{isGk ? "Clean Sheets" : "Assists"}</div>
                    <div className="text-lg font-black text-success">{isGk ? stats.cleanSheets ?? 0 : stats.assists ?? 0}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                  <span className={cn("h-2 w-2 rounded-full", viewing.chat_access ? "animate-pulse bg-success" : "bg-muted-foreground")} />
                  Team Chat Access:{" "}
                  <strong className={viewing.chat_access ? "text-success" : ""}>{viewing.chat_access ? "Granted" : "Restricted"}</strong>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
              <div className="text-[11px] text-muted-foreground">The Teals F.C. • Official Squad Dossier</div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <>
                    <Button size="sm" variant="soft" onClick={() => openEdit(viewing)}>
                      ✎ Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(viewing)}>
                      🗑 Delete
                    </Button>
                  </>
                )}
                <Button size="sm" variant="hero" onClick={() => setViewing(null)}>
                  Close Dossier
                </Button>
              </div>
            </div>
          </div>
        )}
      </ClubDialog>

      <ClubDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? `Edit Player: ${editing.name}` : "Add Player / Squad Member"}>
        <form onSubmit={save} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name *">
              <input className="field" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. New Player" />
            </Field>
            <Field label="Jersey Number">
              <input className="field" type="number" min={1} max={99} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position Group *">
              <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Card Position (e.g. CF, LWF)">
              <input className="field" maxLength={6} value={form.card_position} onChange={(e) => setForm({ ...form, card_position: e.target.value })} placeholder="CF, AMF, CB, GK" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="OVR Rating">
              <input className="field" type="number" min={70} max={110} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
            </Field>
            <Field label="Club Rank (card badge)">
              <select className="field" value={form.club_role} onChange={(e) => setForm({ ...form, club_role: e.target.value })}>
                {editing?.club_role === "WEB HANDLER" && <option value="WEB HANDLER">WEB HANDLER</option>}
                <option value="Member">Member</option>
                <option value="Moderator">Moderator</option>
                <option value="Admin">Admin</option>
                <option value="Co-Owner">Co-Owner</option>
              </select>
            </Field>
          </div>
          <Field label="Position Specific Label">
            <input className="field" maxLength={80} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="e.g. Striker (ST), Playmaker (CM)" />
          </Field>
          <Field label="Photo / Card Image URL">
            <input className="field" maxLength={500} value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} placeholder="/assets/cards/... or https://" />
          </Field>
          <Field label="Tactical Role & Instructions">
            <input className="field" maxLength={200} value={form.tactical_role} onChange={(e) => setForm({ ...form, tactical_role: e.target.value })} placeholder="e.g. Box Attacker | Box Presence & Finishing" />
          </Field>
          <Field label="Small Description & Scouting Bio">
            <textarea className="field" rows={3} maxLength={2000} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Brief scouting summary and player description..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="club" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={busy}>
              {editing ? "Save Updates" : "Add Player"}
            </Button>
          </div>
        </form>
      </ClubDialog>
    </div>
  );
}
