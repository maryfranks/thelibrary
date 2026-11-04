# Implementation Tasks: The Library

## Task 1: Wire Up Dynamic Intro Content & Terminal Loading

### Context

Currently, `src/routes/index.tsx` displays hardcoded mock terminal lines from an in-memory `INTRO` array. The project has a `content.json` file containing an `intro` array of strings.

### Objectives

1. Connect `src/routes/index.tsx` to read the intro narrative lines from `content.json` instead of the hardcoded `INTRO` array.
2. Maintain presentational terminal styling: system/help lines may remain as `sys` kinds, while lines loaded from `content.intro` should render with kind `out`.
3. Ensure initial state does not cause hydration mismatches or layout shifts.

### Acceptance Criteria

- [ ] Hardcoded narrative lines in `src/routes/index.tsx` are removed.
- [ ] Initial terminal render displays all lines from `content.json` under the `intro` key.
- [ ] `bun run test` passes with zero failures.
- [ ] `bun run lint` and `bun run build` succeed with no errors.

---

## Task 2: Stage 1 Engine Implementation (Vestibule)

### Context

Implement the headless game engine logic for Stage 1 (Vestibule) as defined in `game_map.md`.

### Objectives

1. Implement headless state machine transitions in `src/engine/` for all Stage 1 nodes.
2. Implement inventory tracking for picking up the mop.
3. Handle the death and respawn transition for `stage1_vestibule` when attempting to leave.
4. Support progression into `stage2_foyer` via turnstile choices.

### Acceptance Criteria

- [ ] Unit tests created in `src/engine/__tests__/stage1.test.ts`.
- [ ] Tests verify all choice inputs transition to expected node IDs per `game_map.md`.
- [ ] Tests verify inventory contains `mop` only when picked up.
- [ ] Tests verify fatal choices transition to the correct respawn node.
- [ ] `bun run test` passes.

---

## Task 3: Stage 2 Engine Implementation (Foyer & Reading Room Door)

### Context

Implement the headless game engine logic for Stage 2 (Foyer) as defined in `game_map.md`.

### Objectives

1. Implement Stage 2 node transitions and inventory mutations in `src/engine/`.
2. Support looting actions for the corpse and desk, tracking acquired items in engine state.
3. Implement conditional checks (presence of `mop` for periodicals check, presence of `stacks key` for stacks door).
4. Implement item exchange at the fireplace (acquiring fireplace poker and dropping mop).
5. Implement death choices, supporting respawn to `stage1_pack_checked` or transition to `game_over`.

### Acceptance Criteria

- [ ] Unit tests created in `src/engine/__tests__/stage2.test.ts`.
- [ ] Tests verify corpse and desk looting update inventory state correctly.
- [ ] Tests verify item checks (mop, stacks key) correctly gate progression or trigger death nodes.
- [ ] Tests verify picking up the poker drops the mop from inventory.
- [ ] Tests verify respawn and game over transitions.
- [ ] `bun run test` passes.

---

## Task 4: Stage 3 Engine Implementation (The Stacks)

### Context

Implement the headless game engine logic for Stage 3 (The Stacks) as defined in `game_map.md`.

### Objectives

1. Implement Stage 3 state transitions and safety flag tracking for stack rows (`row1_safe` through `row5_safe`).
2. Enforce item requirement (`fireplace poker`) at the arrival ambush.
3. Enforce the double-peek fatal condition on Row 5 and the blind-entry hazards across Rows 1–4.
4. Support looting Row 2 and Row 4, adding items to inventory.
5. Enforce flashlight requirement at Row 2 to transition into Stage 4.

### Acceptance Criteria

- [ ] Unit tests created in `src/engine/__tests__/stage3.test.ts`.
- [ ] Tests verify row safety checks prevent fatal traps when moving down rows.
- [ ] Tests verify Row 5 peek counter / death condition.
- [ ] Tests verify looting Row 2 and Row 4 correctly populates inventory.
- [ ] Tests verify flashlight check blocks or advances to Stage 4.
- [ ] `bun run test` passes.

