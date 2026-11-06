import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type ClubInfo = Tables["club_info"]["Row"];
export type LeagueStats = Tables["league_stats"]["Row"];
export type Announcement = Tables["announcements"]["Row"];
export type NewsItem = Tables["transfers_news"]["Row"];
export type Fixture = Tables["fixtures"]["Row"];
export type Tactic = Tables["playbook_tactics"]["Row"];
export type Principle = Tables["team_principles"]["Row"];
export type SquadMember = Tables["squad_members"]["Row"];
export type StaffMember = Tables["staff"]["Row"];
export type ChatMessage = Tables["chat_messages"]["Row"];

export interface PlayerAttributes {
  pac?: number;
  sho?: number;
  pas?: number;
  dri?: number;
  def?: number;
  phy?: number;
}
export interface PlayerStats {
  appearances?: number;
  goals?: number;
  assists?: number;
  saves?: number;
  cleanSheets?: number;
}
export interface StaffDuty {
  title: string;
  duty: string;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export const clubInfoQuery = queryOptions({
  queryKey: ["club_info"],
  queryFn: async () => unwrap(await supabase.from("club_info").select("*").eq("id", "main").maybeSingle()),
});

export const leagueStatsQuery = queryOptions({
  queryKey: ["league_stats"],
  queryFn: async () => unwrap(await supabase.from("league_stats").select("*").eq("id", "main").maybeSingle()),
});

export const announcementsQuery = queryOptions({
  queryKey: ["announcements"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});

export const newsQuery = queryOptions({
  queryKey: ["transfers_news"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("transfers_news")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
});

export const fixturesQuery = queryOptions({
  queryKey: ["fixtures"],
  queryFn: async () => unwrap(await supabase.from("fixtures").select("*").order("date", { ascending: true })),
});

export const playbookQuery = queryOptions({
  queryKey: ["playbook_tactics"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("playbook_tactics")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ),
});

export const principlesQuery = queryOptions({
  queryKey: ["team_principles"],
  queryFn: async () => unwrap(await supabase.from("team_principles").select("*").order("num")),
});

export const squadQuery = queryOptions({
  queryKey: ["squad_members"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("squad_members")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ),
});

export const staffQuery = queryOptions({
  queryKey: ["staff"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("staff")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ),
});

export function splitFixtures(fixtures: Fixture[]) {
  const upcoming = fixtures.filter((f) => f.type === "upcoming");
  const results = fixtures.filter((f) => f.type === "result").sort((a, b) => b.date.localeCompare(a.date));
  return { upcoming, results };
}

export function today() {
  return new Date().toISOString().split("T")[0];
}

/** Throws a readable error from a Supabase mutation result. */
export function check(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}
