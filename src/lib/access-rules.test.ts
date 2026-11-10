import { describe, expect, it } from "vitest";
import { canEditLineup, isApprovedMember } from "./ranks";

describe("approval gate", () => {
  it("blocks a new registration until an Admin approves it", () => {
    expect(isApprovedMember({ status: "active", isReviewed: false, role: "member" })).toBe(false);
  });
  it("lets an approved member in", () => {
    expect(isApprovedMember({ status: "active", isReviewed: true, role: "member" })).toBe(true);
  });
  it("lets Admin and above in without approval", () => {
    expect(isApprovedMember({ status: "active", isReviewed: false, role: "admin" })).toBe(true);
    expect(isApprovedMember({ status: "active", isReviewed: false, role: "web_handler" })).toBe(true);
  });
  it("blocks removed accounts even if approved", () => {
    expect(isApprovedMember({ status: "removed", isReviewed: true, role: "member" })).toBe(false);
  });
});

describe("lineup editing", () => {
  it("is only for Admin, Co-Owner and WEB HANDLER", () => {
    expect(canEditLineup("member")).toBe(false);
    expect(canEditLineup("moderator")).toBe(false);
    expect(canEditLineup("admin")).toBe(true);
    expect(canEditLineup("co_owner")).toBe(true);
    expect(canEditLineup("web_handler")).toBe(true);
  });
});
