/**
 * The Teals F.C. rank hierarchy & permission rules (ported from the original portal).
 * The database enforces the same rules in its assign_rank / set_chat_access functions;
 * these helpers only decide what the interface shows.
 */

export type RankKey = "web_handler" | "co_owner" | "admin" | "moderator" | "member";

export type Tone = "violet" | "teal" | "blue" | "emerald" | "slate" | "amber" | "gold" | "cyan" | "rose";

export interface Rank {
  key: RankKey;
  id: string; // display label, e.g. "WEB HANDLER"
  level: number;
  tone: Tone;
  description: string;
}

export const RANKS: Record<"WEB_HANDLER" | "CO_OWNER" | "ADMIN" | "MODERATOR" | "MEMBER", Rank> = {
  WEB_HANDLER: {
    key: "web_handler",
    id: "WEB HANDLER",
    level: 5,
    tone: "violet",
    description: "Supreme Club Owner & Developer. Full permissions, cannot be demoted.",
  },
  CO_OWNER: {
    key: "co_owner",
    id: "Co-Owner",
    level: 4,
    tone: "teal",
    description: "Club Co-Owner. Can do everything except demote or remove the WEB HANDLER.",
  },
  ADMIN: {
    key: "admin",
    id: "Admin",
    level: 3,
    tone: "blue",
    description: "Can manage members, grant/revoke team chat access, and edit club data.",
  },
  MODERATOR: {
    key: "moderator",
    id: "Moderator",
    level: 2,
    tone: "emerald",
    description: "Can post news, announcements, and moderate/delete team chat messages.",
  },
  MEMBER: {
    key: "member",
    id: "Member",
    level: 1,
    tone: "slate",
    description: "Club Member. Can view all public sections. Team chat access requires admin approval.",
  },
};

export const RANK_LIST: Rank[] = [RANKS.WEB_HANDLER, RANKS.CO_OWNER, RANKS.ADMIN, RANKS.MODERATOR, RANKS.MEMBER];

/** Resolve a rank from its label ("Co-Owner") or key ("co_owner"); unknown → Member. */
export function getRank(roleId: string | null | undefined): Rank {
  if (!roleId) return RANKS.MEMBER;
  const needle = roleId.trim().toLowerCase();
  return RANK_LIST.find((r) => r.id.toLowerCase() === needle || r.key === needle) ?? RANKS.MEMBER;
}

/** Moderator and above can post announcements and news. */
export function canEditContent(roleId: string | null | undefined): boolean {
  return getRank(roleId).level >= RANKS.MODERATOR.level;
}

/** Admin and above can edit club info, roster, playbook, staff and matchday. */
export function canManageClubData(roleId: string | null | undefined): boolean {
  return getRank(roleId).level >= RANKS.ADMIN.level;
}

/** Admin, Co-Owner and WEB HANDLER can use the in-site text/image editor. */
export function canUseSiteEditor(roleId: string | null | undefined): boolean {
  return getRank(roleId).level >= RANKS.ADMIN.level;
}

/** Admin and above can open the Admin Dashboard. */
export function canManageMembers(roleId: string | null | undefined): boolean {
  return getRank(roleId).level >= RANKS.ADMIN.level;
}

/** Moderator and above can delete any team chat message. */
export function canModerateChat(roleId: string | null | undefined): boolean {
  return getRank(roleId).level >= RANKS.MODERATOR.level;
}

/**
 * Whether callerRole may change targetUser's rank to newRole.
 * 1. Caller must be Admin or higher.  2. Nobody changes their own rank.
 * 3. WEB HANDLER is untouchable.       4. Nobody can be made WEB HANDLER.
 * 5. Only WEB HANDLER touches Admin / Co-Owner ranks.
 * 6–7. Others only manage, and assign, ranks strictly below their own.
 */
export function canAssignRole(
  callerRole: string | null | undefined,
  callerId: string | null | undefined,
  targetUser: { id?: string; role?: string | null } | null | undefined,
  newRole: string | null | undefined,
): boolean {
  if (!callerRole || !targetUser || !newRole) return false;
  const caller = getRank(callerRole);
  const current = getRank(targetUser.role);
  const next = getRank(newRole);
  const isWebHandler = caller.key === "web_handler";

  if (caller.level < RANKS.ADMIN.level) return false;
  if (callerId && targetUser.id && callerId === targetUser.id) return false;
  if (current.key === "web_handler") return false;
  if (next.key === "web_handler") return false;
  if ((current.level >= RANKS.ADMIN.level || next.level >= RANKS.ADMIN.level) && !isWebHandler) return false;
  if (!isWebHandler && current.level >= caller.level) return false;
  if (!isWebHandler && next.level >= caller.level) return false;
  return true;
}

/** Whether the caller may grant/revoke chat access or approve the target. */
export function canManageMember(
  callerRole: string | null | undefined,
  callerId: string | null | undefined,
  target: { id?: string; role?: string | null },
): boolean {
  const caller = getRank(callerRole);
  const t = getRank(target.role);
  if (caller.level < RANKS.ADMIN.level) return false;
  if (callerId && target.id === callerId) return false;
  if (t.key === "web_handler") return false;
  return caller.key === "web_handler" || t.level < RANKS.ADMIN.level;
}

/** Team chat: WEB HANDLER always, others need chatAccess. */
export function canAccessTeamChat(user: { role?: string | null; chatAccess?: boolean } | null | undefined): boolean {
  if (!user) return false;
  if (getRank(user.role).key === "web_handler") return true;
  return Boolean(user.chatAccess);
}

/**
 * Whether a signed-in account may see the club sections. Mirrors the database's
 * is_approved_member(): active and reviewed by an Admin+, or itself Admin+.
 */
export function isApprovedMember(
  p: { status?: string | null; isReviewed?: boolean | null; role?: string | null } | null | undefined,
): boolean {
  if (!p || p.status !== "active") return false;
  return Boolean(p.isReviewed) || getRank(p.role).level >= RANKS.ADMIN.level;
}

/** Only Admin, Co-Owner and WEB HANDLER can move players on and save the tactical board. */
export function canEditLineup(roleId: string | null | undefined): boolean {
  return getRank(roleId).level >= RANKS.ADMIN.level;
}
