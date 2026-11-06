<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Club ranks live in `public.user_roles` (enum `club_rank`); every rank, chat-access, review and removal change goes through the SECURITY DEFINER RPCs (`assign_rank`, `set_chat_access`, `approve_member`, `remove_member`, `restore_member`) — why: the database, not the browser, enforces the hierarchy.
- `src/lib/ranks.ts` mirrors the database rank rules only to decide what the UI shows; keep it and the SQL functions in sync and cover rule changes in `src/lib/ranks.test.ts` — why: the UI must never offer an action the database will reject.
- Public club content (club info, news, fixtures, playbook, squad, staff) is read through `queryOptions` in `src/lib/club-data.ts` with route loaders + `useSuspenseQuery`; team chat and admin data are client-only queries — why: public pages SSR, private data needs the signed-in session.
- Chat and announcement author name/rank are filled by database triggers from the poster's profile — why: clients cannot spoof authorship.
- Coach Teal AI runs through `askCoachTeal` (`src/lib/coach.functions.ts`) on Lovable AI Gateway with server-only prompt/helpers in `*.server.ts` — why: keeps the key and prompt off the browser.
- Club images are served from `public/assets/**` and referenced by path in database rows — why: admins enter image paths in forms.
- Fixed site copy and pictures go through `EditableText`/`EditableImage` (stored in `public.site_content` by key, hardcoded text is only the fallback); record fields shown on pages use `EditableField`/`EditableRecordImage` from `src/components/club/site-editor.tsx` — why: Admin+ can change anything in place and it persists for everyone.
- Uploaded pictures live in the private `site-media` bucket and are served via `/api/public/media/*` — why: the workspace blocks public buckets, and this route only returns image files from that bucket.
