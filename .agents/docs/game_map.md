# Gameplay 

> **Content Resolution & Decoupling Rules:**
> - Never hardcode narrative strings, parser fallbacks, or death screen keys in `src/engine/`. Always load `content.json` dynamically.
> - Node descriptions resolve via `content.nodes[nodeId]`.
> - Fatal transitions (`[DEAD: <death_type>]`) resolve death screen text via `content.death_screens["<nodeId>__<normalized_choice>"]` (spaces replaced with `_`).
> - Bracketed item-check branches (e.g., `[No Mop]`, `[With Mop]`) normalize with a `_check` suffix (e.g., `no_mop_check`, `with_mop_check`) when resolving `death_screens` keys, and automatically evaluate based on current inventory when entered from any stage (no menu is ever shown; a shared entry-resolution loop in `transition` resolves them).
> - Every death calls `recordDeath` exactly once (which flushes telemetry), including deaths followed by "try again". The inventory is printed whenever it changes and on "look in the pack".
> - Conditional branches with a fatal else path (e.g., `[If <cond> -> [<target>] | Else -> [DEAD: <death_type>]]`) resolve death screen text via `content.death_screens["<nodeId>__<normalized_choice>__else"]` (falling back to `"<nodeId>__<normalized_choice>"` if absent).
> - Unmatched inputs resolve via `content.parser_fallbacks`.

- [stage1_vestibule] Vestibule
  - Choice 1: "try to leave" -> [DEAD: monster_attack] -> [stage1_vestibule_respawn]
  - Choice 2: "look around" -> [stage1_vestibule_searched]

- [stage1_vestibule_respawn] Vestibule (Tutorial Respawn with Hint)
  - Choice 1: "look around" -> [stage1_vestibule_searched]

- [stage1_vestibule_searched] Vestibule (Explored & Pack Discovered)
  - Choice 1: "look around" -> [stage1_vestibule_searched]
  - Choice 2: "look in the pack" -> [stage1_pack_checked]

- [stage1_pack_checked] Vestibule (Pack Checked)
  - Choice 1: "look around" -> [stage1_vestibule_searched]
  - Choice 2: "look in the pack" -> [stage1_pack_checked]
  - Choice 3: "hop turnstiles" -> [stage1_turnstile_check]
  - Choice 4: "pick up mop" -> [stage1_mop_acquired]

- [stage1_turnstile_check] Turnstile Check (No Mop)
  - Choice 1: "look around" -> [stage1_vestibule_searched]
  - Choice 2: "look in the pack" -> [stage1_pack_checked]
  - Choice 3: "go back for mop" -> [stage1_mop_acquired]
  - Choice 4: "proceed anyway" -> [stage2_foyer]

- [stage1_mop_acquired] Vestibule (Mop Acquired)
  - Choice 1: "look around" -> [stage1_mop_acquired]
  - Choice 2: "look in the pack" -> [stage1_pack_checked]
  - Choice 3: "hop turnstiles" -> [stage2_foyer]

- [stage2_foyer] Foyer (Arrival)
  - Choice 1: "look around" -> [stage2_foyer_searched]
  - Choice 2: "go deeper" -> [DEAD: monster_attack] -> [stage2_death_choice]
  - (Unmatched input yields the parser fallback, not death.)

- [stage2_death_choice] Death Prompt (Stage 2). Inventory persists across deaths.
  - Choice 1: "try again" -> [stage2_respawn_check]
  - Choice 2: "give up" -> [game_over]

- [stage2_respawn_check] Respawn Check (Weapon Check; auto-resolves on entry, no menu)
  - [No Weapon: neither mop nor fireplace poker] -> prints the "you need the mop" text -> [stage1_vestibule_searched]
  - [With Weapon: mop OR fireplace poker] -> [stage2_foyer]

