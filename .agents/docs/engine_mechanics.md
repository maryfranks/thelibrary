<!-- Agent-writable runtime specification. Documents implementation invariants, auto-resolve loops, snapshot lifecycles, and helper contracts not expressed in the read-only `.agents/docs/game_map.md` state graph. -->

# Engine Mechanics

## Check-Node Resolution (`src/engine/transition.ts`)

- `transition()` dispatches input to the stage handler, then loops (max 10 steps) while the resulting node is in `AUTO_RESOLVE_NODES`, re-dispatching with empty input and concatenating output so check nodes never rest as menus and chained checks resolve in a single call.
- Unmatched input in Stage 2 yields a parser fallback rather than a death; deaths occur only on explicit choices.

## Inventory Snapshots & Stage Respawn / Retry (`src/engine/`)

- Stage 2 Snapshot: Captured upon entering `stage2_foyer` from Stage 1 (preserving Stage 1 inventory).
- Stage 3 Snapshot: Captured upon surviving arrival at `stage3_arrival` and transitioning to `stage3_hub_unexplored`.
- Stage 2 Death Retry: Restores `stage2InventorySnapshot` before entering `stage2_respawn_check`, discarding any items gathered during Stage 2.
- Stage 3 Arrival Death Retry: Retrying before a Stage 3 snapshot exists restores `stage2InventorySnapshot` and routes through `stage2_respawn_check` to prevent soft-locks.
- Stage 3 Hub & Row Death Retry: Preserves acquired Stage 3 items and resets all row peering flags (`row1_safe`–`row5_safe` to `false`) before returning to `stage3_hub`.

## Inventory Display (`src/engine/commands.ts`)

- `processCommand` emits a `sys` line `Inventory: ...` whenever inventory changes (pick up, search, fireplace) and on `look in the pack` at `stage1_pack_checked` and Stage 2 search nodes.

## Choice Prompt (`src/engine/prompt.ts`)

- Pure helpers render the numbered `Do you want to:` list from `getAvailableChoices(nodeId)` (empty for terminal nodes).
- `formatChoicePrompt(nodeId)` appends to initial output on load; `getTransitionPrompt(next)` appends after a transition for non-terminal states (`!next.isGameOver && !next.isWin`).
- `src/engine/commands.ts` (`getSceneEntries`, `processCommand`) calls these helpers; the UI shell (`src/routes/index.tsx`) never constructs prompt text directly.

## Stage 4 Loopback Death-Screen Reuse (`src/engine/stage4.ts`)

- `stage4_junction_d_loopback` (`"go straight"`) sets `deathScreenNode: "stage4_junction_a"` so `getDeathScreenLines` resolves `stage4_junction_a__go_straight` instead of duplicating identical death text in `content.json`, while `recordDeath` still logs `node_id: "stage4_junction_d_loopback"`.
