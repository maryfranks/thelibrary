export type Stage1NodeId =
  | "stage1_vestibule"
  | "stage1_vestibule_respawn"
  | "stage1_vestibule_searched"
  | "stage1_pack_checked"
  | "stage1_turnstile_check"
  | "stage1_mop_acquired";

export type Stage2NodeId =
  | "stage2_foyer"
  | "stage2_death_choice"
  | "stage2_respawn_check"
  | "stage2_respawn_no_mop"
  | "stage2_respawn_no_key"
  | "stage2_foyer_searched"
  | "stage2_corpse_looted"
  | "stage2_desk_looted"
  | "stage2_both_looted"
  | "stage2_periodicals_check"
  | "stage2_reading_room_door"
  | "stage2_rattle_death_choice"
  | "stage2_reading_room_door_respawn"
  | "stage2_reading_room_locked"
  | "stage2_fireplace_revealed"
  | "stage2_poker_acquired"
  | "stage2_stacks_door_check"
  | "stage2_stacks_door_locked_no_key"
  | "stage2_no_key_death_choice";

export type Stage3NodeId =
  | "stage3_arrival"
  | "stage3_early_death_choice"
  | "stage3_hub_unexplored"
  | "stage3_foyer_blocked"
  | "stage3_hub"
  | "stage3_death_choice"
  | "stage3_row1_encounter"
  | "stage3_row1_looked"
  | "stage3_row2_encounter"
  | "stage3_row2_looted"
  | "stage3_row2_flashlight_check"
  | "stage3_row2_dark_warning"
  | "stage3_row4_encounter"
  | "stage3_row4_looted"
  | "stage3_row5_warning";

export type Stage4NodeId =
  | "stage4_entry"
  | "stage4_death_choice"
  | "stage4_junction_a"
  | "stage4_junction_b"
  | "stage4_junction_c"
  | "stage4_junction_c_check"
  | "stage4_junction_d"
  | "stage4_junction_e"
  | "stage4_junction_f"
  | "stage4_junction_g"
  | "stage4_junction_h"
  | "stage4_structural_hub";

export type Stage5NodeId =
  | "stage5_mezzanine_arrival"
  | "stage5_mezzanine_death_choice"
  | "stage5_mezzanine_searched"
  | "stage5_balcony_door"
  | "stage5_balcony_inspected"
  | "stage5_mezzanine_umbrella_check"
  | "stage5_basement_arrival"
  | "stage5_basement_death_choice"
  | "stage5_basement_searched"
  | "stage5_basement_umbrella_check"
  | "stage5_flooded_corridor"
  | "stage5_water_step_1"
  | "stage5_water_step_2"
  | "stage5_water_step_3"
  | "stage5_occult_archive_entry"
  | "stage5_occult_archive_hub"
  | "stage5_windows_tested_hub"
  | "stage5_desk_searched_hub"
  | "stage5_both_tested_hub"
  | "stage5_cave_approach_partial"
  | "stage5_cave_approach_final";

export type NodeId =
  | Stage1NodeId
  | Stage2NodeId
  | Stage3NodeId
  | Stage4NodeId
  | Stage5NodeId
  | "game_over"
  | "temporary_game_over"
  | "game_win";

export type ItemId =
  | "mop"
  | "lemon candy"
  | "pack of gum"
  | "mace"
  | "hair ties"
  | "small notebook"
  | "stacks key"
  | "fireplace poker"
  | "pocketknife"
  | "umbrella"
  | "water"
  | "flashlight"
  | "second snack"
  | "notebook"
  | "dictionary"
  | "pencil";

export type RowSafetyKey = "row1_safe" | "row2_safe" | "row3_safe" | "row4_safe" | "row5_safe";

export type StageId = "stage1" | "stage2" | "stage3" | "stage4" | "stage5";

export type DeathType =
  "monster_attack" | "environmental_hazard" | "unknown_death" | "mysterious_disappearance";

export interface GameState {
  currentNode: NodeId;
  inventory: ItemId[];
  isGameOver: boolean;
  isWin: boolean;
  lastDeathType: DeathType | null;
  output: string[];
  row1_safe: boolean;
  row2_safe: boolean;
  row3_safe: boolean;
  row4_safe: boolean;
  row5_safe: boolean;
  stage2InventorySnapshot?: ItemId[] | null;
  stage3InventorySnapshot?: ItemId[] | null;
}

export interface ContentCatalog {
  intro: string[];
  nodes: Record<string, string[]>;
  death_screens: Record<string, string[]>;
  parser_fallbacks: string[];
}