- [stage2_foyer_searched] Foyer (Explored)  
  - Choice 1: "look around" -> [stage2_foyer_searched]  
  - Choice 2: "look in the pack" -> [stage2_foyer_searched]  
  - Choice 3: "search corpse" -> [stage2_corpse_looted] (Acquire: lemon candy, pack of gum, mace, hair ties)  
  - Choice 4: "search desk" -> [stage2_desk_looted] (Acquire: small notebook, stacks key)  
  - Choice 5: "explore periodicals" -> [stage2_periodicals_check]

- [stage2_corpse_looted] Foyer (Corpse Looted)  
  - Choice 1: "look around" -> [stage2_corpse_looted]  
  - Choice 2: "look in the pack" -> [stage2_corpse_looted]  
  - Choice 3: "search desk" -> [stage2_both_looted] (Acquire: small notebook, stacks key)  
  - Choice 4: "explore periodicals" -> [stage2_periodicals_check]

- [stage2_desk_looted] Foyer (Desk Looted)  
  - Choice 1: "look around" -> [stage2_desk_looted]  
  - Choice 2: "look in the pack" -> [stage2_desk_looted]  
  - Choice 3: "search corpse" -> [stage2_both_looted] (Acquire: lemon candy, pack of gum, mace, hair ties)  
  - Choice 4: "explore periodicals" -> [stage2_periodicals_check]

- [stage2_both_looted] Foyer (Fully Looted)  
  - Choice 1: "look around" -> [stage2_both_looted]  
  - Choice 2: "look in the pack" -> [stage2_both_looted]  
  - Choice 3: "explore periodicals" -> [stage2_periodicals_check]

- [stage2_periodicals_check] Periodicals Check (Weapon Item Check; auto-resolves, no menu; searching corpse/desk first is optional)  
  - [No Weapon] -> [DEAD: monster_attack] -> [stage2_death_choice]
  - [With Weapon: mop OR fireplace poker] -> [stage2_reading_room_door]

- [stage2_reading_room_door] Reading Room Door
  - Choice 1: "rattle reading room door" -> [DEAD: monster_attack] -> [stage2_death_choice]  
  - Choice 2: "try the lock quietly" -> [stage2_reading_room_locked]

- [stage2_reading_room_locked] Reading Room Locked  
  - Choice 1: "look around" -> [stage2_fireplace_revealed]

- [stage2_fireplace_revealed] Foyer (Fireplace Revealed)  
  - Choice 1: "search fireplace" -> [stage2_poker_acquired] (Acquire: fireplace poker, drop: mop)  
  - Choice 2: "go deeper" -> [stage2_stacks_door_check]

- [stage2_poker_acquired] Foyer (Poker Acquired)
  - Choice 1: "go deeper" -> [stage2_stacks_door_check]

- [stage2_stacks_door_check] Stacks Door (Key Item Check; auto-resolves, no menu)
  - [No Stacks Key] -> [stage2_stacks_door_locked_no_key]
  - [With Stacks Key] -> [stage3_arrival]

- [stage2_stacks_door_locked_no_key] Stacks Door Locked (No Key)  
  - Choice 1: "defend yourself" -> [DEAD: monster_attack] -> [stage2_death_choice]
  - Choice 2: "slowly walk backwards" -> [DEAD: monster_attack] -> [stage2_death_choice]

- [stage3_arrival] Stacks (Arrival Ambush; auto-resolves on entry, no menu)
  - [With Mop] -> [DEAD: environmental_hazard] -> [stage3_early_death_choice]
  - [With Poker] -> [stage3_hub_unexplored]

- [stage3_early_death_choice] Death Prompt (Early Stage 3)
  - Choice 1: "try again" -> [stage2_fireplace_revealed] (inventory kept; lets a mop holder get the poker)
  - Choice 2: "give up" -> [game_over]

- [stage3_hub_unexplored] Stacks (Main Hub - Unexplored)
  - Choice 1: "go deeper" -> [DEAD: monster_attack] -> [stage3_early_death_choice]
  - Choice 2: "go back toward foyer" -> [stage3_hub_unexplored] (Blocked / stays at hub)
  - Choice 3: "look around" -> [stage3_hub]

