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
  | "stage2_foyer_searched"
  | "stage2_corpse_looted"
  | "stage2_desk_looted"
  | "stage2_both_looted"
  | "stage2_periodicals_check"
  | "stage2_reading_room_door"
  | "stage2_reading_room_locked"
  | "stage2_fireplace_revealed"
  | "stage2_poker_acquired"
  | "stage2_stacks_door_check"
  | "stage2_stacks_door_locked_no_key";

export type NodeId = Stage1NodeId | Stage2NodeId | "stage3_arrival" | "game_over" | "game_win";

export type ItemId =
  | "mop"
  | "lemon candy"
  | "pack of gum"
  | "mace"
  | "hair ties"
  | "small notebook"
  | "stacks key"
  | "fireplace poker";

export type DeathType = "monster_attack" | "environmental_hazard" | "unknown_death";

export interface GameState {
  currentNode: NodeId;
  inventory: ItemId[];
  isGameOver: boolean;
  isWin: boolean;
  lastDeathType: DeathType | null;
  output: string[];
}

export interface ContentCatalog {
  intro: string[];
  nodes: Record<string, string[]>;
  death_screens: Record<string, string[]>;
  parser_fallbacks: string[];
}
