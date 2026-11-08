import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { RankBadge, SafeImg } from "@/components/club/ui";
import { CLUB_CONFIG } from "@/lib/club-config";
import { check, type ChatMessage } from "@/lib/club-data";
import { canModerateChat } from "@/lib/ranks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_approved/team-chat")({
  head: () => ({
    meta: [
      { title: "Team Chat — The Teals F.C." },
      { name: "description", content: "The live locker room chat for verified Teals F.C. players, coaching staff and management." },
      { property: "og:title", content: "Team Chat — The Teals F.C." },
      { property: "og:description", content: "Live locker room chat for verified squad members." },
    ],
  }),
  component: TeamChatPage,
});

const CHAT_KEY = ["chat_messages"];

function TeamChatPage() {
  const { profile, user, loading } = useAuth();

  if (loading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Checking your squad access…</div>;
  }

  if (!user || !profile || !profile.chatAccess) {
    return (
      <div className="animate-fade-up mx-auto max-w-xl space-y-6 py-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-surface text-3xl shadow-xl">🔒</div>
        <div className="space-y-2">
          <span className="chip tone-danger px-3 py-1 text-xs">Access Restricted</span>
          <h1 className="page-title text-4xl">Team Chat Access Required</h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-secondary-foreground">
            This live locker room chat is strictly reserved for verified squad players, coaching staff, and management of{" "}
            <strong className="text-primary">{CLUB_CONFIG.name}</strong>
          </p>
        </div>
        <div className="panel space-y-4 p-6 text-left text-xs text-secondary-foreground">
          <div className="flex items-start gap-3">
            <span className="text-sm font-bold text-primary">ℹ️</span>
            <div>
              <strong className="mb-0.5 block text-foreground">How to get access:</strong>
              {user
                ? "An Admin, Co-Owner, or Web Handler must review your account and enable your Team Chat Access in the Member Management panel."
                : "Sign in with your club account. After an Admin reviews your account, your Team Chat Access is switched on."}
            </div>
          </div>
        </div>
        {!user && (
          <Button asChild variant="hero" size="lg">
            <Link to="/auth">Sign In to Continue</Link>
          </Button>
        )}
      </div>
    );
  }

  return <ChatRoom />;
}

function ChatRoom() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const isMod = profile ? canModerateChat(profile.role) : false;

  const { data: messages = [], isLoading } = useQuery({
    queryKey: CHAT_KEY,
    queryFn: async () => {
      const res = await supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(500);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`team-chat-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, (payload) => {
        queryClient.setQueryData<ChatMessage[]>(CHAT_KEY, (old = []) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as ChatMessage;
            return old.some((m) => m.id === row.id) ? old : [...old, row];
          }
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            return old.filter((m) => m.id !== id);
          }
          return old;
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user) return;
    setSending(true);
    setText("");
    try {
      const res = await supabase.from("chat_messages").insert({ text: body, author_id: user.id }).select().single();
      if (res.error) throw new Error(res.error.message);
      queryClient.setQueryData<ChatMessage[]>(CHAT_KEY, (old = []) => (old.some((m) => m.id === res.data.id) ? old : [...old, res.data]));
    } catch (err) {
      setText(body);
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    try {
      check(await supabase.from("chat_messages").delete().eq("id", id));
      queryClient.setQueryData<ChatMessage[]>(CHAT_KEY, (old = []) => old.filter((m) => m.id !== id));
      toast.info("Message deleted");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="animate-fade-up mx-auto flex h-[78vh] max-w-4xl flex-col space-y-4 pb-16">
      <div className="panel flex items-center justify-between border-primary/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-primary bg-deep">
            <img src={CLUB_CONFIG.logoUrl} alt="" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-black uppercase tracking-wide">Teals F.C. Team Chat</h1>
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
            </div>
            <p className="text-[11px] text-muted-foreground">Tactical communications, matchday preparation & banter</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="hidden text-muted-foreground sm:inline">Logged in as:</span>
          <span className="font-bold">{profile?.name}</span>
          <RankBadge role={profile?.role} />
        </div>
      </div>

      <div ref={boxRef} className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-deep/80 p-5 pt-6 shadow-inner">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">No messages yet. Send the first message to the squad!</div>
        ) : (
          messages.map((m) => {
            const mine = m.author_id === user?.id;
            const canDelete = isMod || mine;
            return (
              <div key={m.id} className={cn("group flex items-start gap-3", mine && "flex-row-reverse")}>
                <SafeImg src={m.author_photo} alt={m.author_name} className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-2 ring-border" />
                <div className="max-w-[80%] space-y-1 sm:max-w-md">
                  <div className={cn("flex items-center gap-2", mine && "justify-end")}>
                    <span className="text-xs font-bold">{m.author_name}</span>
                    <RankBadge role={m.author_role} className="px-1.5 py-0 text-[9px]" />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => remove(m.id)}
                        className="p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-2xl p-3.5 text-sm leading-relaxed",
                      mine ? "rounded-tr-none bg-bubble text-chalk shadow-md" : "rounded-tl-none border border-border bg-surface",
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-surface p-2 shadow-lg">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          autoComplete="off"
          placeholder={`Type a team message as ${profile?.name}...`}
          className="field flex-1"
        />
        <Button type="submit" variant="hero" disabled={sending || !text.trim()}>
          Send ➔
        </Button>
      </form>
    </div>
  );
}