- [stage3_hub] Stacks (Main Hub - Explored)
  - Choice 1: "peer down row 1" -> [Set row1_safe = true] -> [stage3_hub]
  - Choice 2: "peer down row 2" -> [Set row2_safe = true] -> [stage3_hub]
  - Choice 3: "peer down row 3" -> [Set row3_safe = true] -> [stage3_hub]
  - Choice 4: "peer down row 4" -> [Set row4_safe = true] -> [stage3_hub]
  - Choice 5: "peer down row 5" -> [If row5_safe == false: Set row5_safe = true | Else: [DEAD: unknown_death] -> [stage3_death_choice]] -> [stage3_hub]
  - Choice 6: "go down row 1" -> [If row1_safe == true -> [stage3_row1_encounter] | Else -> [DEAD: monster_attack] -> [stage3_death_choice]]
  - Choice 7: "go down row 2" -> [If row2_safe == true -> [stage3_row2_encounter] | Else -> [DEAD: monster_attack] -> [stage3_death_choice]]
  - Choice 8: "go down row 3" -> [If row3_safe == true -> [stage3_row3_encounter] | Else -> [DEAD: monster_attack] -> [stage3_death_choice]]
  - Choice 9: "go down row 4" -> [If row4_safe == true -> [stage3_row4_encounter] | Else -> [DEAD: monster_attack] -> [stage3_death_choice]]
  - Choice 10: "go down row 5" -> [DEAD: unknown_death] -> [stage3_death_choice]

- [stage3_death_choice] Death Prompt (Stage 3)
  - Choice 1: "try again" -> [stage3_hub]
  - Choice 2: "give up" -> [game_over]

- [stage3_row1_encounter] Row 1 (Reading Room Entrance)
  - Choice 1: "look through the glass door" -> [stage3_row1_glass_view]
  - Choice 2: "enter the reading room" -> [DEAD: monster_attack] -> [stage3_death_choice]
  - Choice 3: "go back" -> [stage3_hub]

- [stage3_row1_glass_view] Row 1 (Reading Room Viewed)
  - Choice 1: "enter the reading room" -> [DEAD: monster_attack] -> [stage3_death_choice]
  - Choice 2: "go back" -> [stage3_hub]

- [stage3_row2_encounter] Row 2 (Corpse Corridor)
  - Choice 1: "search corpse" -> [stage3_row2_looted] (Acquire: pocketknife, umbrella)
  - Choice 2: "move deeper" -> [stage3_row2_flashlight_check]
  - Choice 3: "return to hub" -> [stage3_hub]

- [stage3_row2_looted] Row 2 (Corpse Corridor - Looted)
  - Choice 1: "move deeper" -> [stage3_row2_flashlight_check]
  - Choice 2: "return to hub" -> [stage3_hub]

- [stage3_row2_flashlight_check] Row 2 (Deeper Flashlight Check)
  - Choice 1: [No Flashlight] -> [DEAD: monster_attack] -> [stage3_death_choice]
  - Choice 2: [With Flashlight] -> [stage4_entry]

- [stage3_row3_encounter] Row 3 (Misleading Safe Row)
  - Choice 1: "walk down row" -> [DEAD: monster_attack] -> [stage3_death_choice]
  - Choice 2: "return to hub" -> [stage3_hub]

- [stage3_row4_encounter] Row 4 (Narrow Aisle)
  - Choice 1: "search backpack" -> [stage3_row4_looted] (Acquire: water, flashlight, second snack, notebook, dictionary, pencil)
  - Choice 2: "go deeper" -> [DEAD: monster_attack] -> [stage3_death_choice]
  - Choice 3: "return to hub" -> [stage3_hub]

- [stage3_row4_looted] Row 4 (Narrow Aisle - Looted)
  - Choice 1: "go deeper" -> [DEAD: monster_attack] -> [stage3_death_choice]
  - Choice 2: "return to hub" -> [stage3_hub]

