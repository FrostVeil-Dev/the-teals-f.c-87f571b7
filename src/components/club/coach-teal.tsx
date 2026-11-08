import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { askCoachTeal, type CoachMode, type CoachModel } from "@/lib/coach.functions";
import { useAuth } from "@/hooks/use-auth";
import { CLUB_CONFIG, FALLBACK_IMAGE } from "@/lib/club-config";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "coach-teal:open";

/** Opens the floating Coach Teal window from anywhere (e.g. the home page button). */
export function openCoachTeal() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

interface Msg {
  role: "user" | "assistant";
  text: string;
  time: string;
}

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const GREETING = `Hey there! I'm **Coach Teal**, your official AI Tactical Advisor for **${CLUB_CONFIG.name}**.

How can I help you today? Ask me about our **Tiki-Taka attacking system**, **Faraz & Johan's defensive partnership**, player duties for **Henil, Hani, or Ryhaan**, or custom **training drills**!`;

const STARTERS = [
  { label: "⚽ Tiki-Taka attacking system", prompt: "Explain our Tiki-Taka attacking system and build-up play" },
  { label: "🛡 Faraz & Johan defense", prompt: "Analyze Faraz and Johan's central defensive partnership" },
  { label: "🎯 Henil box striker role", prompt: "Break down Henil's role as box striker and how he finds space" },
  { label: "🏃 Passing triangle drill", prompt: "Give me a high-tempo passing triangle drill for our midfield" },
];

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(tok.startsWith("**") ? <strong key={i++}>{tok.slice(2, -2)}</strong> : <em key={i++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((raw, idx) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <div key={idx} className="h-1.5" />;
        if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) return <hr key={idx} className="my-2 border-border" />;
        const quote = line.match(/^\s*>\s?(.*)$/);
        if (quote) return <blockquote key={idx} className="border-l-2 border-primary pl-3 italic text-primary">{inline(quote[1] ?? "")}</blockquote>;
        const heading = line.match(/^#{1,4}\s+(.*)$/);
        if (heading) return <p key={idx} className="font-bold text-primary">{inline(heading[1] ?? "")}</p>;
        const bullet = line.match(/^\s*[-*]\s+(.*)$/);
        if (bullet) return <li key={idx} className="ml-4 list-disc">{inline(bullet[1] ?? "")}</li>;
        const num = line.match(/^\s*(\d+)\.\s+(.*)$/);
        if (num) return <li key={idx} className="ml-4 list-decimal">{inline(num[2] ?? "")}</li>;
        return <p key={idx}>{inline(line)}</p>;
      })}
    </div>
  );
}

