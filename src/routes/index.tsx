import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RankBadge } from "@/components/club/ui";
import { openCoachTeal } from "@/components/club/coach-teal";
import { CLUB_CONFIG } from "@/lib/club-config";
import { EditableField, EditableRecordImage, EditableText } from "@/components/club/site-editor";
import { announcementsQuery, clubInfoQuery, fixturesQuery, leagueStatsQuery, splitFixtures } from "@/lib/club-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Teals F.C. — Official Club Portal" },
      {
        name: "description",
        content: "Home of The Teals F.C.: next fixture, latest results, league standing, official kits and club announcements.",
      },
      { property: "og:title", content: "The Teals F.C. — Official Club Portal" },
      { property: "og:description", content: "Freedom, Aggression, Teamwork & Intelligent Movement. Fixtures, squad, playbook and more." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(clubInfoQuery),
      context.queryClient.ensureQueryData(announcementsQuery),
      context.queryClient.ensureQueryData(fixturesQuery),
      context.queryClient.ensureQueryData(leagueStatsQuery),
    ]),
  component: HomePage,
});

function HomePage() {
  const { data: clubInfo } = useSuspenseQuery(clubInfoQuery);
  const { data: announcements } = useSuspenseQuery(announcementsQuery);
  const { data: fixtures } = useSuspenseQuery(fixturesQuery);
  const { data: stats } = useSuspenseQuery(leagueStatsQuery);
  const { upcoming, results } = splitFixtures(fixtures);
  const next = upcoming[0];
  const last = results[0];
  const latestAnn = announcements[0];
  const outcome = last ? (last.outcome === "W" ? "Victory" : last.outcome === "D" ? "Draw" : "Defeat") : "—";

  return (
    <div className="animate-fade-up space-y-12 pb-16">
      {/* HERO */}
      <section className="bg-hero relative overflow-hidden rounded-3xl border border-primary/30 p-6 shadow-2xl sm:p-10 lg:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-violet/10 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center justify-between gap-8 lg:flex-row">
          <div className="max-w-2xl space-y-4 text-center lg:text-left">
            <div className="chip tone-teal px-3 py-1 text-xs">
              <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
              <EditableText k="home.hero.badge" fallback="Official Club Portal • Season 2024/25" label="hero badge" />
            </div>
            <h1 className="page-title text-5xl sm:text-7xl lg:text-8xl">
              <EditableText k="home.hero.title1" fallback="The" label="hero title (part 1)" />{" "}
              <EditableText k="home.hero.title2" fallback="Teals" label="hero title (highlight)" className="text-glow text-primary" />{" "}
              <EditableText k="home.hero.title3" fallback="F.C." label="hero title (part 3)" />
            </h1>
            <p className="border-primary text-base font-medium italic text-secondary-foreground sm:text-lg lg:border-l-4 lg:pl-4">
              "
              <EditableField table="club_info" id="main" column="motto" queryKey={clubInfoQuery.queryKey} label="club motto" value={clubInfo?.motto || CLUB_CONFIG.motto} />
              "
            </p>
            <EditableField
              as="p"
              kind="multiline"
              table="club_info"
              id="main"
              column="about"
              queryKey={clubInfoQuery.queryKey}
              label="club summary"
              value={clubInfo?.about}
              className="block max-w-xl text-sm leading-relaxed text-muted-foreground"
            />
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 lg:justify-start">
              <Button asChild variant="hero" size="lg">
                <Link to="/playbook">
                  <EditableText k="home.btn.playbook" fallback="Tactical Playbook" label="button text" /> <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="club" size="lg">
                <Link to="/matchday">
                  <EditableText k="home.btn.matchday" fallback="Matchday & Results" label="button text" />
                </Link>
              </Button>
              <Button asChild variant="soft" size="lg">
                <Link to="/team-chat">
                  <EditableText k="home.btn.chat" fallback="💬 Team Chat" label="button text" />
                </Link>
              </Button>
              <Button asChild variant="cyan" size="lg">
                <Link to="/staff">
                  <EditableText k="home.btn.staff" fallback="🩵 Staff Info" label="button text" />
                </Link>
              </Button>
              <Button variant="violet" size="lg" onClick={openCoachTeal}>
                <EditableText k="home.btn.coach" fallback="✨ Ask Coach Teal AI" label="button text" />
              </Button>
            </div>
          </div>
          <div className="group relative flex h-48 w-48 flex-shrink-0 items-center justify-center rounded-3xl border border-primary/30 bg-deep/80 p-4 shadow-2xl sm:h-64 sm:w-64">
            <EditableRecordImage
              table="club_info"
              id="main"
              column="logo_url"
              queryKey={clubInfoQuery.queryKey}
              label="official crest"
              src={clubInfo?.logo_url || CLUB_CONFIG.logoUrl}
              alt={`${CLUB_CONFIG.name} crest`}
              className="drop-glow h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <EditableText as="div" k="home.hero.crestLabel" fallback="Official Crest" label="crest label" className="chip tone-teal absolute bottom-2 bg-surface/90 text-[10px]" />
          </div>
        </div>
      </section>

      {/* QUICK STATS */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="panel flex flex-col justify-between border-primary/20 p-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="eyebrow">League Standing</span>
            <span className="chip tone-teal rounded">Rank {stats?.position}</span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-border py-4 text-center">
            {[
              ["Played", stats?.played, "text-foreground"],
              ["Won", stats?.won, "text-primary"],
              ["Draw", stats?.drawn, "text-amber"],
              ["Points", stats?.points, "text-primary"],
            ].map(([label, value, color]) => (
              <div key={label as string}>
                <div className={`font-display text-3xl font-extrabold ${color}`}>{value}</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              Goal Difference: <strong className="text-primary">+{stats?.goal_difference}</strong>
            </span>
            <Link to="/matchday" className="font-bold text-primary hover:text-primary/80">
              Full Table ➔
            </Link>
          </div>
        </div>

        <div className="panel flex flex-col justify-between border-primary/20 p-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="eyebrow">Next Fixture</span>
            <span className="chip tone-violet rounded">{next?.status || "Upcoming"}</span>
          </div>
          {next ? (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-center">
                <div className="font-display text-lg font-extrabold text-primary">{CLUB_CONFIG.shortName}</div>
                <div className="text-[10px] font-bold text-muted-foreground">{next.date}</div>
              </div>
              <div className="rounded-lg border border-primary/30 bg-deep px-3 py-1 text-center">
                <span className="text-xs font-black text-primary">VS</span>
                <div className="text-[10px] font-semibold text-muted-foreground">{next.time}</div>
              </div>
              <div className="text-center">
                <div className="font-display text-lg font-extrabold">{next.opponent}</div>
                <div className="text-[10px] font-bold text-muted-foreground">{next.competition}</div>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No fixtures scheduled yet.</p>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="truncate">{next?.venue || CLUB_CONFIG.homeGround}</span>
            <Link to="/matchday" className="flex-shrink-0 font-bold text-primary hover:text-primary/80">
              Match Details ➔
            </Link>
          </div>
        </div>

        <div className="panel flex flex-col justify-between border-primary/20 p-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="eyebrow">Latest Result</span>
            <span className={`chip rounded ${last?.outcome === "W" ? "tone-emerald" : last?.outcome === "D" ? "tone-amber" : "tone-danger"}`}>
              {outcome}
            </span>
          </div>
          {last ? (
            <div className="py-3 text-center">
              <div className="font-display text-4xl font-extrabold tracking-wider">
                <span className="text-primary">{last.team_score}</span>
                <span className="mx-2 text-muted-foreground">-</span>
                <span>{last.opponent_score}</span>
              </div>
              <div className="mt-1 text-xs font-semibold text-secondary-foreground">vs {last.opponent}</div>
              <div className="mt-1 truncate text-[11px] text-primary/90">{last.scorers}</div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No results recorded yet.</p>
          )}
          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>{last?.date}</span>
            <Link to="/matchday" className="font-bold text-primary hover:text-primary/80">
              Match Report ➔
            </Link>
          </div>
        </div>
      </section>

      {/* KITS */}
      <section className="rounded-3xl border border-primary/25 bg-deep/70 p-6 shadow-xl sm:p-8 lg:p-10">
        <div className="flex flex-col items-center gap-8 lg:flex-row">
          <div className="flex w-full items-center justify-center rounded-2xl border border-primary/20 bg-surface/60 p-4 lg:w-1/2">
            <EditableRecordImage
              table="club_info"
              id="main"
              column="kits_url"
              queryKey={clubInfoQuery.queryKey}
              label="kits picture"
              src={clubInfo?.kits_url || CLUB_CONFIG.kitsUrl}
              alt="The Teals F.C. home and away kits"
              className="max-h-80 w-auto object-contain"
            />
          </div>
          <div className="w-full space-y-4 lg:w-1/2">
            <EditableText k="home.kits.badge" fallback="Official 2024/25 Match Strips" label="kits badge" className="chip tone-teal px-3 py-1 text-xs" />
            <EditableText as="h2" k="home.kits.title" fallback="Engineered For Speed & Dominance" label="kits heading" className="page-title text-3xl sm:text-4xl" />
            <div className="space-y-3 text-sm leading-relaxed text-secondary-foreground">
              <div className="panel-deep p-3.5">
                <EditableText k="home.kits.homeTitle" fallback="⚫ Home Kit (Pitch Black & Teal Pinstripes)" label="home kit title" className="mb-1 block font-bold text-primary" />
                <EditableText
                  k="home.kits.homeText"
                  multiline
                  fallback="Crafted in stealth matte black with vertical laser-teal stripes and teal collar trim. Front sponsor: wadzeck."
                  label="home kit description"
                />
              </div>
              <div className="panel-deep p-3.5">
                <EditableText k="home.kits.awayTitle" fallback="⚪ Away Kit (Pure White & Teal Raglan)" label="away kit title" className="mb-1 block font-bold text-foreground" />
                <EditableText
                  k="home.kits.awayText"
                  multiline
                  fallback="A clean, crisp white chassis paired with deep teal raglan shoulders and sleeve accents. High breathability for hot matchday battles."
                  label="away kit description"
                />
              </div>
            </div>
            <Button asChild variant="soft">
              <Link to="/members">
                <EditableText k="home.kits.button" fallback="View Squad & Jerseys ➔" label="button text" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY BANNER */}
      <section className="bg-banner flex flex-col items-center justify-between gap-6 rounded-3xl border border-primary/30 p-6 shadow-xl sm:p-8 md:flex-row">
        <div className="space-y-2">
          <EditableText as="div" k="home.philosophy.eyebrow" fallback="⚽ Team Tactical Philosophy" label="small heading" className="eyebrow" />
          <EditableText
            as="h3"
            k="home.philosophy.title"
            fallback={'"Freedom with Responsibility • Pass and Move • Tiki-Taka"'}
            label="philosophy heading"
            className="page-title text-2xl sm:text-3xl"
          />
          <EditableText
            as="p"
            multiline
            k="home.philosophy.text"
            fallback="Detailed in our team playbook: The Ryhaan-Ayaan-Henil attacking trident, Hani's midfield engine, and the Faraz-Johan defensive wall."
            label="philosophy text"
            className="block max-w-2xl text-sm text-secondary-foreground"
          />
        </div>
        <Button asChild variant="hero" size="lg" className="flex-shrink-0">
          <Link to="/playbook">
            <EditableText k="home.philosophy.button" fallback="Open Formation Board ➔" label="button text" />
          </Link>
        </Button>
      </section>

      {/* LATEST ANNOUNCEMENT */}
      {latestAnn && (
        <section className="panel-glow space-y-4 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black uppercase text-primary-foreground">
                Latest Announcement
              </span>
              <span className="text-xs text-muted-foreground">{latestAnn.date}</span>
            </div>
            <Link to="/announcements" className="text-xs font-bold text-primary hover:text-primary/80">
              View All ➔
            </Link>
          </div>
          <EditableField
            as="h3"
            table="announcements"
            id={latestAnn.id}
            column="title"
            queryKey={announcementsQuery.queryKey}
            label="announcement title"
            value={latestAnn.title}
            className="block font-display text-2xl font-bold"
          />
          <EditableField
            as="p"
            kind="multiline"
            table="announcements"
            id={latestAnn.id}
            column="text"
            queryKey={announcementsQuery.queryKey}
            label="announcement text"
            value={latestAnn.text}
            className="block whitespace-pre-line text-sm leading-relaxed text-secondary-foreground"
          />
          <div className="flex items-center gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
            <span>Posted by:</span>
            <strong className="text-foreground">{latestAnn.author}</strong>
            <RankBadge role={latestAnn.author_role} />
          </div>
        </section>
      )}
    </div>
  );
}
