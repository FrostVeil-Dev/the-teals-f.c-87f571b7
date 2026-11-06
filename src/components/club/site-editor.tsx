import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useQueryClient, useSuspenseQuery, type QueryKey } from "@tanstack/react-query";
import { ImagePlus, Pencil, RotateCcw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { canUseSiteEditor } from "@/lib/ranks";
import { resetSiteContent, saveSiteContent, siteContentQuery, uploadSiteImage } from "@/lib/site-content";
import { FALLBACK_IMAGE } from "@/lib/club-config";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Edit-mode context                                                    */
/* ------------------------------------------------------------------ */

type EditKind = "text" | "multiline" | "image" | "number";

interface EditRequest {
  label: string;
  kind: EditKind;
  value: string;
  onSave: (value: string) => Promise<void>;
  onReset?: (() => Promise<void>) | undefined;
}

interface SiteEditorState {
  canEdit: boolean;
  editing: boolean;
  setEnabled: (on: boolean) => void;
  open: (req: EditRequest) => void;
}

const SiteEditorContext = createContext<SiteEditorState>({
  canEdit: false,
  editing: false,
  setEnabled: () => {},
  open: () => {},
});

export const useSiteEditor = () => useContext(SiteEditorContext);

export function SiteEditorProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const canEdit = profile ? canUseSiteEditor(profile.role) : false;
  const [enabled, setEnabled] = useState(false);
  const [request, setRequest] = useState<EditRequest | null>(null);
  const editing = canEdit && enabled;

  return (
    <SiteEditorContext.Provider value={{ canEdit, editing, setEnabled, open: setRequest }}>
      {children}
      {canEdit && <EditModeToggle editing={editing} onToggle={() => setEnabled(!enabled)} />}
      <EditorDialog request={request} onClose={() => setRequest(null)} />
    </SiteEditorContext.Provider>
  );
}