export function CoachTeal() {
  const { profile } = useAuth();
  const ask = useServerFn(askCoachTeal);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<CoachMode>("tactical");
  const [model, setModel] = useState<CoachModel>("google/gemini-3.8-flash");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>(() => [{ role: "assistant", text: GREETING, time: "" }]);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
    if (open && !busy) inputRef.current?.focus();
  }, [messages, open, busy]);

  async function send(prompt: string) {
    const text = prompt.trim();
    if (!text || busy) return;
    const history: Msg[] = [...messages, { role: "user", text, time: now() }];
    setMessages(history);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({
        data: { messages: history.map((m) => ({ role: m.role, text: m.text })), model, roleMode: mode },
      });
      setMessages((h) => [
        ...h,
        res.ok
          ? { role: "assistant", text: res.text, time: now() }
          : { role: "assistant", text: `⚠️ **Coach Teal could not respond**: ${res.error}`, time: now() },
      ]);
    } catch (err) {
      setMessages((h) => [
        ...h,
        { role: "assistant", text: `⚠️ **Coach Teal could not respond**: ${(err as Error).message}`, time: now() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    if (!window.confirm("Reset conversation with Coach Teal?")) return;
    setMessages([
      {
        role: "assistant",
        text: `Conversation reset! How can I help you today with **${CLUB_CONFIG.name}** tactics, training, or matches?`,
        time: now(),
      },
    ]);
    toast.info("Chat history reset");
  }

  if (!profile?.isApproved) return null;

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
        <button
          onClick={() => setOpen((o) => !o)}
          className="glow-teal group flex items-center gap-2.5 rounded-full border-2 border-primary bg-deep/95 px-4 py-3 transition-transform hover:scale-105 sm:px-5 sm:py-3.5"
          aria-label="Open Coach Teal AI chat"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-primary bg-surface">
            <img src={CLUB_CONFIG.logoUrl} alt="" className="h-6 w-6 object-contain" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 animate-pulse rounded-full border border-deep bg-success" />
          </span>
          <span className="flex flex-col pr-1 text-left">
            <span className="flex items-center gap-1.5 font-display text-sm font-extrabold uppercase leading-none tracking-wide sm:text-base">
              Coach Teal <span className="rounded bg-primary px-1 text-[10px] font-bold text-primary-foreground">AI</span>
            </span>
            <span className="mt-0.5 hidden text-[10px] font-medium leading-tight text-primary/80 sm:inline">Tactical Advisor</span>
          </span>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Coach Teal AI Assistant"
          className="animate-fade-up fixed bottom-20 right-3 z-50 flex h-[580px] max-h-[82vh] w-[94vw] flex-col overflow-hidden rounded-3xl border border-primary/40 bg-deep/95 shadow-2xl backdrop-blur-xl sm:bottom-24 sm:right-6 sm:w-[450px]"
        >
          <div className="flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/50 bg-teal-deep p-1">
                <img src={CLUB_CONFIG.logoUrl} alt="" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-base font-extrabold uppercase tracking-wider">Coach Teal</h3>
                  <span className="chip tone-teal rounded px-1.5 text-[9px]">AI Tactical Advisor</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Powered by Lovable AI • {CLUB_CONFIG.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={reset} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Clear chat history">
                <Trash2 className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close chat">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-deep px-4 py-2 text-xs">
            <label className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Role:</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as CoachMode)}
                className="rounded-lg border border-input bg-surface px-2 py-1 text-[11px] font-bold text-primary focus:outline-none"
              >
                <option value="tactical">⚽ Tactical Coach</option>
                <option value="matchday">📅 Matchday Analyst</option>
                <option value="drills">⚡ Training Drills</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Speed:</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as CoachModel)}
                className="rounded-lg border border-input bg-surface px-2 py-1 text-[11px] text-foreground focus:outline-none"
              >
                <option value="google/gemini-3.8-flash">3.8 Flash (Smart)</option>
                <option value="google/gemini-3.1-flash-lite">3.1 Lite (Fast)</option>
              </select>
            </label>
          </div>

          <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            {messages.map((m, i) => {
              const mine = m.role === "user";
              return (
                <div key={i} className={cn("flex items-start gap-2.5", mine && "flex-row-reverse")}>
                  <img
                    src={mine ? profile?.photoURL || FALLBACK_IMAGE : CLUB_CONFIG.logoUrl}
                    alt=""
                    className={cn("h-7 w-7 flex-shrink-0 rounded-full object-cover", mine ? "ring-2 ring-primary" : "bg-surface p-0.5 ring-2 ring-violet")}
                  />
                  <div className="max-w-[85%] space-y-1">
                    <div className={cn("flex items-center gap-1.5", mine && "justify-end")}>
                      <span className={cn("text-[11px] font-bold", mine ? "text-primary" : "text-violet")}>
                        {mine ? profile?.name || "You" : "Coach Teal"}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{m.time}</span>
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl p-3 leading-relaxed",
                        mine ? "rounded-tr-none bg-bubble text-chalk" : "rounded-tl-none border border-primary/20 bg-surface",
                      )}
                    >
                      {mine ? m.text : <Markdown text={m.text} />}
                    </div>
                  </div>
                </div>
              );
            })}
            {busy && (
              <div className="flex items-start gap-2.5">
                <img src={CLUB_CONFIG.logoUrl} alt="" className="h-7 w-7 rounded-full bg-surface p-0.5 ring-2 ring-violet" />
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-primary/20 bg-surface p-3 text-xs">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d * 0.2}s` }} />
                  ))}
                  <span className="ml-1 text-[11px] text-muted-foreground">Coach Teal is analyzing tactics...</span>
                </div>
              </div>
            )}
          </div>

          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-border/60 bg-deep px-3 py-2">
            {STARTERS.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.prompt)}
                disabled={busy}
                className="whitespace-nowrap rounded-full border border-primary/30 bg-surface px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-teal-deep/60 disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-border bg-surface/90 p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              maxLength={4000}
              autoComplete="off"
              placeholder="Ask Coach Teal about tactics, drills, players..."
              className="field flex-1"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "…" : "Send"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
