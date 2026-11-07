import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip, ClubDialog, SafeImg } from "@/components/club/ui";
import { EditableText } from "@/components/club/site-editor";
import { useAuth } from "@/hooks/use-auth";
import { squadQuery } from "@/lib/club-data";
import { canUseSiteEditor } from "@/lib/ranks";
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
  parseSavedBoard,
  serializeBoard,
} from "@/lib/tactical-board";
import { cn } from "@/lib/utils";

const KEY = boardContentKey("custom");

interface Drag {
  id: string;
  from: "bench" | "pitch";
  x: number;
  y: number;
  moved: boolean;
}

export function TacticalBoard() {
  const { profile } = useAuth();
  const canSave = profile ? canUseSiteEditor(profile.role) : false;
  const queryClient = useQueryClient();
  const { data: content } = useSuspenseQuery(siteContentQuery);
  const { data: squad = [] } = useQuery(squadQuery);
  const pool = useMemo(() => buildPlayerPool([], squad), [squad]);
  const byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const saved = useMemo(() => parseSavedBoard(content[KEY], new Set(byId.keys())) ?? [], [content, byId]);

  const [placed, setPlaced] = useState<PlacedPlayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pitchRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPlaced(saved), [saved]);

  const bench = benchPlayers(pool, placed);
  const selected = selectedId ? byId.get(selectedId) : undefined;

  function inside(el: HTMLElement | null, x: number, y: number) {
    const r = el?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function start(e: React.PointerEvent, id: string, from: Drag["from"]) {
    e.preventDefault();
    setDrag({ id, from, x: e.clientX, y: e.clientY, moved: false });
  }

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, moved: true } : d));
    const up = (e: PointerEvent) => {
      const d = drag;
      setDrag(null);
      if (!d.moved && d.from === "pitch") {
        setSelectedId(d.id);
        return;
      }
      if (inside(pitchRef.current, e.clientX, e.clientY)) {
        const r = pitchRef.current!.getBoundingClientRect();
        const x = clampPos(((e.clientX - r.left) / r.width) * 100);
        const y = clampPos(((e.clientY - r.top) / r.height) * 100);
        setPlaced((cur) => {
          if (!canPlace(cur, d.id)) {
            toast.error(`Only ${MAX_ON_PITCH} players fit on the pitch`);
            return cur;
          }
          const others = cur.filter((p) => p.id !== d.id);
          return [...others, { id: d.id, x, y }];
        });
        setSelectedId(d.id);
      } else if (d.from === "pitch" && (inside(benchRef.current, e.clientX, e.clientY) || d.moved)) {
        setPlaced((cur) => cur.filter((p) => p.id !== d.id));
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag?.id, drag?.from]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const dragPlayer = drag?.moved ? byId.get(drag.id) : undefined;

  return (
    <section className="panel-glow space-y-6 p-6 sm:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <EditableText as="h3" k="playbook.board.title" fallback="🏟 Interactive Tactical Board" label="heading" className="page-title block text-2xl" />
          <p className="text-xs text-muted-foreground">
            Drag players from the substitutes bar onto the pitch, move them anywhere, or drag them back to the bar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip className="rounded">{placed.length}/{MAX_ON_PITCH} on pitch</Chip>
          <Button size="chip" variant="chip" onClick={() => setPlaced([])}>Clear to Bench</Button>
          {canSave && (
            <>
              <Button size="chip" variant="chip" onClick={() => setEditOpen(true)}>⚙ Edit Lineup</Button>
              <Button size="chip" variant="chipActive" disabled={busy} onClick={() => save()}>💾 Save Lineup</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div
          ref={pitchRef}
          className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-3xl border-4 border-deep shadow-2xl lg:col-span-8"
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
          {placed.map((pp) => {
            const p = byId.get(pp.id);
            if (!p) return null;
            const hidden = drag?.moved && drag.id === p.id;
            return (
              <div
                key={p.id}
                onPointerDown={(e) => start(e, p.id, "pitch")}
                className={cn("absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-grab", hidden && "opacity-30")}
                style={{ left: `${pp.x}%`, top: `${pp.y}%` }}
                aria-label={`${p.name} (${p.pos})`}
              >
                <Token p={p} selected={p.id === selectedId} />
              </div>
            );
          })}
          {placed.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-bold text-chalk/70">
              Drag players here from the substitutes bar
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div ref={benchRef} className="panel-deep space-y-3 p-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow">🪑 Substitutes Bar</span>
              <span className="text-xs text-muted-foreground">{bench.length} players</span>
            </div>
            <div className="grid max-h-[360px] touch-none select-none grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-3">
              {bench.map((p) => (
                <div key={p.id} onPointerDown={(e) => start(e, p.id, "bench")} className="flex cursor-grab justify-center">
                  <Token p={p} small />
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
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2" style={{ left: drag!.x, top: drag!.y }}>
          <Token p={dragPlayer} selected />
        </div>
      )}

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
    </section>
  );
}

function Token({ p, selected, small }: { p: BoardPlayer; selected?: boolean; small?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "relative rounded-full bg-surface p-0.5",
          small ? "h-10 w-10" : "h-10 w-10 sm:h-12 sm:w-12",
          selected ? "ring-4 ring-primary ring-offset-2 ring-offset-deep" : "ring-2 ring-chalk/60",
        )}
      >
        <SafeImg src={p.photo} alt={p.name} className="pointer-events-none h-full w-full rounded-full object-cover" draggable={false} />
        {p.num > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-surface bg-primary text-[10px] font-black text-primary-foreground">
            {p.num}
          </span>
        )}
      </div>
      <span className="mt-1 max-w-[84px] truncate whitespace-nowrap rounded border border-primary/30 bg-deep/80 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground">
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
