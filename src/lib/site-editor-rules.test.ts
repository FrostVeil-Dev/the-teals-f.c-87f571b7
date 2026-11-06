import { describe, expect, it } from "vitest";
import { canUseSiteEditor } from "./ranks";
import { MAX_IMAGE_BYTES, validateImageFile } from "./site-content";

describe("in-site editor access", () => {
  it("is open to WEB HANDLER, Co-Owner and Admin", () => {
    expect(canUseSiteEditor("WEB HANDLER")).toBe(true);
    expect(canUseSiteEditor("Co-Owner")).toBe(true);
    expect(canUseSiteEditor("Admin")).toBe(true);
  });

  it("is closed to Moderators, Members and signed-out visitors", () => {
    expect(canUseSiteEditor("Moderator")).toBe(false);
    expect(canUseSiteEditor("Member")).toBe(false);
    expect(canUseSiteEditor(null)).toBe(false);
  });
});

describe("picture uploads", () => {
  it("accepts common image types up to 10 MB", () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
    expect(validateImageFile({ type: "image/jpeg", size: 1000 })).toBeNull();
  });

  it("rejects files over 10 MB and non-images", () => {
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).not.toBeNull();
    expect(validateImageFile({ type: "application/pdf", size: 1000 })).not.toBeNull();
    expect(validateImageFile({ type: "image/svg+xml", size: 1000 })).not.toBeNull();
  });
});
