import { describe, expect, it } from "vitest";
import { MAX_ON_PITCH, benchPlayers, canPlace, buildPlayerPool, clampPos, parseSavedBoard, serializeBoard } from "./tactical-board";

const henil = { id: "henil", name: "Henil", num: 10, pos: "ST", role: "Striker", photo: "/h.png" };

describe("tactical board", () => {
  it("keeps players inside the pitch", () => {
    expect(clampPos(-20)).toBe(3);
    expect(clampPos(150)).toBe(97);
    expect(clampPos(42.37)).toBe(42.4);
  });

  it("adds squad members who are not in the formation to the pool, once", () => {
    const pool = buildPlayerPool([henil], [
      { name: "Henil", number: 10, card_position: "CF", photo: null, card_image: null, tactical_role: null },
      { name: "Vivek", number: 2, card_position: "RB", photo: "/v.png", card_image: null, tactical_role: null },
    ]);
    expect(pool.map((p) => p.id)).toEqual(["henil", "vivek"]);
    expect(pool[0]!.pos).toBe("ST");
  });

  it("puts every player who is not on the pitch on the bench", () => {
    const vivek = { ...henil, id: "vivek", name: "Vivek" };
    expect(benchPlayers([henil, vivek], [{ id: "henil", x: 50, y: 50 }]).map((p) => p.id)).toEqual(["vivek"]);
  });

  it("round-trips a saved lineup", () => {
    const ids = new Set(["a", "b", "c"]);
    const placed = [...ids].map((id, i) => ({ id, x: 10 + i, y: 20 + i }));
    expect(parseSavedBoard(serializeBoard(placed), ids)).toEqual(placed);
  });

  it("allows at most 10 players on the pitch", () => {
    expect(MAX_ON_PITCH).toBe(10);
    const ten = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, x: 50, y: 50 }));
    expect(canPlace(ten.slice(0, 9), "new")).toBe(true);
    expect(canPlace(ten, "new")).toBe(false);
    expect(canPlace(ten, "p3")).toBe(true);
    const ids = new Set([...ten.map((p) => p.id), "p10"]);
    const raw = JSON.stringify({ players: [...ten, { id: "p10", x: 5, y: 5 }] });
    expect(parseSavedBoard(raw, ids)).toHaveLength(10);
  });

  it("ignores broken, unknown or duplicate saved entries", () => {
    const ids = new Set(["henil"]);
    expect(parseSavedBoard("not json", ids)).toBeNull();
    expect(parseSavedBoard(undefined, ids)).toBeNull();
    const raw = JSON.stringify({ players: [{ id: "henil", x: 200, y: 10 }, { id: "henil", x: 1, y: 1 }, { id: "ghost", x: 5, y: 5 }] });
    expect(parseSavedBoard(raw, ids)).toEqual([{ id: "henil", x: 97, y: 10 }]);
  });
});