function EditModeToggle({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  return (
    <div className="fixed bottom-5 left-5 z-50 flex max-w-xs flex-col items-start gap-2">
      {editing && (
        <div className="rounded-xl border border-primary/40 bg-surface/95 px-3 py-2 text-[11px] leading-snug text-secondary-foreground shadow-xl backdrop-blur">
          <strong className="text-primary">Edit Mode is on.</strong> Click anything with a dashed outline to change its words or picture. Saved
          changes stay for everyone until you change them again.
        </div>
      )}
      <Button variant={editing ? "hero" : "violet"} onClick={onToggle} className="shadow-2xl" aria-pressed={editing}>
        {editing ? <X /> : <Pencil />}
        {editing ? "Done Editing" : "Edit Site"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editor dialog                                                        */
/* ------------------------------------------------------------------ */

function EditorDialog({ request, onClose }: { request: EditRequest | null; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (request) setValue(request.value);
  }, [request]);

  async function run(action: () => Promise<void>, message: string) {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!request) return;
    const trimmed = value.trim();
    if (!trimmed && request.kind !== "multiline") {
      toast.error("This can't be empty. Use “Reset to original” to restore the default.");
      return;
    }
    if (request.kind === "number" && Number.isNaN(Number(trimmed))) {
      toast.error("Please enter a number");
      return;
    }
    void run(() => request.onSave(trimmed), "Saved! Everyone now sees the change.");
  }

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-2xl border-primary/30 bg-surface p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border bg-deep/60 px-6 py-4">
          <DialogTitle className="flex items-center gap-3 font-display text-xl font-bold uppercase tracking-wide">
            <Pencil className="h-4 w-4 text-primary" />
            Edit {request?.label}
          </DialogTitle>
        </DialogHeader>
        {request && (
          <form onSubmit={submit} className="space-y-4 px-6 pb-6 pt-2">
            {request.kind === "image" ? (
              <ImageInput value={value} onChange={setValue} />
            ) : request.kind === "multiline" ? (
              <textarea className="field min-h-40" autoFocus maxLength={20000} value={value} onChange={(e) => setValue(e.target.value)} />
            ) : (
              <input
                className="field"
                autoFocus
                type={request.kind === "number" ? "number" : "text"}
                maxLength={2000}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {request.onReset ? (
                <Button
                  type="button"
                  variant="club"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Restore the original text/picture?")) void run(request.onReset!, "Restored to the original.");
                  }}
                >
                  <RotateCcw /> Reset to original
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="club" onClick={onClose} disabled={busy}>
                  Cancel
                </Button>
                <Button type="submit" variant="hero" disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Picture field: upload from the device or paste a link, with a live preview. */
export function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadSiteImage(file));
      toast.success("Picture uploaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-border bg-deep">
        {value ? (
          <img src={value} alt="Preview" className="h-full w-full object-contain" onError={(e) => (e.currentTarget.src = FALLBACK_IMAGE)} />
        ) : (
          <ImagePlus className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="field flex-1"
          maxLength={500}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste an image link, or upload →"
          aria-label="Image link"
        />
        <Button type="button" variant="soft" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Upload /> {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">PNG, JPG, WEBP, GIF or AVIF — up to 10 MB.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editable building blocks                                             */
/* ------------------------------------------------------------------ */

function editableProps(editing: boolean, open: () => void, label: string) {
  if (!editing) return {};
  return {
    role: "button",
    tabIndex: 0,
    title: `Click to edit ${label}`,
    "aria-label": `Edit ${label}`,
    onClick: (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      open();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        open();
      }
    },
  };
}

/** Read a site-wide text value (or its default) without rendering an editor. */
export function useSiteText(key: string, fallback: string) {
  const { data } = useSuspenseQuery(siteContentQuery);
  return data[key] ?? fallback;
}

/** Fixed site text (headings, labels, paragraphs) that Admin+ can rewrite in Edit Mode. */
export function EditableText({
  k,
  fallback,
  as = "span",
  multiline,
  label,
  className,
}: {
  k: string;
  fallback: string;
  as?: ElementType;
  multiline?: boolean;
  label?: string;
  className?: string;
}) {
  const Tag = as;
  const { data } = useSuspenseQuery(siteContentQuery);
  const { editing, open } = useSiteEditor();
  const queryClient = useQueryClient();
  const custom = data[k];
  const value = custom ?? fallback;
  const name = label ?? "text";
  const refresh = () => queryClient.invalidateQueries({ queryKey: siteContentQuery.queryKey });

  return (
    <Tag
      className={cn(className, editing && "cms-editable")}
      {...editableProps(
        editing,
        () =>
          open({
            label: name,
            kind: multiline ? "multiline" : "text",
            value,
            onSave: async (v) => {
              await saveSiteContent(k, v);
              await refresh();
            },
            onReset:
              custom !== undefined
                ? async () => {
                    await resetSiteContent(k);
                    await refresh();
                  }
                : undefined,
          }),
        name,
      )}
    >
      {value}
    </Tag>
  );
}

/** Fixed site picture (crest, kit photo, banners) that Admin+ can replace in Edit Mode. */
export function EditableImage({
  k,
  fallback,
  alt,
  label,
  className,
  loading,
}: {
  k: string;
  fallback: string;
  alt: string;
  label?: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const { data } = useSuspenseQuery(siteContentQuery);
  const { editing, open } = useSiteEditor();
  const queryClient = useQueryClient();
  const custom = data[k];
  const src = custom || fallback;
  const name = label ?? "picture";
  const refresh = () => queryClient.invalidateQueries({ queryKey: siteContentQuery.queryKey });

  return (
    <img
      src={src || FALLBACK_IMAGE}
      alt={alt}
      loading={loading}
      className={cn(className, editing && "cms-editable")}
      onError={(e) => {
        if (!e.currentTarget.src.endsWith(FALLBACK_IMAGE)) e.currentTarget.src = FALLBACK_IMAGE;
      }}
      {...editableProps(
        editing,
        () =>
          open({
            label: name,
            kind: "image",
            value: src,
            onSave: async (v) => {
              await saveSiteContent(k, v);
              await refresh();
            },
            onReset:
              custom !== undefined
                ? async () => {
                    await resetSiteContent(k);
                    await refresh();
                  }
                : undefined,
          }),
        name,
      )}
    />
  );
}

/* Records stored in club tables (players, staff, news, fixtures…) */

export type EditableTable =
  | "announcements"
  | "transfers_news"
  | "fixtures"
  | "playbook_tactics"
  | "team_principles"
  | "squad_members"
  | "staff"
  | "club_info"
  | "league_stats";

type UpdateBuilder = {
  update: (patch: Record<string, unknown>) => {
    eq: (column: string, value: string | number) => {
      select: (columns: string) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
};

export async function updateRecord(
  table: EditableTable,
  idColumn: string,
  id: string | number,
  patch: Record<string, unknown>,
) {
  const builder = supabase.from(table) as unknown as UpdateBuilder;
  const { data, error } = await builder.update(patch).eq(idColumn, id).select(idColumn);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("You don't have permission to change this.");
}

interface RecordTarget {
  table: EditableTable;
  id: string | number;
  /** One column, or several columns that should receive the same value. */
  column: string | string[];
  idColumn?: string;
  queryKey: QueryKey;
  label?: string;
}

function useRecordSaver({ table, id, column, idColumn = "id", queryKey }: RecordTarget, kind: EditKind) {
  const queryClient = useQueryClient();
  return async (v: string) => {
    const cols = Array.isArray(column) ? column : [column];
    const parsed: unknown = kind === "number" ? (v === "" ? null : Number(v)) : v;
    await updateRecord(table, idColumn, id, Object.fromEntries(cols.map((c) => [c, parsed])));
    await queryClient.invalidateQueries({ queryKey });
  };
}

/** A name/text/number stored on a club record, editable in place in Edit Mode. */
export function EditableField({
  value,
  kind = "text",
  as = "span",
  className,
  children,
  ...target
}: RecordTarget & {
  value: string | number | null | undefined;
  kind?: Exclude<EditKind, "image">;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}) {
  const Tag = as;
  const { editing, open } = useSiteEditor();
  const save = useRecordSaver(target, kind);
  const name = target.label ?? "text";
  return (
    <Tag
      className={cn(className, editing && "cms-editable")}
      {...editableProps(editing, () => open({ label: name, kind, value: value == null ? "" : String(value), onSave: save }), name)}
    >
      {children ?? (value === "" || value == null ? editing ? <span className="italic opacity-60">(empty — click to add)</span> : null : value)}
    </Tag>
  );
}

/** A picture stored on a club record, replaceable in place in Edit Mode. */
export function EditableRecordImage({
  src,
  alt,
  className,
  loading,
  ...target
}: RecordTarget & { src: string | null | undefined; alt: string; className?: string; loading?: "lazy" | "eager" }) {
  const { editing, open } = useSiteEditor();
  const save = useRecordSaver(target, "image");
  const name = target.label ?? "picture";
  return (
    <img
      src={src || FALLBACK_IMAGE}
      alt={alt}
      loading={loading}
      className={cn(className, editing && "cms-editable")}
      onError={(e) => {
        if (!e.currentTarget.src.endsWith(FALLBACK_IMAGE)) e.currentTarget.src = FALLBACK_IMAGE;
      }}
      {...editableProps(editing, () => open({ label: name, kind: "image", value: src ?? "", onSave: save }), name)}
    />
  );
}
