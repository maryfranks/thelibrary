export type Stage1NodeId =
  | "stage1_vestibule"
  | "stage1_vestibule_respawn"
  | "stage1_vestibule_searched"
  | "stage1_pack_checked"
  | "stage1_turnstile_check"
  | "stage1_mop_acquired";

export type NodeId = Stage1NodeId | "stage2_foyer" | "game_over" | "game_win";

export type ItemId = "mop";

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
