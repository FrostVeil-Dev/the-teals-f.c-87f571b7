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
import { check, fixturesQuery, leagueStatsQuery, splitFixtures, today } from "@/lib/club-data";
import { canManageClubData } from "@/lib/ranks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/matchday")({
  head: () => ({
    meta: [
      { title: "Matchday Central — The Teals F.C." },
      { name: "description", content: "Fixtures, results with goalscorers and assists, and the league standings of The Teals F.C." },
      { property: "og:title", content: "Matchday Central — The Teals F.C." },
      { property: "og:description", content: "Official league schedule, past performances and points table." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(fixturesQuery),
      context.queryClient.ensureQueryData(leagueStatsQuery),
    ]),
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
  const { data: stats } = useSuspenseQuery(leagueStatsQuery);
  const { upcoming, results } = splitFixtures(fixtures);
  const queryClient = useQueryClient();
  const [fixOpen, setFixOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fix, setFix] = useState(emptyFixture);
  const [res, setRes] = useState(emptyResult);
  const form = results.slice(0, 5).map((r) => r.outcome ?? "D");

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
        eyebrow="Fixtures, Scores & Standings"
        icon="⚽"
        title="Matchday Central"
        subtitle="Official league schedule, past performances, goalscorers, and points table."
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

      <section className="panel-glow space-y-4 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="page-title text-2xl">🏆 League Standings Snapshot</h2>
          <Chip tone="teal" className="px-3 py-1 text-xs">
            Position: {stats?.position}
          </Chip>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3">Club</th>
                <th className="px-2 py-3 text-center">PLD</th>
                <th className="px-2 py-3 text-center text-primary">W</th>
                <th className="px-2 py-3 text-center text-amber">D</th>
                <th className="px-2 py-3 text-center text-destructive">L</th>
                <th className="px-2 py-3 text-center">GF</th>
                <th className="px-2 py-3 text-center">GA</th>
                <th className="px-2 py-3 text-center">GD</th>
                <th className="px-3 py-3 text-center font-black text-primary">PTS</th>
                <th className="px-3 py-3 text-center">Form</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-l-4 border-primary bg-primary/10 font-bold">
                <td className="flex items-center gap-2 px-3 py-3">
                  <img src={CLUB_CONFIG.logoUrl} alt="" className="h-5 w-5 object-contain" />
                  <span>{CLUB_CONFIG.name}</span>
                </td>
                <td className="px-2 py-3 text-center">{stats?.played}</td>
                <td className="px-2 py-3 text-center text-primary">{stats?.won}</td>
                <td className="px-2 py-3 text-center text-amber">{stats?.drawn}</td>
                <td className="px-2 py-3 text-center text-muted-foreground">{stats?.lost}</td>
                <td className="px-2 py-3 text-center">{stats?.goals_for}</td>
                <td className="px-2 py-3 text-center">{stats?.goals_against}</td>
                <td className="px-2 py-3 text-center text-primary">+{stats?.goal_difference}</td>
                <td className="px-3 py-3 text-center text-base font-black text-primary">{stats?.points}</td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex gap-1">
                    {form.map((o, i) => (
                      <span
                        key={i}
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-primary-foreground",
                          o === "W" ? "bg-success" : o === "D" ? "bg-amber" : "bg-destructive",
                        )}
                      >
                        {o}
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="page-title text-2xl">📅 Upcoming Matches</h2>
          <span className="text-xs text-muted-foreground">{upcoming.length} fixture(s) scheduled</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {upcoming.length === 0 && <EmptyState title="No upcoming fixtures scheduled yet." />}
          {upcoming.map((f) => (
            <div key={f.id} className="panel flex flex-col justify-between space-y-4 p-5 transition-colors hover:border-primary/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-bold text-primary">{f.competition}</span>
                <span className="rounded bg-deep px-2 py-0.5 font-medium">
                  {f.date} • {f.time}
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
                  <span className="text-xs font-black">{f.opponent}</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="truncate">📍 {f.venue}</span>
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
          <h2 className="page-title text-2xl">🏁 Past Match Results</h2>
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
                    <span className="font-bold text-primary">{r.competition}</span>
                    <span>•</span>
                    <span>{r.date}</span>
                  </div>
                  <Chip tone={tone}>{r.outcome === "W" ? "Victory (W)" : r.outcome === "D" ? "Draw (D)" : "Defeat (L)"}</Chip>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-3">
                    <img src={CLUB_CONFIG.logoUrl} alt="" className="h-8 w-8 object-contain" />
                    <span className="hidden text-base font-bold sm:inline">{CLUB_CONFIG.name}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-deep px-4 py-1.5 font-display text-3xl font-black tracking-wider">
                    <span className="text-primary">{r.team_score}</span>
                    <span className="mx-2 text-muted-foreground">-</span>
                    <span>{r.opponent_score}</span>
                  </div>
                  <span className="text-right text-base font-bold">{r.opponent}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="mb-0.5 block text-[10px] font-bold uppercase text-muted-foreground">Goalscorers:</span>
                    <span className="font-medium text-primary">{r.scorers || "None recorded"}</span>
                  </div>
                  <div>
                    <span className="mb-0.5 block text-[10px] font-bold uppercase text-muted-foreground">Assists:</span>
                    <span className="font-medium text-secondary-foreground">{r.assists || "None recorded"}</span>
                  </div>
                </div>
                {r.report && (
                  <div className="panel-deep p-3.5 text-xs leading-relaxed text-secondary-foreground">
                    <strong className="mb-1 block text-primary">Match Analysis:</strong>
                    {r.report}
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
