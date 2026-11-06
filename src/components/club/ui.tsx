import type { ImgHTMLAttributes, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getRank, type Tone } from "@/lib/ranks";
import { FALLBACK_IMAGE } from "@/lib/club-config";
import { EditableText } from "./site-editor";

const TONE_CLASS: Record<Tone, string> = {
  violet: "tone-violet",
  teal: "tone-teal",
  blue: "tone-blue",
  emerald: "tone-emerald",
  slate: "tone-slate",
  amber: "tone-amber",
  gold: "tone-gold",
  cyan: "tone-cyan",
  rose: "tone-rose",
};

export function toneClass(tone: string | null | undefined) {
  return TONE_CLASS[(tone as Tone) ?? "teal"] ?? "tone-teal";
}

export function Chip({ tone = "teal", className, children }: { tone?: Tone | string; className?: string; children: ReactNode }) {
  return <span className={cn("chip", toneClass(tone), className)}>{children}</span>;
}

export function RankBadge({ role, className }: { role: string | null | undefined; className?: string }) {
  const rank = getRank(role);
  return (
    <Chip tone={rank.tone} className={cn("rounded-md", className)}>
      {rank.id}
    </Chip>
  );
}

export function PageHeader({
  contentKey,
  eyebrow,
  icon,
  title,
  subtitle,
  actions,
}: {
  /** Prefix for the editable heading texts, e.g. "announcements". */
  contentKey: string;
  eyebrow: string;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 border-b border-primary/20 pb-6 sm:flex-row sm:items-center">
      <div>
        <div className="eyebrow mb-1">
          {icon}
          <EditableText k={`${contentKey}.eyebrow`} fallback={eyebrow} label="small heading" />
        </div>
        <EditableText as="h1" k={`${contentKey}.title`} fallback={title} label="page title" className="page-title text-4xl sm:text-5xl" />
        {subtitle && (
          <EditableText as="p" k={`${contentKey}.subtitle`} fallback={subtitle} label="page subtitle" className="mt-1 block text-sm text-muted-foreground" />
        )}
      </div>
      {actions}
    </div>
  );
}

export function PermissionNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface/50 py-14 text-center text-muted-foreground">
      <p className="text-base font-bold text-foreground">{title}</p>
      {body && <p className="mt-1 text-xs">{body}</p>}
    </div>
  );
}

export function ClubDialog({
  open,
  onOpenChange,
  title,
  children,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto rounded-2xl border-primary/30 bg-surface p-0 sm:rounded-2xl",
          wide ? "max-w-3xl" : "max-w-xl",
        )}
      >
        <DialogHeader className="border-b border-border bg-deep/60 px-6 py-4">
          <DialogTitle className="flex items-center gap-3 font-display text-xl font-bold uppercase tracking-wide">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 pt-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function SafeImg({
  src,
  alt,
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "onError"> & { src?: string | null; alt: string }) {
  return (
    <img
      {...rest}
      src={src || FALLBACK_IMAGE}
      alt={alt}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
      }}
    />
  );
}
