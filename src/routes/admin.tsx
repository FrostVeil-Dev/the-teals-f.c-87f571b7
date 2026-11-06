import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Chip, RankBadge, SafeImg } from "@/components/club/ui";
import { RANK_LIST, canAssignRole, canManageMember, canManageMembers, getRank, type RankKey } from "@/lib/ranks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Member Management — The Teals F.C." },
      { name: "description", content: "Rank promotions, new member reviews and team chat access for The Teals F.C. administrators." },
      { property: "og:title", content: "Member Management — The Teals F.C." },
      { property: "og:description", content: "Admin dashboard for The Teals F.C. club portal." },
    ],
  }),
  component: AdminPage,
});

interface AdminMember {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  chatAccess: boolean;
  isReviewed: boolean;
  status: string;
  joinedAt: string;
  role: string; // label
}

const ADMIN_KEY = ["admin_members"];

function AdminPage() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">Checking your rank…</div>;
  if (!profile || !canManageMembers(profile.role)) {
    return (
      <div className="animate-fade-up mx-auto max-w-md space-y-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-surface text-2xl">⛔</div>
        <h1 className="page-title text-3xl">Access Restricted</h1>
        <p className="text-xs text-muted-foreground">
          The Admin Dashboard is only accessible to <strong>Admin</strong>, <strong>Co-Owner</strong>, and the <strong>WEB HANDLER</strong>.
        </p>
        <Button asChild variant="hero">
          <Link to={profile ? "/" : "/auth"}>{profile ? "Back to Home" : "Sign In"}</Link>
        </Button>
      </div>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const me = profile!;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ADMIN_KEY,
    queryFn: async (): Promise<AdminMember[]> => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").order("joined_at", { ascending: true }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw new Error(p.error.message);
      if (r.error) throw new Error(r.error.message);
      const roles = new Map(r.data.map((x) => [x.user_id, x.role]));
      return p.data.map((x) => ({
        id: x.id,
        name: x.display_name,
        email: x.email,
        photo: x.photo_url,
        chatAccess: x.chat_access,
        isReviewed: x.is_reviewed,
        status: x.status,
        joinedAt: x.joined_at,
        role: getRank(roles.get(x.id) ?? "member").id,
      }));
    },
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
    await refreshProfile();
  };

  async function rpc(fn: () => PromiseLike<{ error: { message: string } | null }>, success: string) {
    const { error: err } = await fn();
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success(success);
    await refresh();
  }

  const q = search.trim().toLowerCase();
  const filtered = members.filter((u) => {
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const chat = u.chatAccess || u.role === "WEB HANDLER";
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "unreviewed" && !u.isReviewed) ||
      (statusFilter === "chat_granted" && chat) ||
      (statusFilter === "chat_locked" && !chat) ||
      (statusFilter === "removed" && u.status === "removed");
    return matchQ && matchRole && matchStatus;
  });

  const isWebHandler = me.rank.key === "web_handler";

  return (
    <div className="animate-fade-up space-y-8 pb-16">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-primary/20 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="eyebrow mb-1 text-violet">🛡 Administration & Security</div>
          <h1 className="page-title text-4xl sm:text-5xl">Member Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Control rank promotions, review new signups, and grant/revoke team chat access.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="soft" size="sm">
            <Link to="/staff">🩵 Staff Info Directory</Link>
          </Button>
          <span className="chip tone-violet rounded-xl px-3 py-1.5 text-xs">
            Your Rank: <strong>{me.role}</strong>
          </span>
        </div>
      </div>

      <div className="panel flex flex-col items-center justify-between gap-4 p-4 md:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search member name or email..."
          className="field md:w-80"
        />
        <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="field w-auto text-xs">
            <option value="all">All Ranks</option>
            {RANK_LIST.map((r) => (
              <option key={r.key} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field w-auto text-xs">
            <option value="all">All Statuses</option>
            <option value="unreviewed">⚠️ New / Unreviewed</option>
            <option value="chat_granted">💬 Chat Granted</option>
            <option value="chat_locked">🔒 Chat Locked</option>
            <option value="removed">🚫 Removed</option>
          </select>
          <span className="rounded border border-border bg-deep px-2.5 py-1 text-xs font-bold text-primary">{filtered.length} member(s)</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-primary/20 bg-surface/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-deep/80 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Member / Email</th>
                <th className="hidden px-3 py-3 md:table-cell">Joined</th>
                <th className="px-3 py-3">Club Rank</th>
                <th className="px-3 py-3">Team Chat</th>
                <th className="hidden px-3 py-3 lg:table-cell">Review Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">Loading members…</td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-destructive">{(error as Error).message}</td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">No matching members found with current filters.</td>
                </tr>
              )}
              {filtered.map((t) => {
                const isMe = t.id === me.id;
                const targetIsWH = t.role === "WEB HANDLER";
                const removed = t.status === "removed";
                const assignable = RANK_LIST.filter((r) => r.id !== t.role && canAssignRole(me.role, me.id, t, r.id));
                const canManage = !removed && canManageMember(me.role, me.id, t);
                const chat = t.chatAccess || targetIsWH;
                return (
                  <tr
                    key={t.id}
                    className={cn(
                      "transition-colors hover:bg-deep/40",
                      !t.isReviewed && !removed && "border-l-4 border-amber bg-amber/5",
                      removed && "opacity-60",
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <SafeImg src={t.photo} alt={t.name} className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-2 ring-border" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold">{t.name}</span>
                            {isMe && <Chip tone="slate" className="rounded px-1.5 text-[9px]">You</Chip>}
                            {!t.isReviewed && !removed && <Chip tone="amber" className="animate-pulse rounded px-1.5 text-[9px]">New</Chip>}
                            {removed && <Chip tone="rose" className="rounded px-1.5 text-[9px]">Removed</Chip>}
                          </div>
                          <div className="max-w-[160px] truncate text-xs text-muted-foreground sm:max-w-xs">{t.email || "No email associated"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-4 text-muted-foreground md:table-cell">{t.joinedAt.split("T")[0]}</td>
                    <td className="px-3 py-4">
                      <div className="space-y-1.5">
                        <RankBadge role={t.role} />
                        {!isMe && !removed && assignable.length > 0 ? (
                          <select
                            value=""
                            onChange={(e) =>
                              rpc(
                                () => supabase.rpc("assign_rank", { _target: t.id, _new_role: e.target.value as RankKey }),
                                `Role updated: ${t.name} is now ${getRank(e.target.value).id}`,
                              )
                            }
                            className="block cursor-pointer rounded-lg border border-input bg-deep px-2 py-1 text-[11px] focus:border-primary focus:outline-none"
                          >
                            <option value="" disabled>
                              Change Rank ▾
                            </option>
                            {assignable.map((r) => (
                              <option key={r.key} value={r.key}>
                                Assign {r.id}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-[10px] text-muted-foreground">
                            {targetIsWH ? <span className="font-bold text-violet">Supreme Owner</span> : isMe ? "Self" : removed ? "—" : "Higher / Protected Rank"}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <Chip tone={chat ? "teal" : "slate"} className="rounded">
                          {chat ? "Granted ✓" : "Locked 🔒"}
                        </Chip>
                        {canManage && (
                          <button
                            onClick={() =>
                              rpc(
                                () => supabase.rpc("set_chat_access", { _target: t.id, _access: !t.chatAccess }),
                                `Team Chat access ${t.chatAccess ? "revoked from" : "granted to"} ${t.name}!`,
                              )
                            }
                            className={cn(
                              "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                              t.chatAccess
                                ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                                : "border-primary/40 bg-teal-deep/30 text-primary hover:bg-teal-deep/60",
                            )}
                          >
                            {t.chatAccess ? "Revoke" : "Approve Chat"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-3 py-4 lg:table-cell">
                      {!t.isReviewed && canManage ? (
                        <button
                          onClick={() => rpc(() => supabase.rpc("approve_member", { _target: t.id }), `${t.name} approved as verified member!`)}
                          className="rounded-lg bg-amber px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-sm hover:opacity-90"
                        >
                          ✓ Review & Approve
                        </button>
                      ) : (
                        <span className="font-medium text-muted-foreground">{t.isReviewed ? "Verified ✓" : "Pending"}</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-right">
                      {isWebHandler && !isMe && !targetIsWH && (
                        removed ? (
                          <button
                            onClick={() => rpc(() => supabase.rpc("restore_member", { _target: t.id }), `${t.name} restored`)}
                            className="rounded px-2 py-1 text-xs text-primary hover:bg-secondary"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (!window.confirm(`Are you sure you want to remove ${t.name} from The Teals F.C.?`)) return;
                              void rpc(() => supabase.rpc("remove_member", { _target: t.id }), `Member ${t.name} removed`);
                            }}
                            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-destructive"
                          >
                            Remove
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
