/** Pure helpers for the drag-and-drop tactical board on the Playbook page. */

export interface BoardPlayer {
  id: string;
  name: string;
  num: number;
  pos: string;
  role: string;
  photo: string;
}

export interface PlacedPlayer {
  id: string;
  x: number;
  y: number;
}

/** Tokens stay fully inside the pitch: positions are percentages kept within 3–97. */
export const MIN_POS = 3;
export const MAX_POS = 97;

/** The custom formation holds at most this many players on the half pitch. */
export const MAX_ON_PITCH = 10;

export function canPlace(placed: PlacedPlayer[], id: string): boolean {
  return placed.some((p) => p.id === id) || placed.length < MAX_ON_PITCH;
}

export function clampPos(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(MAX_POS, Math.max(MIN_POS, Math.round(value * 10) / 10));
}

export function playerId(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** site_content key where Admin+ saves the lineup for one formation. */
export function boardContentKey(formationKey: string): string {
  return `playbook.board.${formationKey}`;
}

/** Everyone who can be placed: formation players first, then the rest of the squad. */
export function buildPlayerPool(
  formationPlayers: BoardPlayer[],
  squad: { name: string; number: number | null; card_position: string; photo: string | null; card_image: string | null; tactical_role: string | null }[],
): BoardPlayer[] {
  const pool = new Map<string, BoardPlayer>();
  for (const p of formationPlayers) pool.set(p.id, p);
  for (const s of squad) {
    const id = playerId(s.name);
    if (!id || pool.has(id)) continue;
    pool.set(id, {
      id,
      name: s.name,
      num: s.number ?? 0,
      pos: s.card_position || "SUB",
      role: s.tactical_role || "Squad Player",
      photo: s.photo || s.card_image || "",
    });
  }
  return [...pool.values()];
}

/** Reads a saved lineup; anything malformed or unknown is ignored, duplicates keep the first. */
export function parseSavedBoard(raw: string | undefined, knownIds: Set<string>): PlacedPlayer[] | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const list = (data as { players?: unknown })?.players;
  if (!Array.isArray(list)) return null;
  const seen = new Set<string>();
  const out: PlacedPlayer[] = [];
  for (const item of list) {
    const p = item as Partial<PlacedPlayer>;
    if (typeof p?.id !== "string" || !knownIds.has(p.id) || seen.has(p.id)) continue;
    if (typeof p.x !== "number" || typeof p.y !== "number") continue;
    if (out.length >= MAX_ON_PITCH) break;
    seen.add(p.id);
    out.push({ id: p.id, x: clampPos(p.x), y: clampPos(p.y) });
  }
  return out;
}

export function serializeBoard(players: PlacedPlayer[]): string {
  return JSON.stringify({ v: 1, players: players.map((p) => ({ id: p.id, x: clampPos(p.x), y: clampPos(p.y) })) });
}

/** Players not currently on the pitch sit on the substitutes bench. */
export function benchPlayers(pool: BoardPlayer[], placed: PlacedPlayer[]): BoardPlayer[] {
  const onPitch = new Set(placed.map((p) => p.id));
  return pool.filter((p) => !onPitch.has(p.id));
}

/** Converts a screen point (the token's centre) into a pitch position in percent, kept inside the pitch. */
export function pointToPitch(
  cx: number,
  cy: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  return {
    x: clampPos(((cx - rect.left) / rect.width) * 100),
    y: clampPos(((cy - rect.top) / rect.height) * 100),
  };
}

/** Pointer travel (px) before a press becomes a drag; smaller moves count as a tap. */
export const DRAG_THRESHOLD = 4;

export function isDrag(dx: number, dy: number): boolean {
  return dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD;
}
