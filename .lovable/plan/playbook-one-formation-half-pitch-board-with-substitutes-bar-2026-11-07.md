# Playbook: one-formation half-pitch board with substitutes bar

## What changes on the Playbook page
- The formation buttons (2-3-1 and others) and their fixed player bubbles are removed from the tactical board. Only one formation remains ("Teals Custom Lineup").
- The full pitch is replaced with a **half pitch** (your attacking half: goal, penalty box, arc, halfway line).
- A **Substitutes Bar** sits next to the pitch (below it on phones). It starts with **every player in the squad**; the pitch starts empty.
- Drag (mouse or finger) a player from the bar onto the pitch, move them anywhere on the grass, or drag them back to the bar. Maximum **10 players** on the pitch; the bar shows "10/10" and blocks an 11th.
- Clicking a player on the pitch shows their name/position in the side panel, as now.

## Edit button (Admin, Co-Owner, WEB HANDLER only)
- "Edit Lineup" button opens an advanced editor for this formation: list of placed players with exact position sliders/number boxes (left-right, up-down), rename the formation name and description, remove a player to the bench.
- "Save Lineup" stores the arrangement so every visitor sees it; "Clear to Bench" empties the pitch.
- Visitors and members can still drag players to try ideas, but their moves are not saved and reset on reload.

## Kept unchanged
- Tactical plays list, team principles, plan sheets, and all other sections below the board stay as they are. Old play data is not deleted.

## Technical details
- Reuse `src/lib/tactical-board.ts` (clamp, pool, parse/serialize, bench); add `MAX_ON_PITCH = 10` and a `canPlace` check; pool = all squad members (from existing squad query).
- Lineup saved in `site_content` under `playbook.board.custom` (Admin+ RLS already enforced).
- Pointer events (pointerdown/move/up with capture) for drag on both mouse and touch; positions stored as percentages of the half pitch.
- Run `src/lib/tactical-board.test.ts` plus a new test for the 10-player cap; browser-check dragging and save/reload as owner.