---

## Task 5: Stage 4 Engine Implementation (Deep Stacks Maze)

### Context

Implement the headless game engine logic for Stage 4 (Deep Stacks Maze) as defined in `game_map.md`.

### Objectives

1. Implement Stage 4 maze graph, directional choices, and loopback navigation (Junction D -> Junction A, Junction H -> Junction E).
2. Enforce item check for `pocketknife` at Junction C to advance through the tapestry.
3. Implement hazard dead ends and route to `stage4_death_choice`.
4. Support progression from Junction H to `stage4_structural_hub`.

### Acceptance Criteria

- [ ] Unit tests created in `src/engine/__tests__/stage4.test.ts`.
- [ ] Tests verify maze pathing, including loopbacks from Junction D and Junction H.
- [ ] Tests verify pocketknife gate correctly checks inventory.
- [ ] Tests verify fatal junction choices lead to `stage4_death_choice`.
- [ ] `bun run test` passes.

---

## Task 6: Stage 5 Engine Implementation (Endgame, Mezzanine, Basement & Win)

### Context

Implement the headless game engine logic for Stage 5 (Upper Mezzanine and Flooded Basement to Exit) as defined in `game_map.md`.

### Objectives

1. Implement the Upper Mezzanine path, including fatal encounters and umbrella check branch handling.
2. Implement the Basement path, enforcing the umbrella check as a survival gate into the flooded corridor.
3. Implement movement progression in the flooded corridor steps (handling fatal choices for rushing vs slow movement).
4. Implement Occult Archive hub choices, cave approach, and the final transition to `game_win`.

### Acceptance Criteria

- [ ] Unit tests created in `src/engine/__tests__/stage5.test.ts`.
- [ ] Tests verify mezzanine path fatal endings and umbrella branch handling.
- [ ] Tests verify basement umbrella check acts as survival gate.
- [ ] Tests verify water sequence movement choices.
- [ ] Tests verify reaching `game_win` and `game_over`.
- [ ] Complete end-to-end integration test verifies a full winning playthrough from start to finish.
- [ ] `bun run test` passes.

---

## Task 7: OpenTelemetry Instrumentation (Runs & Death Metrics)

### Context

Track overall run completion and death analysis for observability dashboards using OpenTelemetry counters.

### Objectives

1. Establish an OpenTelemetry utility in `src/engine/telemetry.ts` exporting a cleanly initialized Meter and typed helper functions.
2. Create and configure two monotonic counters:
   - `game.runs.completed`
     - Attributes:
       - `outcome`: `"win"` | `"loss"`
       - `final_stage`: `"stage1"` | `"stage2"` | `"stage3"` | `"stage4"` | `"stage5"`
   - `game.deaths`
     - Attributes:
       - `stage`: `"stage1"` | `"stage2"` | `"stage3"` | `"stage4"` | `"stage5"`
       - `death_type`: `"monster_attack"` | `"environmental_hazard"` | `"unknown_death"`
       - `node_id`: string (the node where the fatal action was taken)
3. Instrument the game engine to emit `game.deaths` on every fatal choice transition across Stages 1–5 using the death types specified in `game_map.md`.
4. Instrument the engine to emit `game.runs.completed` when reaching `game_win` (`outcome: "win"`) or when choosing "give up" on a death screen / hitting `game_over` (`outcome: "loss"`).
5. Ensure telemetry calls handle missing collectors gracefully without throwing runtime errors during tests or offline gameplay.

### Acceptance Criteria

- [ ] `src/engine/telemetry.ts` exports typed recording helpers.
- [ ] Engine dispatches `game.deaths` on all fatal transitions with exact `death_type`, `stage`, and `node_id` attributes.
- [ ] Engine dispatches `game.runs.completed` on terminal outcomes (`win` and `loss`).
- [ ] Unit tests in `src/engine/__tests__/telemetry.test.ts` verify metrics are recorded with expected attributes.
- [ ] Existing stage test suites continue passing with telemetry active.
- [ ] `bun run test`, `bun run lint`, and `bun run build` succeed.
