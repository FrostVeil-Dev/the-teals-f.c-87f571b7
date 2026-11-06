import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Chip, ClubDialog, EmptyState, Field, PageHeader, PermissionNote } from "@/components/club/ui";
import { CLUB_CONFIG } from "@/lib/club-config";
import { check, fixturesQuery, splitFixtures, today } from "@/lib/club-data";
import { canManageClubData } from "@/lib/ranks";
import { EditableField, EditableText } from "@/components/club/site-editor";

export const Route = createFileRoute("/matchday")({
  head: () => ({
    meta: [
      { title: "Matchday Central — The Teals F.C." },
      { name: "description", content: "Upcoming fixtures and past results with goalscorers and assists for The Teals F.C." },
      { property: "og:title", content: "Matchday Central — The Teals F.C." },
      { property: "og:description", content: "Official league schedule and past performances." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fixturesQuery),
  component: MatchdayPage,
});

const emptyFixture: { opponent: string; date: string; time: string; venue: string; competition: string } = {
  opponent: "",
  date: "",
  time: "16:30",
  venue: CLUB_CONFIG.homeGround,
  competition: "Premier School League",
};
const emptyResult = { opponent: "", date: "", teamScore: "3", oppScore: "1", scorers: "", assists: "", report: "" };

function MatchdayPage() {
  const { profile } = useAuth();
  const canEdit = profile ? canManageClubData(profile.role) : false;
  const { data: fixtures } = useSuspenseQuery(fixturesQuery);
  const { upcoming, results } = splitFixtures(fixtures);
  const queryClient = useQueryClient();
  const [fixOpen, setFixOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fix, setFix] = useState(emptyFixture);
  const [res, setRes] = useState(emptyResult);

  const refresh = () => queryClient.invalidateQueries({ queryKey: fixturesQuery.queryKey });

  async function addFixture(e: React.FormEvent) {
    e.preventDefault();
    if (!fix.opponent.trim()) {
      toast.error("Please enter the opponent team name");
      return;
    }
    setBusy(true);
    try {
      check(
        await supabase.from("fixtures").insert({
          type: "upcoming",
          opponent: fix.opponent.trim(),
          date: fix.date || today(),
          time: fix.time,
          venue: fix.venue.trim(),
          competition: fix.competition.trim() || "League Match",
          status: "Upcoming",
          opponent_logo: fix.opponent.trim().slice(0, 2).toUpperCase(),
        }),
      );
      toast.success("Fixture scheduled!");
      setFixOpen(false);
      setFix(emptyFixture);
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addResult(e: React.FormEvent) {
    e.preventDefault();
    if (!res.opponent.trim()) {
      toast.error("Please enter opponent name");
      return;
    }
    const teamScore = parseInt(res.teamScore, 10) || 0;
    const opponentScore = parseInt(res.oppScore, 10) || 0;
    setBusy(true);
    try {
      check(
        await supabase.from("fixtures").insert({
          type: "result",
          opponent: res.opponent.trim(),
          date: res.date || today(),
          team_score: teamScore,
          opponent_score: opponentScore,
          outcome: teamScore > opponentScore ? "W" : teamScore === opponentScore ? "D" : "L",
          scorers: res.scorers.trim(),
          assists: res.assists.trim(),
          report: res.report.trim(),
          venue: CLUB_CONFIG.homeGround,
          competition: "Premier School League",
        }),
      );
      toast.success("Match result saved!");
      setResOpen(false);
      setRes(emptyResult);
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this fixture or result?")) return;
    try {
      check(await supabase.from("fixtures").delete().eq("id", id));
      toast.info("Entry deleted");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="animate-fade-up space-y-10 pb-16">
      <PageHeader
        contentKey="matchday"
        eyebrow="Fixtures & Scores"
        icon="⚽"
        title="Matchday Central"
        subtitle="Official league schedule, past performances and goalscorers."
        actions={
          canEdit ? (
            <div className="flex items-center gap-2">
              <Button variant="hero" onClick={() => setFixOpen(true)}>
                + Add Fixture
              </Button>
              <Button variant="club" onClick={() => setResOpen(true)}>
                + Record Result
              </Button>
            </div>
          ) : (
            <PermissionNote>
              Schedule management for <strong className="text-primary">Admin+</strong>
            </PermissionNote>
          )
        }
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
<EditableText as="h2" k="matchday.upcoming.title" fallback="📅 Upcoming Matches" label="heading" className="page-title text-2xl" />
          <span className="text-xs text-muted-foreground">{upcoming.length} fixture(s) scheduled</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {upcoming.length === 0 && <EmptyState title="No upcoming fixtures scheduled yet." />}
          {upcoming.map((f) => (
            <div key={f.id} className="panel flex flex-col justify-between space-y-4 p-5 transition-colors hover:border-primary/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <EditableField as="span" table="fixtures" id={f.id} column="competition" queryKey={fixturesQuery.queryKey} label="competition" value={f.competition} className="font-bold text-primary" />
                <span className="rounded bg-deep px-2 py-0.5 font-medium">
                  <EditableField as="span" table="fixtures" id={f.id} column="date" queryKey={fixturesQuery.queryKey} label="date (YYYY-MM-DD)" value={f.date} /> • <EditableField as="span" table="fixtures" id={f.id} column="time" queryKey={fixturesQuery.queryKey} label="kick-off time" value={f.time} />
                </span>
              </div>
              <div className="flex items-center justify-around py-2">
                <div className="text-center">
                  <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-deep p-1">
                    <img src={CLUB_CONFIG.logoUrl} alt="" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-xs font-black">{CLUB_CONFIG.shortName}</span>
                </div>
                <div className="rounded-lg border border-border bg-deep px-3 py-1 text-xs font-black text-primary">VS</div>
                <div className="text-center">
                  <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-deep font-display text-lg font-black">
                    {f.opponent_logo || f.opponent.slice(0, 2).toUpperCase()}
                  </div>
                  <EditableField as="span" table="fixtures" id={f.id} column="opponent" queryKey={fixturesQuery.queryKey} label="opponent name" value={f.opponent} className="text-xs font-black" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="truncate">
                  📍 <EditableField as="span" table="fixtures" id={f.id} column="venue" queryKey={fixturesQuery.queryKey} label="venue" value={f.venue} />
                </span>
                {canEdit && (
                  <button onClick={() => remove(f.id)} className="p-1 hover:text-destructive" aria-label="Delete fixture">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
<EditableText as="h2" k="matchday.results.title" fallback="🏁 Past Match Results" label="heading" className="page-title text-2xl" />
          <span className="text-xs text-muted-foreground">{results.length} result(s)</span>
        </div>
        <div className="space-y-4">
          {results.length === 0 && <EmptyState title="No match results recorded yet." />}
          {results.map((r) => {
            const tone = r.outcome === "W" ? "emerald" : r.outcome === "D" ? "amber" : "rose";
            return (
              <div key={r.id} className="panel space-y-4 p-6 transition-colors hover:border-primary/30">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <EditableField as="span" table="fixtures" id={r.id} column="competition" queryKey={fixturesQuery.queryKey} label="competition" value={r.competition} className="font-bold text-primary" />
                    <span>•</span>
                    <EditableField as="span" table="fixtures" id={r.id} column="date" queryKey={fixturesQuery.queryKey} label="date (YYYY-MM-DD)" value={r.date} />
                  </div>
                  <Chip tone={tone}>{r.outcome === "W" ? "Victory (W)" : r.outcome === "D" ? "Draw (D)" : "Defeat (L)"}</Chip>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-3">
                    <img src={CLUB_CONFIG.logoUrl} alt="" className="h-8 w-8 object-contain" />
                    <span className="hidden text-base font-bold sm:inline">{CLUB_CONFIG.name}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-deep px-4 py-1.5 font-display text-3xl font-black tracking-wider">
                    <EditableField as="span" kind="number" table="fixtures" id={r.id} column="team_score" queryKey={fixturesQuery.queryKey} label="our score" value={r.team_score} className="text-primary" />
                    <span className="mx-2 text-muted-foreground">-</span>
                    <EditableField as="span" kind="number" table="fixtures" id={r.id} column="opponent_score" queryKey={fixturesQuery.queryKey} label="opponent score" value={r.opponent_score} />
                  </div>
                  <EditableField as="span" table="fixtures" id={r.id} column="opponent" queryKey={fixturesQuery.queryKey} label="opponent name" value={r.opponent} className="text-right text-base font-bold" />
                </div>
                <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="mb-0.5 block text-[10px] font-bold uppercase text-muted-foreground">Goalscorers:</span>
                    <EditableField as="span" table="fixtures" id={r.id} column="scorers" queryKey={fixturesQuery.queryKey} label="goalscorers" value={r.scorers || "None recorded"} className="font-medium text-primary" />
                  </div>
                  <div>
                    <span className="mb-0.5 block text-[10px] font-bold uppercase text-muted-foreground">Assists:</span>
                    <EditableField as="span" table="fixtures" id={r.id} column="assists" queryKey={fixturesQuery.queryKey} label="assists" value={r.assists || "None recorded"} className="font-medium text-secondary-foreground" />
                  </div>
                </div>
                {r.report && (
                  <div className="panel-deep p-3.5 text-xs leading-relaxed text-secondary-foreground">
                    <strong className="mb-1 block text-primary">Match Analysis:</strong>
                    <EditableField as="span" kind="multiline" table="fixtures" id={r.id} column="report" queryKey={fixturesQuery.queryKey} label="match report" value={r.report} />
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span>📍 {r.venue || CLUB_CONFIG.homeGround}</span>
                  {canEdit && (
                    <button onClick={() => remove(r.id)} className="flex items-center gap-1 p-1 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <ClubDialog open={fixOpen} onOpenChange={setFixOpen} title="Add Upcoming Match Fixture">
        <form onSubmit={addFixture} className="space-y-3.5">
          <Field label="Opponent Club *">
            <input className="field" required maxLength={120} value={fix.opponent} onChange={(e) => setFix({ ...fix, opponent: e.target.value })} placeholder="e.g. Phoenix FC" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Match Date *">
              <input className="field" type="date" required value={fix.date || today()} onChange={(e) => setFix({ ...fix, date: e.target.value })} />
            </Field>
            <Field label="Kick-off Time *">
              <input className="field" type="time" required value={fix.time} onChange={(e) => setFix({ ...fix, time: e.target.value })} />
            </Field>
          </div>
          <Field label="Venue *">
            <input className="field" required maxLength={200} value={fix.venue} onChange={(e) => setFix({ ...fix, venue: e.target.value })} />
          </Field>
          <Field label="Competition">
            <input className="field" maxLength={120} value={fix.competition} onChange={(e) => setFix({ ...fix, competition: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="club" onClick={() => setFixOpen(false)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={busy}>Schedule Fixture</Button>
          </div>
        </form>
      </ClubDialog>

      <ClubDialog open={resOpen} onOpenChange={setResOpen} title="Record Match Result">
        <form onSubmit={addResult} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opponent Club *">
              <input className="field" required maxLength={120} value={res.opponent} onChange={(e) => setRes({ ...res, opponent: e.target.value })} placeholder="e.g. Apex Warriors" />
            </Field>
            <Field label="Match Date">
              <input className="field" type="date" value={res.date || today()} onChange={(e) => setRes({ ...res, date: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="The Teals FC Goals *">
              <input className="field" type="number" min={0} max={99} value={res.teamScore} onChange={(e) => setRes({ ...res, teamScore: e.target.value })} />
            </Field>
            <Field label="Opponent Goals *">
              <input className="field" type="number" min={0} max={99} value={res.oppScore} onChange={(e) => setRes({ ...res, oppScore: e.target.value })} />
            </Field>
          </div>
          <Field label="Goalscorers (with minutes)">
            <input className="field" maxLength={500} value={res.scorers} onChange={(e) => setRes({ ...res, scorers: e.target.value })} placeholder="e.g. Henil (12', 45'), Ayaan (67')" />
          </Field>
          <Field label="Assists">
            <input className="field" maxLength={500} value={res.assists} onChange={(e) => setRes({ ...res, assists: e.target.value })} placeholder="e.g. Hani (2), Faizan (1)" />
          </Field>
          <Field label="Match Report / Tactical Notes">
            <textarea className="field" rows={3} maxLength={3000} value={res.report} onChange={(e) => setRes({ ...res, report: e.target.value })} placeholder="Summary of the match performance..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="club" onClick={() => setResOpen(false)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={busy}>Save Result</Button>
          </div>
        </form>
      </ClubDialog>
    </div>
  );
}