- [stage4_entry] Deep Stacks (Initial Maze Entry)
  - Choice 1: "go deeper" -> [DEAD: environmental_hazard] -> [stage4_death_choice]
  - Choice 2: "look around" -> [stage4_junction_a]

- [stage4_death_choice] Death Prompt (Stage 4)
  - Choice 1: "try again" -> [stage4_entry]
  - Choice 2: "give up" -> [game_over]

- [stage4_junction_a] Junction A
  - Choice 1: "go left" -> [DEAD: environmental_hazard] -> [stage4_death_choice]
  - Choice 2: "go right" -> [stage4_junction_b]

- [stage4_junction_b] Junction B
  - Choice 1: "go straight" -> [DEAD: environmental_hazard] -> [stage4_death_choice]
  - Choice 2: "go sideways" -> [stage4_junction_c]

- [stage4_junction_c] Junction C (The Torn Tapestry)
  - Choice 1: "go around" -> [DEAD: environmental_hazard] -> [stage4_death_choice]
  - Choice 2: "go forward" -> [stage4_junction_c_check]

- [stage4_junction_c_check] Junction C (Pocketknife Check)
  - Choice 1: [No Pocketknife] -> [DEAD: environmental_hazard] -> [stage3_death_choice] (the player needs to go back further to find the pocketknife)
  - Choice 2: [With Pocketknife] -> [stage4_junction_d]

- [stage4_junction_d] Junction D (Loopback 1)
  - Choice 1: "go left" -> [stage4_junction_a]
  - Choice 2: "go right" -> [stage4_junction_e]

- [stage4_junction_e] Junction E (The Electrical Hazard)
  - Choice 1: "step down" -> [DEAD: environmental_hazard] -> [stage4_death_choice]
  - Choice 2: "step across" -> [stage4_junction_f]

