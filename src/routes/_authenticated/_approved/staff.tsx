import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Chip, ClubDialog, Field, toneClass } from "@/components/club/ui";
import { check, staffQuery, type StaffDuty, type StaffMember } from "@/lib/club-data";
import { canManageClubData } from "@/lib/ranks";
import { FALLBACK_IMAGE } from "@/lib/club-config";
import { cn } from "@/lib/utils";
import { EditableField, EditableRecordImage, EditableText, ImageInput } from "@/components/club/site-editor";

export const Route = createFileRoute("/_authenticated/_approved/staff")({
  head: () => ({
    meta: [
      { title: "Staff Info & Leadership — The Teals F.C." },
      { name: "description", content: "Chairman, executive board, football operations, team heads, analysis and media officers of The Teals F.C." },
      { property: "og:title", content: "Staff Info & Leadership — The Teals F.C." },
      { property: "og:description", content: "The governing backbone of The Teals F.C." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(staffQuery),
  component: StaffPage,
});

const DEPARTMENTS = [
  { id: "all", label: "All Staff", icon: "🩵" },
  { id: "Executive & Management", label: "Executive Board & Management", icon: "👑" },
  { id: "Football Operations", label: "Football Operations", icon: "⚽" },
  { id: "Squad Leadership", label: "Squad Leaders (Prime & Youth)", icon: "🌟" },
  { id: "Analysis & Media", label: "Analysis, Stats & Media", icon: "📊" },
];

const DEPT_OPTIONS: string[] = ["Executive & Management", "Football Operations", "Squad Leadership", "Analysis & Performance", "Media & Journalism"];

const ICON_BADGE: Record<string, { emoji: string; label: string; tone: string }> = {
  prime: { emoji: "✨", label: "Prime", tone: "tone-gold" },
  youth: { emoji: "🔵", label: "Youth", tone: "tone-cyan" },
  press: { emoji: "🎙️", label: "Press", tone: "tone-rose" },
};

function Avatar({ staff }: { staff: StaffMember }) {
  const badge = staff.icon_type ? ICON_BADGE[staff.icon_type] : undefined;
  if (badge) {
    return (
      <div className={cn("flex h-full w-full flex-col items-center justify-center rounded-xl border-0 p-1 text-center", badge.tone)}>
        <span className="text-2xl">{badge.emoji}</span>
        <span className="mt-0.5 text-[9px] font-black uppercase tracking-widest">{badge.label}</span>
      </div>
    );
  }
  return (
    <EditableRecordImage
      table="staff"
      id={staff.id}
      column="photo"
      queryKey={staffQuery.queryKey}
      label={`${staff.name}'s photo`}
      src={staff.photo}
      alt={staff.name}
      loading="lazy"
      className="h-full w-full object-contain"
    />
  );
}

const emptyForm = { name: "", tag: "", callsign: "", department: "Executive & Management", role: "", photo: "", description: "", collaboration_note: "" };

function StaffPage() {
  const { profile } = useAuth();
  const canEdit = profile ? canManageClubData(profile.role) : false;
  const { data: staff } = useSuspenseQuery(staffQuery);
  const queryClient = useQueryClient();
  const [dept, setDept] = useState("all");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<StaffMember | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = staff.filter((s) => {
    const matchDept =
      dept === "all" ||
      s.department === dept ||
      (dept === "Analysis & Media" && (s.department === "Analysis & Performance" || s.department === "Media & Journalism"));
    const matchQ =
      !q ||
      [s.name, s.role, s.tag, s.callsign, s.description].some((v) => v?.toLowerCase().includes(q));
    return matchDept && matchQ;
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: staffQuery.queryKey });

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }
  function openEdit(s: StaffMember) {
    setEditing(s);
    setForm({
      name: s.name,
      tag: s.tag,
      callsign: s.callsign ?? "",
      department: s.department,
      role: s.role,
      photo: s.photo ?? "",
      description: s.description ?? "",
      collaboration_note: s.collaboration_note ?? "",
    });
    setFormOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) {
      toast.error("Name and role are required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      tag: form.tag.trim() || "@STAFF",
      callsign: form.callsign.trim(),
      department: form.department,
      role: form.role.trim(),
      photo: form.photo.trim() || FALLBACK_IMAGE,
      description: form.description.trim(),
      collaboration_note: form.collaboration_note.trim(),
    };
    setBusy(true);
    try {
      if (editing) {
        check(await supabase.from("staff").update(payload).eq("id", editing.id));
        toast.success("Staff information updated!");
      } else {
        check(
          await supabase.from("staff").insert({
            ...payload,
            tone: "teal",
            roles: [{ title: payload.role, duty: payload.description }],
            sort_order: staff.length + 1,
          }),
        );
        toast.success("New staff member added!");
      }
      setFormOpen(false);
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: StaffMember) {
    if (!window.confirm(`Remove ${s.name} (${s.role}) from Staff Info?`)) return;
    try {
      check(await supabase.from("staff").delete().eq("id", s.id));
      toast.info("Staff member removed");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const duties = (s: StaffMember) => (Array.isArray(s.roles) ? (s.roles as unknown as StaffDuty[]) : []);

  return (
    <div className="animate-fade-up space-y-10 pb-20">
      <section className="bg-hero relative overflow-hidden rounded-3xl border border-primary/30 p-6 shadow-2xl sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-cyan/10 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-3xl space-y-3">
            <div className="chip tone-teal px-3 py-1 text-xs">
              <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
              <EditableText k="staff.hero.badge" fallback="Official Hierarchy & Leadership Directory" label="badge" />
            </div>
            <EditableText as="h1" k="staff.title" fallback="🩵 Staff Info 🩵" label="page title" className="page-title flex items-center gap-3 text-5xl sm:text-6xl" />
            <EditableText
              as="p"
              multiline
              k="staff.subtitle"
              fallback="The governing backbone of The Teals F.C. Meet our Chairman, Executive Leadership, Web Administration, Football Directors, Team Heads, and Analytics & Journalism Officers."
              label="page intro"
              className="block text-sm font-medium leading-relaxed text-secondary-foreground sm:text-base"
            />
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-primary/30 bg-deep/80 p-3.5 text-xs text-secondary-foreground sm:flex-row sm:items-center">
              <div className="whitespace-nowrap text-[11px] font-black uppercase text-primary">⚡ Digital Operations:</div>
              <div className="leading-relaxed">
                Chairman <strong className="text-foreground">@CHM (Ryhaan)</strong> provides verified club analytics and match data to{" "}
                <strong className="text-violet">@WEB (HENIL)</strong> for live portal deployment.
              </div>
            </div>
          </div>
          {canEdit && (
            <Button variant="hero" size="lg" className="flex-shrink-0" onClick={openAdd}>
              + Add Staff Member
            </Button>
          )}
        </div>
      </section>

      <div className="space-y-4">
        <div className="panel flex flex-col items-stretch justify-between gap-4 border-primary/20 p-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff by name, role, callsign or tag (@CHM, FROST, Faizan)..."
              className="field pl-10 text-xs"
            />
          </div>
          <div className="px-1 text-xs text-muted-foreground">
            Showing: <strong className="font-bold text-primary">{filtered.length}</strong> of {staff.length} staff
          </div>
        </div>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
          {DEPARTMENTS.map((d) => (
            <Button key={d.id} size="chip" variant={dept === d.id ? "chipActive" : "chip"} onClick={() => setDept(d.id)}>
              {d.icon} {d.label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel space-y-3 p-12 text-center">
          <div className="text-4xl">🔍</div>
          <div className="font-display text-xl font-bold uppercase">No Staff Found</div>
          <p className="mx-auto max-w-md text-xs text-muted-foreground">
            No staff members matched your current filter or query "{query}". Clear your search or switch categories.
          </p>
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              setQuery("");
              setDept("all");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-primary/30 bg-surface/90 transition-all duration-300 hover:border-primary hover:shadow-2xl"
            >
              <div className="bg-stripe h-1.5 w-full" />
              <div className="flex flex-1 flex-col space-y-5 p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn("chip rounded-lg px-2.5 py-1 font-mono", toneClass(s.tone))}>{s.tag}</span>
                    {s.callsign && <span className="chip tone-slate rounded-md">{s.callsign}</span>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(s)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-deep hover:bg-primary hover:text-primary-foreground"
                        aria-label={`Edit ${s.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(s)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-destructive/30 bg-deep hover:bg-destructive hover:text-destructive-foreground"
                        aria-label={`Delete ${s.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/40 bg-teal-deep/50 p-1 transition-transform group-hover:scale-105">
                    <Avatar staff={s} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="truncate text-xs font-bold uppercase tracking-widest text-primary">{s.department}</div>
                    <EditableField
                      as="h3"
                      table="staff"
                      id={s.id}
                      column="name"
                      queryKey={staffQuery.queryKey}
                      label="staff name"
                      value={s.name}
                      className="block truncate font-display text-2xl font-black uppercase tracking-tight transition-colors group-hover:text-primary"
                    />
                    <EditableField
                      as="div"
                      table="staff"
                      id={s.id}
                      column="role"
                      queryKey={staffQuery.queryKey}
                      label="role title"
                      value={s.role}
                      className="line-clamp-1 text-xs font-bold text-secondary-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-2.5 pt-1">
                  {duties(s).length > 0 ? (
                    duties(s).map((r) => (
                      <div key={r.title} className="space-y-1 rounded-xl border border-border bg-deep/80 p-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {r.title}
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">{r.duty}</p>
                      </div>
                    ))
                  ) : (
                    <EditableField
                      as="div"
                      kind="multiline"
                      table="staff"
                      id={s.id}
                      column="description"
                      queryKey={staffQuery.queryKey}
                      label="responsibilities"
                      value={s.description}
                      className="block rounded-xl border border-border bg-deep/80 p-2.5 text-xs text-muted-foreground"
                    />
                  )}
                </div>
                {s.collaboration_note && (
                  <div className="mt-auto flex items-start gap-2 rounded-xl border border-primary/20 bg-teal-deep/30 p-2.5 text-[11px] leading-snug text-primary/90">
                    <span>🔗</span>
                    <EditableField table="staff" id={s.id} column="collaboration_note" queryKey={staffQuery.queryKey} label="collaboration note" value={s.collaboration_note} />
                  </div>
                )}
              </div>
              <div className="p-4 pt-0">
                <Button variant="soft" className="w-full text-xs uppercase tracking-wider" onClick={() => setViewing(s)}>
                  Inspect Staff Dossier ➔
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="space-y-6 rounded-3xl border border-primary/25 bg-deep/70 p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <span className="text-2xl">📋</span>
          <div>
            <h2 className="page-title text-2xl">Club Governance & Responsibility Protocol</h2>
            <p className="text-xs text-muted-foreground">Core operational channels ensuring transparent execution across all club tiers</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 text-xs md:grid-cols-3">
          <div className="panel space-y-2 p-4">
            <div className="font-bold uppercase tracking-wider text-amber">👑 Executive & Management</div>
            <p className="leading-relaxed text-muted-foreground">
              Led by <strong className="text-foreground">@CHM (Ryhaan)</strong> and supported by <strong className="text-foreground">@VCHM (ABHIVAN.P)</strong>.
              Manages long-range strategic vision, matchday squad decisions, contracts, and internal governance.
            </p>
          </div>
          <div className="panel space-y-2 p-4">
            <div className="font-bold uppercase tracking-wider text-violet">💻 Digital & Website Operations</div>
            <p className="leading-relaxed text-muted-foreground">
              Architected by <strong className="text-foreground">@WEB (HENIL)</strong> with complete administrative access. Receives tactical analytics from
              Ryhaan to maintain live stats, match reports, and member profiles.
            </p>
          </div>
          <div className="panel space-y-2 p-4">
            <div className="font-bold uppercase tracking-wider text-primary">🎯 Technical, Scouting & Media</div>
            <p className="leading-relaxed text-muted-foreground">
              Recruitment anchored by <strong className="text-foreground">Faizan (Director of Football)</strong>, team leadership by{" "}
              <strong className="text-foreground">Advik & Josiah</strong>, performance telemetry by <strong className="text-foreground">Johan</strong>, and
              press relations by <strong className="text-foreground">Hanan</strong>.
            </p>
          </div>
        </div>
      </section>

      <ClubDialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} title={`${viewing?.name ?? ""} • Official Staff Dossier`}>
        {viewing && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-deep p-4">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/40 bg-surface p-1">
                <Avatar staff={viewing} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("chip rounded font-mono", toneClass(viewing.tone))}>{viewing.tag}</span>
                  <span className="text-xs font-bold uppercase text-primary">{viewing.department}</span>
                </div>
                <h3 className="page-title text-3xl">{viewing.name}</h3>
                <p className="text-xs font-semibold text-secondary-foreground">{viewing.role}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="eyebrow">📋 Official Responsibilities & Directives</h4>
              {duties(viewing).length > 0 ? (
                duties(viewing).map((r) => (
                  <div key={r.title} className="panel-deep space-y-1 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase">
                      <span className="text-primary">❖</span>
                      {r.title}
                    </div>
                    <p className="pl-4 text-xs leading-relaxed text-secondary-foreground">{r.duty}</p>
                  </div>
                ))
              ) : (
                <div className="panel-deep p-3.5 text-xs text-secondary-foreground">{viewing.description}</div>
              )}
            </div>
            {viewing.collaboration_note && (
              <div className="space-y-1 rounded-xl border border-primary/30 bg-teal-deep/40 p-3.5">
                <div className="text-xs font-bold uppercase text-primary">🔄 Operational Protocol:</div>
                <p className="text-xs leading-relaxed text-secondary-foreground">{viewing.collaboration_note}</p>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span>Verified Staff Identity • The Teals F.C.</span>
              <Chip>{viewing.department}</Chip>
            </div>
          </div>
        )}
      </ClubDialog>

      <ClubDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? `Edit Staff: ${editing.name}` : "Add New Staff Member"}>
        <form onSubmit={save} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name *">
              <input className="field" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Badge Tag (e.g. @CHM | M | #A5)">
              <input className="field" maxLength={60} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Callsign / Number">
              <input className="field" maxLength={40} value={form.callsign} onChange={(e) => setForm({ ...form, callsign: e.target.value })} placeholder="e.g. #A7 or EAGLE" />
            </Field>
            <Field label="Department *">
              <select className="field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {DEPT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Role Title *">
            <input className="field" required maxLength={120} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Chief Scout & Data Analyst" />
          </Field>
          <Field label="Photo / Avatar">
            <ImageInput value={form.photo} onChange={(photo) => setForm({ ...form, photo })} />
          </Field>
          <Field label="Responsibilities & Directives">
            <textarea className="field" rows={3} maxLength={3000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Collaboration / Comms Note">
            <input className="field" maxLength={500} value={form.collaboration_note} onChange={(e) => setForm({ ...form, collaboration_note: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="club" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={busy}>
              {editing ? "Save Staff Changes" : "Add Staff Member"}
            </Button>
          </div>
        </form>
      </ClubDialog>
    </div>
  );
}
