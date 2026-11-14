# Engine Mechanics

## Check-Node Resolution (`src/engine/transition.ts`)
- `transition()` dispatches the input to the stage handler, then loops (max 10 steps) while the resulting node is in `AUTO_RESOLVE_NODES`, re-dispatching with empty input and concatenating output. Check nodes (respawn, periodicals, stacks door, flashlight, pocketknife, umbrella, etc.) never rest as menus, and chained checks resolve in one call.
- The periodicals gate (`stage2_periodicals_check`) requires the mop only (`inventory.includes("mop")`); the fireplace poker alone does not pass.
- `stage2_respawn_check` evaluates weapon possession against the restored Stage 2 snapshot (`mop` routes to `stage2_foyer`; empty routes to `stage2_respawn_no_mop`).
- Unmatched input in Stage 2 yields a parser fallback, not a death; deaths occur only on explicit choices (e.g., `go deeper` at `stage2_foyer`).
- `stage3_row2_flashlight_check` transitions `[With Flashlight]` to the terminal `temporary_game_over` node (`isGameOver: true`, excluded from `isActiveSession()`, no further gameplay commands) and records a `mysterious_disappearance` death metric.

## Inventory Snapshots & Stage Respawn / Retry (`src/engine/`)
- Stage 2 Snapshot: Captured upon entering `stage2_foyer` from Stage 1 (preserving `["mop"]` or `[]`).
- Stage 3 Snapshot: Captured upon surviving arrival at `stage3_arrival` (requiring the fireplace poker) and transitioning to `stage3_hub_unexplored`.
- Stage 2 Death Retry: Retrying from `stage2_death_choice` restores `stage2InventorySnapshot` and routes into `stage2_respawn_check`. If the snapshot contains the mop, the player respawns at `stage2_foyer`. If no mop was brought, the player lands at `stage2_respawn_no_mop` with the restored empty snapshot. Any items gathered during Stage 2 (fireplace poker, stacks key, corpse loot, desk items) are discarded on respawn.
- Stage 3 Arrival Death Retry: Dying to the arrival ambush (entering with the mop instead of the poker) transitions to `stage3_early_death_choice`. Retrying before a Stage 3 snapshot is captured restores `stage2InventorySnapshot` and routes through `stage2_respawn_check` to `stage2_foyer` (or `stage2_respawn_no_mop` if mopless), preventing soft-locks and allowing the player to retrieve the poker.
- Stage 3 Early Post-Arrival Death Retry (`stage3_early_death_choice`): Dying after surviving arrival before exploring the hub (selecting `go deeper` at `stage3_hub_unexplored` or `stage3_foyer_blocked`) restores `stage3InventorySnapshot` and respawns the player at `stage3_hub_unexplored`.
- Stage 3 Hub & Row Death Retry (`stage3_death_choice`): Dying during hub or row explorations (or at `stage4_junction_c_check` without the pocketknife) preserves acquired Stage 3 items, resets all row peering flags (`row1_safe`–`row5_safe` to `false`), and respawns the player at `stage3_hub`.

## Inventory Display (`src/engine/commands.ts`)
- `processCommand` emits a `sys` line `Inventory: ...` when inventory changes (pick up, search, fireplace) and on `look in the pack` at `stage1_pack_checked` and Stage 2 search nodes.

## Choice Prompt (`src/engine/prompt.ts`)
- Pure helpers render the numbered `Do you want to:` list from `getAvailableChoices(nodeId)`; empty for terminal nodes.
- `formatChoicePrompt(nodeId)` is appended to the initial output on load; `getTransitionPrompt(prev, next)` appends it after a transition only when `currentNode` changed.
- The UI shell (`src/routes/index.tsx`) calls these helpers and does not build prompt text itself.