- [stage4_junction_f] Junction F (The Monster's Nest)
  - Choice 1: "explore alcove" -> [DEAD: monster_attack] -> [stage4_death_choice]
  - Choice 2: "bypass alcove" -> [stage4_junction_g]

- [stage4_junction_g] Junction G
  - Choice 1: "climb aisle" -> [DEAD: environmental_hazard] -> [stage4_death_choice]
  - Choice 2: "duck under" -> [stage4_junction_h]

- [stage4_junction_h] Junction H (Loopback 2)
  - Choice 1: "take left corridor" -> [stage4_junction_e] 
  - Choice 2: "take right corridor" -> [stage4_structural_hub]

- [stage4_structural_hub] Structural Hub (End of Maze)
  - Choice 1: "go upstairs" -> [stage5_mezzanine_arrival]
  - Choice 2: "go into basement" -> [stage5_basement_arrival]

- [stage5_mezzanine_arrival] Upper Mezzanine (Arrival)
  - Choice 1: "go forward" -> [DEAD: environmental_hazard] -> [stage5_mezzanine_death_choice]
  - Choice 2: "look around" -> [stage5_mezzanine_searched]

- [stage5_mezzanine_death_choice] Death Prompt (Mezzanine)
  - Choice 1: "try again" -> [stage5_mezzanine_arrival]
  - Choice 2: "give up" -> [game_over]

- [stage5_mezzanine_searched] Upper Mezzanine (Explored)
  - Choice 1: "look around" -> [stage5_mezzanine_searched]
  - Choice 2: "look in the pack" -> [stage5_mezzanine_searched]
  - Choice 3: "look over railing" -> [DEAD: monster_attack] -> [stage5_mezzanine_death_choice]
  - Choice 4: "sneak through stacks" -> [stage5_balcony_door]

- [stage5_balcony_door] Exterior Balcony Door
  - Choice 1: "go out on the balcony" -> [DEAD: environmental_hazard] -> [stage5_mezzanine_death_choice]
  - Choice 2: "inspect balcony" -> [stage5_balcony_inspected]

- [stage5_balcony_inspected] Exterior Balcony Door (Inspected)
  - Choice 1: "go out on the balcony" -> [DEAD: environmental_hazard] -> [stage5_mezzanine_death_choice]
  - Choice 2: "go back" -> [stage5_mezzanine_umbrella_check]

- [stage5_mezzanine_umbrella_check] Stairwell Retreat (Umbrella Check)
  - Choice 1: [No Umbrella] -> [DEAD: monster_attack] -> [game_over]
  - Choice 2: [With Umbrella] -> [DEAD: monster_attack] -> [game_over]

- [stage5_basement_arrival] Basement Stairs (Initial Entry)
  - Choice 1: "go down the stairs" -> [DEAD: environmental_hazard] -> [stage5_basement_death_choice]
  - Choice 2: "look around" -> [stage5_basement_searched]

- [stage5_basement_death_choice] Death Prompt (Basement)
  - Choice 1: "try again" -> [stage5_basement_arrival]
  - Choice 2: "give up" -> [game_over]

- [stage5_basement_searched] Basement Stairs (Explored)
  - Choice 1: "go further" -> [stage5_basement_umbrella_check]

- [stage5_basement_umbrella_check] Basement Stairs (Umbrella Check)
  - Choice 1: [No Umbrella] -> [DEAD: environmental_hazard] -> [game_over]
  - Choice 2: [With Umbrella] -> [stage5_flooded_corridor]

- [stage5_flooded_corridor] Flooded Corridor (Bottom of Stairs)
  - Choice 1: "go back" -> [stage5_flooded_corridor] (Blocked / stairs have collapsed behind you)
  - Choice 2: "enter the water" -> [stage5_water_step_1]

- [stage5_water_step_1] Flooded Corridor (First Movement Choice)
  - Choice 1: "jump in" -> [DEAD: monster_attack] -> [stage5_basement_death_choice]
  - Choice 2: "enter the water slowly" -> [stage5_water_step_2]

- [stage5_water_step_2] Flooded Corridor (Second Movement Choice)
  - Choice 1: "start running" -> [DEAD: monster_attack] -> [stage5_basement_death_choice]
  - Choice 2: "go slowly" -> [stage5_water_step_3]

- [stage5_water_step_3] Flooded Corridor (Third Movement Choice)
  - Choice 1: "rush out of the water" -> [DEAD: monster_attack] -> [stage5_basement_death_choice]
  - Choice 2: "slowly climb out" -> [stage5_occult_archive_entry]

- [stage5_occult_archive_entry] Occult Archive (Dry Concrete Entry)
  - Choice 1: "go towards the light" -> [DEAD: environmental_hazard] -> [stage5_basement_death_choice]
  - Choice 2: "look around" -> [stage5_occult_archive_hub]

- [stage5_occult_archive_hub] Occult Archive (Hub - Unexplored)
  - Choice 1: "try the windows" -> [stage5_windows_tested_hub]
  - Choice 2: "search desk" -> [stage5_desk_searched_hub]
  - Choice 3: "approach cave" -> [stage5_cave_approach_partial]

- [stage5_windows_tested_hub] Occult Archive (Windows Tested)
  - Choice 1: "search desk" -> [stage5_both_tested_hub]
  - Choice 2: "approach cave" -> [stage5_cave_approach_partial]

- [stage5_desk_searched_hub] Occult Archive (Desk Searched)
  - Choice 1: "try the windows" -> [stage5_both_tested_hub]
  - Choice 2: "approach cave" -> [stage5_cave_approach_partial]

- [stage5_both_tested_hub] Occult Archive (Fully Explored)
  - Choice 1: "approach cave" -> [stage5_cave_approach_final]

- [stage5_cave_approach_partial] Underground Cave Entrance (Options Available)
  - Choice 1: "go back to archive" -> [stage5_occult_archive_hub]
  - Choice 2: "climb out to safety" -> [game_win]

- [stage5_cave_approach_final] Underground Cave Entrance (Final Exit)
  - Choice 1: "climb out to safety" -> [game_win]