import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Chip, ClubDialog, EmptyState, Field, PageHeader, PermissionNote, SafeImg } from "@/components/club/ui";
import { check, newsQuery, today, type NewsItem } from "@/lib/club-data";
import { canEditContent, type Tone } from "@/lib/ranks";
import { FALLBACK_IMAGE } from "@/lib/club-config";
import { EditableField, EditableRecordImage, ImageInput } from "@/components/club/site-editor";

export const Route = createFileRoute("/_authenticated/_approved/transfers-news")({
  head: () => ({
    meta: [
      { title: "Transfers & News — The Teals F.C." },
      { name: "description", content: "Transfer market updates, tactical analyses and match reporting from The Teals F.C." },
      { property: "og:title", content: "Transfers & News — The Teals F.C." },
      { property: "og:description", content: "Signings, departures and club headlines." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(newsQuery),
  component: NewsPage,
});

const FILTERS = [
  { id: "all", label: "All Stories" },
  { id: "transfer-in", label: "Transfers In" },
  { id: "transfer-out", label: "Transfers Out" },
  { id: "news", label: "Club News" },
] as const;

const TYPE_TONE: Record<string, Tone> = { "transfer-in": "emerald", "transfer-out": "amber", news: "teal" };

function NewsPage() {
  const { profile } = useAuth();
  const canPublish = profile ? canEditContent(profile.role) : false;
  const { data: items } = useSuspenseQuery(newsQuery);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [reading, setReading] = useState<NewsItem | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", type: "transfer-in", category: "", image: "", text: "" });

  const filtered = items.filter((i) => filter === "all" || i.type === filter);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.text.trim()) {
      toast.error("Please provide title and story text");
      return;
    }
    const category = form.category.trim() || (form.type === "news" ? "News" : "Transfer");
    setBusy(true);
    try {
      check(
        await supabase.from("transfers_news").insert({
          title: form.title.trim(),
          type: form.type,
          category,
          image: form.image.trim() || FALLBACK_IMAGE,
          text: form.text.trim(),
          badge: form.type === "transfer-in" ? "Transfer In" : form.type === "transfer-out" ? "Transfer Out" : category,
          date: today(),
        }),
      );
      toast.success("Article published successfully!");
      setOpen(false);
      setForm({ title: "", type: "transfer-in", category: "", image: "", text: "" });
      await queryClient.invalidateQueries({ queryKey: newsQuery.queryKey });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this story?")) return;
    try {
      check(await supabase.from("transfers_news").delete().eq("id", id));
      toast.info("Article deleted");
      await queryClient.invalidateQueries({ queryKey: newsQuery.queryKey });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="animate-fade-up space-y-8 pb-16">
      <PageHeader
        contentKey="transfers-news"
        eyebrow="Squad Roster & Headlines"
        icon="📰"
        title="Transfers & News"
        subtitle="Transfer market updates, tactical analyses, and match reporting."
        actions={
          canPublish ? (
            <Button variant="hero" onClick={() => setOpen(true)}>
              + Add Story / Transfer
            </Button>
          ) : (
            <PermissionNote>
              Publishing enabled for <strong className="text-primary">Moderator+</strong>
            </PermissionNote>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.id} variant={filter === f.id ? "chipActive" : "chip"} size="chip" onClick={() => setFilter(f.id)}>
            {f.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && <EmptyState title="No stories found in this category" />}
        {filtered.map((item) => (
          <article key={item.id} className="panel group flex flex-col overflow-hidden transition-colors hover:border-primary/40">
            <div className="relative flex h-48 w-full items-center justify-center overflow-hidden bg-deep">
              <EditableRecordImage
                table="transfers_news"
                id={item.id}
                column="image"
                queryKey={newsQuery.queryKey}
                label="story picture"
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute left-3 top-3">
                <Chip tone={TYPE_TONE[item.type] ?? "slate"}>{item.badge || item.category}</Chip>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-between space-y-3 p-5">
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-muted-foreground">{item.date}</div>
                <EditableField
                  as="h3"
                  table="transfers_news"
                  id={item.id}
                  column="title"
                  queryKey={newsQuery.queryKey}
                  label="headline"
                  value={item.title}
                  className="line-clamp-2 font-display text-xl font-bold transition-colors group-hover:text-primary"
                />
                <EditableField
                  as="p"
                  kind="multiline"
                  table="transfers_news"
                  id={item.id}
                  column="text"
                  queryKey={newsQuery.queryKey}
                  label="story text"
                  value={item.text}
                  className="line-clamp-3 text-xs leading-relaxed text-secondary-foreground"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <button onClick={() => setReading(item)} className="text-xs font-bold text-primary hover:text-primary/80">
                  Read Full Story ➔
                </button>
                {canPublish && (
                  <button
                    onClick={() => remove(item.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                    aria-label="Delete story"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <ClubDialog open={!!reading} onOpenChange={(o) => !o && setReading(null)} title={reading?.title ?? ""}>
        {reading && (
          <div className="space-y-4">
            <div className="flex max-h-64 w-full items-center justify-center overflow-hidden rounded-xl bg-deep">
              <SafeImg src={reading.image} alt={reading.title} className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Chip tone="teal" className="rounded">
                {reading.category}
              </Chip>
              <span>{reading.date}</span>
            </div>
            <div className="whitespace-pre-line text-sm leading-relaxed">{reading.text}</div>
          </div>
        )}
      </ClubDialog>

      <ClubDialog open={open} onOpenChange={setOpen} title="Add News or Transfer Article">
        <form onSubmit={publish} className="space-y-3.5">
          <Field label="Headline Title *">
            <input
              className="field"
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Faraz joins The Teals defensive line"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Article Type">
              <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="transfer-in">Transfer In</option>
                <option value="transfer-out">Transfer Out</option>
                <option value="news">Club News</option>
              </select>
            </Field>
            <Field label="Category Label">
              <input
                className="field"
                maxLength={60}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Signing, Tactics, Update"
              />
            </Field>
          </div>
          <Field label="Story Picture">
            <ImageInput value={form.image} onChange={(image) => setForm({ ...form, image })} />
          </Field>
          <Field label="Story Content *">
            <textarea
              className="field"
              rows={4}
              required
              maxLength={10000}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Write the complete article details..."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="club" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={busy}>
              {busy ? "Publishing…" : "Publish Story"}
            </Button>
          </div>
        </form>
      </ClubDialog>
    </div>
  );
}
