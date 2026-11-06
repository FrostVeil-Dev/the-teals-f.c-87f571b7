import { describe, expect, it } from "vitest";
import {
  RANKS,
  getRank,
  canEditContent,
  canManageClubData,
  canManageMembers,
  canAssignRole,
  canAccessTeamChat,
  canManageMember,
} from "./ranks";

describe("club rank rules", () => {
  it("orders rank levels WEB HANDLER 5 down to Member 1", () => {
    expect(RANKS.WEB_HANDLER.level).toBe(5);
    expect(RANKS.CO_OWNER.level).toBe(4);
    expect(RANKS.ADMIN.level).toBe(3);
    expect(RANKS.MODERATOR.level).toBe(2);
    expect(RANKS.MEMBER.level).toBe(1);
  });

  it("resolves labels and keys, defaulting to Member", () => {
    expect(getRank("WEB HANDLER").id).toBe("WEB HANDLER");
    expect(getRank("co-owner").id).toBe("Co-Owner");
    expect(getRank("co_owner").id).toBe("Co-Owner");
    expect(getRank("UnknownRank").id).toBe("Member");
    expect(getRank(null).id).toBe("Member");
  });

  it("lets Moderator and above publish announcements and news", () => {
    expect(canEditContent("Moderator")).toBe(true);
    expect(canEditContent("Member")).toBe(false);
  });

  it("lets Admin and above manage club data and members", () => {
    expect(canManageClubData("Admin")).toBe(true);
    expect(canManageClubData("Moderator")).toBe(false);
    expect(canManageMembers("Co-Owner")).toBe(true);
    expect(canManageMembers("Moderator")).toBe(false);
  });

  it("enforces rank assignment hierarchy", () => {
    const webHandler = { id: "u1", role: "WEB HANDLER" };
    const admin = { id: "u3", role: "Admin" };
    const mod = { id: "u4", role: "Moderator" };
    const member = { id: "u5", role: "Member" };

    expect(canAssignRole("WEB HANDLER", "u1", webHandler, "Co-Owner")).toBe(false); // own rank
    expect(canAssignRole("Co-Owner", "u2", webHandler, "Admin")).toBe(false); // WEB HANDLER protected
    expect(canAssignRole("WEB HANDLER", "u1", admin, "WEB HANDLER")).toBe(false); // nobody becomes WEB HANDLER
    expect(canAssignRole("WEB HANDLER", "u1", member, "Admin")).toBe(true);
    expect(canAssignRole("WEB HANDLER", "u1", admin, "Co-Owner")).toBe(true);
    expect(canAssignRole("Co-Owner", "u2", admin, "Moderator")).toBe(false); // only WEB HANDLER touches Admins
    expect(canAssignRole("Admin", "u3", member, "Admin")).toBe(false);
    expect(canAssignRole("Admin", "u3", member, "Moderator")).toBe(true);
    expect(canAssignRole("Admin", "u3", mod, "Member")).toBe(true);
    expect(canAssignRole("Moderator", "u4", member, "Moderator")).toBe(false);
  });

  it("lets admins manage chat access only for ranks below Admin", () => {
    expect(canManageMember("Admin", "a", { id: "b", role: "Member" })).toBe(true);
    expect(canManageMember("Admin", "a", { id: "b", role: "Co-Owner" })).toBe(false);
    expect(canManageMember("WEB HANDLER", "a", { id: "b", role: "Co-Owner" })).toBe(true);
    expect(canManageMember("WEB HANDLER", "a", { id: "a", role: "WEB HANDLER" })).toBe(false);
  });

  it("requires chat access unless WEB HANDLER", () => {
    expect(canAccessTeamChat({ role: "WEB HANDLER", chatAccess: false })).toBe(true);
    expect(canAccessTeamChat({ role: "Member", chatAccess: true })).toBe(true);
    expect(canAccessTeamChat({ role: "Member", chatAccess: false })).toBe(false);
    expect(canAccessTeamChat(null)).toBe(false);
  });
});
