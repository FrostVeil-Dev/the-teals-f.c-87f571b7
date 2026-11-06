import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ClubDialog, EmptyState, Field, PageHeader, PermissionNote, RankBadge } from "@/components/club/ui";
import { announcementsQuery, check, today } from "@/lib/club-data";
import { canEditContent } from "@/lib/ranks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/announcements")({
  head: () => ({
    meta: [
      { title: "Club Announcements — The Teals F.C." },
      { name: "description", content: "Matchday directives, training schedules and squad updates from The Teals F.C." },
      { property: "og:title", content: "Club Announcements — The Teals F.C." },
      { property: "og:description", content: "Official notices and squad announcements from The Teals F.C." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(announcementsQuery),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { profile } = useAuth();
  const canPublish = profile ? canEditContent(profile.role) : false;
  const { data: items } = useSuspenseQuery(announcementsQuery);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", text: "", pinned: false });
  const [busy, setBusy] = useState(false);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.text.trim()) {
      toast.error("Please provide both title and content text");
      return;
    }
    setBusy(true);
    try {
      check(
        await supabase.from("announcements").insert({
          title: form.title.trim(),
          text: form.text.trim(),
          pinned: form.pinned,
          date: today(),
        }),
      );
      toast.success("Announcement published successfully!");
      setOpen(false);
      setForm({ title: "", text: "", pinned: false });
      await queryClient.invalidateQueries({ queryKey: announcementsQuery.queryKey });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      check(await supabase.from("announcements").delete().eq("id", id));
      toast.info("Announcement deleted");
      await queryClient.invalidateQueries({ queryKey: announcementsQuery.queryKey });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="animate-fade-up space-y-8 pb-16">
      <PageHeader
        eyebrow="Official Club Notices"
        icon="📢"
        title="Club Announcements"
        subtitle="Matchday directives, training schedules, and strategic squad updates."
        actions={
          canPublish ? (
            <Button variant="hero" onClick={() => setOpen(true)}>
              + Post Announcement
            </Button>
          ) : (
            <PermissionNote>
              Publishing enabled for <strong className="text-primary">Moderator+</strong>
            </PermissionNote>
          )
        }
      />

      {items.length === 0 ? (
        <EmptyState title="No announcements yet" body="Check back later for matchday and squad directives." />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.id}
              className={cn(
                "rounded-2xl p-6 transition-colors",
                item.pinned ? "bg-banner border-2 border-primary/50 shadow-xl" : "panel hover:border-primary/30",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  {item.pinned && (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
                      📌 Pinned
                    </span>
                  )}
                  <span className="text-xs font-medium text-muted-foreground">{item.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">By:</span>
                  <span className="text-xs font-bold">{item.author}</span>
                  <RankBadge role={item.author_role} />
                  {canPublish && (
                    <button
                      onClick={() => remove(item.id)}
                      className="ml-2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      aria-label="Delete announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <h2 className="font-display text-2xl font-bold tracking-wide">{item.title}</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-secondary-foreground">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      <ClubDialog open={open} onOpenChange={setOpen} title="New Club Announcement">
        <form onSubmit={publish} className="space-y-4">
          <Field label="Title *">
            <input
              className="field"
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Squad Announcement for Saturday Derby"
            />
          </Field>
          <Field label="Content Text *">
            <textarea
              className="field"
              rows={4}
              required
              maxLength={5000}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Write the full announcement details..."
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-secondary-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={form.pinned}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
            />
            Pin this announcement to the top of the feed
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="club" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={busy}>
              {busy ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </form>
      </ClubDialog>
    </div>
  );
}
