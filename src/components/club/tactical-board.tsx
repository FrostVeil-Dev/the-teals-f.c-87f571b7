import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip, ClubDialog, SafeImg } from "@/components/club/ui";
import { EditableText } from "@/components/club/site-editor";
import { useAuth } from "@/hooks/use-auth";
import { squadQuery } from "@/lib/club-data";
import { canEditLineup } from "@/lib/ranks";
import { saveSiteContent, siteContentQuery } from "@/lib/site-content";
import {
  MAX_ON_PITCH,
  type BoardPlayer,
  type PlacedPlayer,
  benchPlayers,
  boardContentKey,
  buildPlayerPool,
  canPlace,
  clampPos,
  isDrag,
  parseSavedBoard,
  pointToPitch,
  serializeBoard,
} from "@/lib/tactical-board";
import { cn } from "@/lib/utils";

const KEY = boardContentKey("custom");

interface DragInfo {
  id: string;
  from: "bench" | "pitch";
  pointerId: number;
  startX: number;
  startY: number;
  /** Where inside the photo the player was grabbed, so it never jumps under the finger. */
  offX: number;
  offY: number;
  /** Latest centre of the dragged photo on screen. */
  cx: number;
  cy: number;
  moved: boolean;
}

function inside(el: HTMLElement | null, x: number, y: number) {
  const r = el?.getBoundingClientRect();
  return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

export function TacticalBoard() {
  const { profile } = useAuth();
  const canEdit = profile ? canEditLineup(profile.role) : false;
  const queryClient = useQueryClient();
  const { data: content } = useSuspenseQuery(siteContentQuery);
  const { data: squad = [] } = useQuery(squadQuery);
  const pool = useMemo(() => buildPlayerPool([], squad), [squad]);
  const byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const saved = useMemo(() => parseSavedBoard(content[KEY], new Set(byId.keys())) ?? [], [content, byId]);

  const [placed, setPlaced] = useState<PlacedPlayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; from: DragInfo["from"] } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pitchRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const frameRef = useRef(0);

  useEffect(() => setPlaced(saved), [saved]);

  const bench = benchPlayers(pool, placed);
  const selected = selectedId ? byId.get(selectedId) : undefined;

  /** Paint the dragged player + drop marker straight to the screen (no React re-render per move). */
  const paint = useCallback(() => {
    frameRef.current = 0;
    const d = dragRef.current;
    const ghost = ghostRef.current;
    if (!d || !ghost) return;
    ghost.style.transform = `translate3d(${d.cx}px, ${d.cy}px, 0) translate(-50%, -50%) scale(1.12)`;
    const overPitch = inside(pitchRef.current, d.cx, d.cy);
    const overBench = inside(benchRef.current, d.cx, d.cy);
    pitchRef.current?.toggleAttribute("data-over", overPitch);
    benchRef.current?.toggleAttribute("data-over", overBench && !overPitch);
    const marker = markerRef.current;
    const pitch = pitchRef.current;
    if (marker && pitch) {
      if (overPitch) {
        const pos = pointToPitch(d.cx, d.cy, pitch.getBoundingClientRect());
        marker.style.display = "block";
        marker.style.left = `${pos.x}%`;
        marker.style.top = `${pos.y}%`;
      } else marker.style.display = "none";
    }
  }, []);

  // Place the ghost under the finger the moment it appears.
  useLayoutEffect(() => {
    if (dragging) paint();
  }, [dragging, paint]);

  function finish(e: PointerEvent, cancelled: boolean) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    pitchRef.current?.removeAttribute("data-over");
    benchRef.current?.removeAttribute("data-over");
    setDragging(null);
    if (cancelled) return;

    if (!d.moved) {
      if (d.from === "pitch") setSelectedId(d.id);
      return;
    }
    const cx = e.clientX - d.offX;
    const cy = e.clientY - d.offY;
    const pitch = pitchRef.current;
    if (pitch && inside(pitch, cx, cy)) {
      const pos = pointToPitch(cx, cy, pitch.getBoundingClientRect());
      setPlaced((cur) => {
        if (!canPlace(cur, d.id)) {
          toast.error(`Only ${MAX_ON_PITCH} players fit on the pitch`);
          return cur;
        }
        return [...cur.filter((p) => p.id !== d.id), { id: d.id, ...pos }];
      });
      setSelectedId(d.id);
    } else if (d.from === "pitch" && inside(benchRef.current, cx, cy)) {
      setPlaced((cur) => cur.filter((p) => p.id !== d.id));
      if (selectedId === d.id) setSelectedId(null);
    }
    // Dropped anywhere else: the player simply stays where they were.
  }

  function onMove(e: PointerEvent) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (!d.moved) {
      if (!isDrag(e.clientX - d.startX, e.clientY - d.startY)) return;
      d.moved = true;
      setDragging({ id: d.id, from: d.from });
    }
    d.cx = e.clientX - d.offX;
    d.cy = e.clientY - d.offY;
    if (!frameRef.current) frameRef.current = requestAnimationFrame(paint);
  }
  function onUp(e: PointerEvent) {
    finish(e, false);
  }
  function onCancel(e: PointerEvent) {
    finish(e, true);
  }

  useEffect(
    () => () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  function start(e: React.PointerEvent<HTMLElement>, id: string, from: DragInfo["from"]) {
    if (from === "pitch" && !canEdit) {
      setSelectedId(id);
      return;
    }
    if (!canEdit || dragRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    dragRef.current = {
      id,
      from,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offX: e.clientX - cx,
      offY: e.clientY - cy,
      cx,
      cy,
      moved: false,
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }

  async function save(list = placed) {
    setBusy(true);
    try {
      await saveSiteContent(KEY, serializeBoard(list));
      await queryClient.invalidateQueries({ queryKey: siteContentQuery.queryKey });
      toast.success("Lineup saved for everyone");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const dragPlayer = dragging ? byId.get(dragging.id) : undefined;

  return (
    <section className="panel-glow space-y-6 p-6 sm:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <EditableText as="h3" k="playbook.board.title" fallback="🏟 Interactive Tactical Board" label="heading" className="page-title block text-2xl" />
          <p className="text-xs text-muted-foreground">
            {canEdit
              ? "Drag players from the substitutes bar onto the pitch, move them anywhere on the pitch, or drag them back to the bar."
              : "The coach's lineup. Tap a player to see their role. Only Admins can change the lineup."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip className="rounded">{placed.length}/{MAX_ON_PITCH} on pitch</Chip>
          {canEdit && (
            <>
              <Button size="chip" variant="chip" onClick={() => setPlaced([])}>Clear to Bench</Button>
              <Button size="chip" variant="chip" onClick={() => setEditOpen(true)}>⚙ Edit Lineup</Button>
              <Button size="chip" variant="chipActive" disabled={busy} onClick={() => save()}>💾 Save Lineup</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div
          ref={pitchRef}
          className={cn(
            "relative aspect-[4/3] w-full select-none overflow-hidden rounded-3xl border-4 border-deep shadow-2xl transition-shadow lg:col-span-8",
            "data-[over]:ring-4 data-[over]:ring-primary/60",
            canEdit && "touch-none",
          )}
        >
          <div className="bg-pitch absolute inset-0 opacity-95" />
          <svg className="pointer-events-none absolute inset-0 h-full w-full stroke-chalk/40" viewBox="0 0 400 300" preserveAspectRatio="none" fill="none" strokeWidth="2">
            <rect x="8" y="8" width="384" height="284" rx="6" />
            <path d="M 160 8 A 40 40 0 0 0 240 8" />
            <rect x="80" y="232" width="240" height="60" />
            <rect x="145" y="270" width="110" height="22" />
            <path d="M 165 232 A 40 30 0 0 1 235 232" />
            <circle cx="200" cy="250" r="2" className="fill-chalk/60" />
            <rect x="175" y="292" width="50" height="6" />
          </svg>
          <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-chalk/50">Halfway line</span>

          {/* Exact landing spot while dragging */}
          <div
            ref={markerRef}
            className="pointer-events-none absolute z-10 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-chalk/80 bg-chalk/10"
          >
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chalk" />
          </div>

          {placed.map((pp) => {
            const p = byId.get(pp.id);
            if (!p) return null;
            const lifted = dragging?.id === p.id;
            return (
              <div
                key={p.id}
                onPointerDown={(e) => start(e, p.id, "pitch")}
                className={cn(
                  "absolute z-20 -translate-x-1/2 -translate-y-1/2",
                  canEdit ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer",
                  lifted && "opacity-25",
                )}
                style={{ left: `${pp.x}%`, top: `${pp.y}%` }}
                aria-label={`${p.name} (${p.pos})`}
              >
                <Token p={p} selected={p.id === selectedId} />
              </div>
            );
          })}
          {placed.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-bold text-chalk/70">
              {canEdit ? "Drag players here from the substitutes bar" : "No lineup has been set yet"}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div ref={benchRef} className="panel-deep space-y-3 p-4 transition-shadow data-[over]:ring-2 data-[over]:ring-primary/60">
            <div className="flex items-center justify-between">
              <span className="eyebrow">🪑 Substitutes Bar</span>
              <span className="text-xs text-muted-foreground">{bench.length} players</span>
            </div>
            <div className="grid max-h-[380px] select-none grid-cols-3 gap-x-3 gap-y-1 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-3">
              {bench.map((p) => (
                <div key={p.id} className={cn("flex justify-center pb-6 pt-1", dragging?.id === p.id && "opacity-25")}>
                  <div
                    onPointerDown={(e) => start(e, p.id, "bench")}
                    className={cn(canEdit && "cursor-grab touch-none active:cursor-grabbing")}
                    aria-label={`${p.name} (${p.pos})`}
                  >
                    <Token p={p} />
                  </div>
                </div>
              ))}
              {bench.length === 0 && <p className="col-span-full text-xs text-muted-foreground">Everyone is on the pitch.</p>}
            </div>
          </div>

          {selected && (
            <div className="rounded-2xl border border-primary/30 bg-deep p-5 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-primary/50 bg-deep">
                  <SafeImg src={selected.photo} alt={selected.name} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display text-xl font-black">{selected.name}</h4>
                    <Chip className="rounded">{selected.pos}</Chip>
                  </div>
                  <div className="text-xs font-bold text-primary">{selected.role}</div>
                </div>
              </div>
            </div>
          )}

          <div className="panel-deep space-y-2 p-5">
            <EditableText as="span" k="playbook.custom.name" fallback="Teals Custom Lineup" label="formation name" className="eyebrow block" />
            <EditableText as="p" multiline k="playbook.custom.description" fallback="Our one formation: up to 10 players placed exactly where the coach wants them." label="formation description" className="block text-xs leading-relaxed text-secondary-foreground" />
          </div>
        </div>
      </div>

      {dragPlayer && (
        <div ref={ghostRef} className="pointer-events-none fixed left-0 top-0 z-50 drop-shadow-2xl will-change-transform">
          <Token p={dragPlayer} selected />
        </div>
      )}

      {canEdit && (
        <ClubDialog open={editOpen} onOpenChange={setEditOpen} title="Edit Lineup">
          <LineupEditor
            placed={placed}
            bench={bench}
            byId={byId}
            busy={busy}
            onSave={async (list) => {
              setPlaced(list);
              await save(list);
              setEditOpen(false);
            }}
          />
        </ClubDialog>
      )}
    </section>
  );
}

/** The photo circle is the token's box, so its centre is the exact pitch position; the name hangs below. */
function Token({ p, selected }: { p: BoardPlayer; selected?: boolean }) {
  return (
    <div
      className={cn(
        "relative h-11 w-11 rounded-full bg-surface p-0.5 sm:h-12 sm:w-12",
        selected ? "ring-4 ring-primary ring-offset-2 ring-offset-deep" : "ring-2 ring-chalk/60",
      )}
    >
      <SafeImg src={p.photo} alt={p.name} className="pointer-events-none h-full w-full rounded-full object-cover" draggable={false} />
      {p.num > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-surface bg-primary text-[10px] font-black text-primary-foreground">
          {p.num}
        </span>
      )}
      <span className="pointer-events-none absolute left-1/2 top-full mt-1 max-w-[84px] -translate-x-1/2 truncate whitespace-nowrap rounded border border-primary/30 bg-deep/80 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground">
        {p.name}
      </span>
    </div>
  );
}

function LineupEditor({
  placed,
  bench,
  byId,
  busy,
  onSave,
}: {
  placed: PlacedPlayer[];
  bench: BoardPlayer[];
  byId: Map<string, BoardPlayer>;
  busy: boolean;
  onSave: (list: PlacedPlayer[]) => void;
}) {
  const [list, setList] = useState(placed);
  const [addId, setAddId] = useState("");
  const benchNow = bench.filter((b) => !list.some((p) => p.id === b.id)).concat(
    placed.filter((p) => !list.some((l) => l.id === p.id)).map((p) => byId.get(p.id)!).filter(Boolean),
  );
  const update = (id: string, patch: Partial<PlacedPlayer>) =>
    setList((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Set exact positions: Left→Right and Halfway line→Goal line (3–97).</p>
      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {list.map((pp) => (
          <div key={pp.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 p-2 text-xs">
            <span className="w-24 truncate font-bold">{byId.get(pp.id)?.name}</span>
            <label className="flex items-center gap-1">
              ↔
              <input type="range" min={3} max={97} value={pp.x} onChange={(e) => update(pp.id, { x: clampPos(+e.target.value) })} />
              <input type="number" className="w-14 rounded bg-deep px-1" value={pp.x} onChange={(e) => update(pp.id, { x: clampPos(+e.target.value) })} />
            </label>
            <label className="flex items-center gap-1">
              ↕
              <input type="range" min={3} max={97} value={pp.y} onChange={(e) => update(pp.id, { y: clampPos(+e.target.value) })} />
              <input type="number" className="w-14 rounded bg-deep px-1" value={pp.y} onChange={(e) => update(pp.id, { y: clampPos(+e.target.value) })} />
            </label>
            <Button size="chip" variant="chip" onClick={() => setList((cur) => cur.filter((p) => p.id !== pp.id))}>To bench</Button>
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-muted-foreground">No players on the pitch yet.</p>}
      </div>
      {list.length < MAX_ON_PITCH && benchNow.length > 0 && (
        <div className="flex gap-2">
          <select className="flex-1 rounded-lg bg-deep px-2 py-1 text-sm" value={addId} onChange={(e) => setAddId(e.target.value)}>
            <option value="">Add a substitute…</option>
            {benchNow.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.pos})</option>
            ))}
          </select>
          <Button
            size="chip"
            variant="chip"
            disabled={!addId}
            onClick={() => {
              setList((cur) => (canPlace(cur, addId) ? [...cur, { id: addId, x: 50, y: 50 }] : cur));
              setAddId("");
            }}
          >
            Add
          </Button>
        </div>
      )}
      <Button variant="hero" className="w-full" disabled={busy} onClick={() => onSave(list)}>💾 Save Lineup</Button>
    </div>
  );
}
