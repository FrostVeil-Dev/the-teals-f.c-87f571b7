import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ClubDialog, Field, PageHeader, PermissionNote } from "@/components/club/ui";
import { CLUB_CONFIG } from "@/lib/club-config";
import { check, clubInfoQuery } from "@/lib/club-data";
import { canManageClubData } from "@/lib/ranks";
import { EditableField, EditableRecordImage, EditableText } from "@/components/club/site-editor";

export const Route = createFileRoute("/club-info")({
  head: () => ({
    meta: [
      { title: "Club Information — The Teals F.C." },
      { name: "description", content: "History, home ground, training schedule, kits and contact details of The Teals F.C." },
      { property: "og:title", content: "Club Information — The Teals F.C." },
      { property: "og:description", content: "Our history, facilities, matchday home and organisational roots." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(clubInfoQuery),
  component: ClubInfoPage,
});

function ClubInfoPage() {
  const { profile } = useAuth();
  const canEdit = profile ? canManageClubData(profile.role) : false;
  const { data: info } = useSuspenseQuery(clubInfoQuery);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    motto: "",
    about: "",
    history: "",
    home_ground: "",
    contact_email: "",
    contact_phone: "",
    training_schedule: "",
  });

  function startEdit() {
    setForm({
      name: info?.name ?? CLUB_CONFIG.name,
      motto: info?.motto ?? "",
      about: info?.about ?? "",
      history: info?.history ?? "",
      home_ground: info?.home_ground ?? "",
      contact_email: info?.contact_email ?? "",
      contact_phone: info?.contact_phone ?? "",
      training_schedule: info?.training_schedule ?? "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      check(await supabase.from("club_info").update({ ...form, updated_at: new Date().toISOString() }).eq("id", "main"));
      toast.success("Club information updated successfully!");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: clubInfoQuery.queryKey });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="animate-fade-up space-y-10 pb-16">
      <PageHeader
        contentKey="club-info"
        eyebrow="Identity & Heritage"
        icon="🛡"
        title="Club Information"
        subtitle="Our history, facilities, matchday home, and organizational roots."
        actions={
          canEdit ? (
            <Button variant="hero" onClick={startEdit}>
              ✎ Edit Information
            </Button>
          ) : (
            <PermissionNote>
              Editing enabled for <strong className="text-primary">Admin+</strong>
            </PermissionNote>
          )
        }
      />

      <section className="panel-glow flex flex-col items-center gap-8 p-8 md:flex-row">
        <div className="flex h-40 w-40 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-deep p-4">
          <EditableRecordImage table="club_info" id="main" column="logo_url" queryKey={clubInfoQuery.queryKey} label="club crest" src={info?.logo_url || CLUB_CONFIG.logoUrl} alt={`${info?.name} crest`} className="drop-glow h-full w-full object-contain" />
        </div>
        <div className="space-y-3 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
<EditableField as="h2" table="club_info" id="main" column="name" queryKey={clubInfoQuery.queryKey} label="club name" value={info?.name || CLUB_CONFIG.name} className="page-title text-3xl sm:text-4xl" />
            <span className="chip tone-teal rounded">Est. {CLUB_CONFIG.foundedYear}</span>
          </div>
<p className="text-base font-semibold italic text-primary">
            "<EditableField as="span" table="club_info" id="main" column="motto" queryKey={clubInfoQuery.queryKey} label="club motto" value={info?.motto || CLUB_CONFIG.motto} className="" />"
          </p>
          <EditableField as="p" kind="multiline" table="club_info" id="main" column="about" queryKey={clubInfoQuery.queryKey} label="club summary" value={info?.about} className="block max-w-2xl text-sm leading-relaxed text-secondary-foreground" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="panel space-y-3 p-6">
          <div className="eyebrow text-sm">📜 Our History & Founding</div>
<EditableField as="p" kind="multiline" table="club_info" id="main" column="history" queryKey={clubInfoQuery.queryKey} label="club history" value={info?.history} className="block text-sm leading-relaxed text-secondary-foreground" />
        </div>
        <div className="panel space-y-3 p-6">
          <EditableText as="div" k="club-info.philosophy.title" fallback="⚡ Tactical Philosophy" label="heading" className="eyebrow text-sm" />
          <EditableText
            as="p"
            multiline
            k="club-info.philosophy.text"
            fallback="Our game is structured on the 4 pillars: Freedom (trusting players' natural flair), Aggression (energetic and proactive ball hunting), Teamwork (continuous passing support), and Intelligent Movement (space creation and tiki-taka)."
            label="tactical philosophy"
            className="block text-sm leading-relaxed text-secondary-foreground"
          />
        </div>
      </section>

      <section className="panel-glow space-y-6 p-8">
        <h3 className="page-title text-2xl">🏟 Grounds & Training Schedule</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="panel-deep space-y-2 p-5">
            <span className="eyebrow">Matchday Stadium</span>
<EditableField as="div" table="club_info" id="main" column="home_ground" queryKey={clubInfoQuery.queryKey} label="home ground" value={info?.home_ground} className="block text-base font-bold" />
            <p className="text-xs text-muted-foreground">Natural grass pitch with floodlights and spectator seating.</p>
          </div>
          <div className="panel-deep space-y-2 p-5">
            <span className="eyebrow">Weekly Training Times</span>
<EditableField as="div" table="club_info" id="main" column="training_schedule" queryKey={clubInfoQuery.queryKey} label="training schedule" value={info?.training_schedule} className="block text-base font-bold" />
            <p className="text-xs text-muted-foreground">Tactics drills, corner defense sets, and fitness conditioning.</p>
          </div>
          <div className="panel-deep space-y-2 p-5">
            <span className="eyebrow">Official Club Inquiries</span>
<EditableField as="div" table="club_info" id="main" column="contact_email" queryKey={clubInfoQuery.queryKey} label="contact email" value={info?.contact_email} className="block break-all text-base font-bold" />
            <p className="text-xs text-muted-foreground">
              Phone: <EditableField as="span" table="club_info" id="main" column="contact_phone" queryKey={clubInfoQuery.queryKey} label="contact phone" value={info?.contact_phone} className="" />
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center gap-8 rounded-3xl border border-primary/25 bg-deep p-8 shadow-2xl lg:flex-row">
        <div className="flex w-full items-center justify-center rounded-2xl border border-primary/20 bg-surface/70 p-6 lg:w-1/2">
          <EditableRecordImage table="club_info" id="main" column="kits_url" queryKey={clubInfoQuery.queryKey} label="kits picture" src={info?.kits_url || CLUB_CONFIG.kitsUrl} alt="The Teals F.C. kits" className="max-h-80 object-contain" />
        </div>
        <div className="w-full space-y-4 lg:w-1/2">
          <EditableText k="club-info.kits.badge" fallback="Season 2024/25 Kits" label="kits badge" className="chip tone-teal px-3 py-1 text-xs" />
          <EditableText as="h3" k="club-info.kits.title" fallback="The Colors of The Teals" label="kits heading" className="page-title text-3xl" />
          <EditableText
            as="p"
            multiline
            k="club-info.kits.text"
            fallback="Both kits proudly feature our official sponsor wadzeck and our geometric four-petal diamond crest."
            label="kits description"
            className="block text-sm leading-relaxed text-secondary-foreground"
          />
          <ul className="space-y-2 text-xs text-secondary-foreground">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border border-primary bg-deep" />
              <EditableText k="club-info.kits.home" fallback="Home: Stealth Black with precision laser-teal pinstripes." label="home kit line" />
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border border-primary bg-chalk" />
              <EditableText k="club-info.kits.away" fallback="Away: Arctic White with contrast teal raglan sleeves." label="away kit line" />
            </li>
          </ul>
        </div>
      </section>

      <section className="bg-banner flex flex-col items-center justify-between gap-6 rounded-3xl border border-primary/30 p-6 shadow-xl sm:flex-row sm:p-8">
        <div className="space-y-1.5 text-center sm:text-left">
          <EditableText as="div" k="club-info.staff.eyebrow" fallback="🩵 Staff & Executive Board" label="small heading" className="eyebrow" />
          <EditableText as="h3" k="club-info.staff.title" fallback="The Teals F.C. Leadership" label="heading" className="page-title text-2xl" />
          <EditableText
            as="p"
            multiline
            k="club-info.staff.text"
            fallback="Explore our organizational structure: Chairman & Manager Ryhaan, Web Developer Henil, Vice Chairman Abhivan.P, Director of Football Faizan, Team Heads Advik & Josiah, and Performance & Journalism Chiefs."
            label="leadership text"
            className="block max-w-xl text-xs text-secondary-foreground"
          />
        </div>
        <Button asChild variant="hero" size="lg" className="flex-shrink-0">
          <Link to="/staff">View Staff Info ➔</Link>
        </Button>
      </section>

      <ClubDialog open={open} onOpenChange={setOpen} title="Edit Club Information">
        <form onSubmit={save} className="space-y-3.5">
          <Field label="Club Name">
            <input className="field" value={form.name} onChange={set("name")} required maxLength={100} />
          </Field>
          <Field label="Club Motto">
            <input className="field" value={form.motto} onChange={set("motto")} maxLength={200} />
          </Field>
          <Field label="About Summary">
            <textarea className="field" rows={3} value={form.about} onChange={set("about")} maxLength={2000} />
          </Field>
          <Field label="Club History">
            <textarea className="field" rows={3} value={form.history} onChange={set("history")} maxLength={3000} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Home Ground">
              <input className="field" value={form.home_ground} onChange={set("home_ground")} maxLength={200} />
            </Field>
            <Field label="Contact Email">
              <input className="field" type="email" value={form.contact_email} onChange={set("contact_email")} maxLength={200} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Phone">
              <input className="field" value={form.contact_phone} onChange={set("contact_phone")} maxLength={60} />
            </Field>
            <Field label="Training Schedule">
              <input className="field" value={form.training_schedule} onChange={set("training_schedule")} maxLength={200} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="club" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={busy}>
              {busy ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </ClubDialog>
    </div>
  );
}
