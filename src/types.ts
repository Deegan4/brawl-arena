// Core data model for the Forge Kingdom economy slice.

export type ResourceType = 'gold' | 'elixir';

export type BuildingType =
  | 'townHall'
  | 'goldMine'
  | 'elixirCollector'
  | 'goldStorage'
  | 'elixirStorage';

/**
 * Stats for a single building level. Index 0 in a definition's `levels` array
 * is level 1. `upgradeCost` / `upgradeTimeSec` describe the cost/time to upgrade
 * FROM this level to the next; the final (max) level omits them.
 */
export interface BuildingLevel {
  upgradeCost?: Partial<Record<ResourceType, number>>;
  upgradeTimeSec?: number;
  ratePerHour?: number; // producers: resource units generated per hour
  bufferCapacity?: number; // producers: max uncollected resource held
  storageCapacity?: number; // storages: capacity added to the resource pool
  baseCapacity?: number; // town hall: base capacity added to each resource pool
}

export interface BuildingDef {
  type: BuildingType;
  name: string;
  icon: string;
  produces?: ResourceType;
  levels: BuildingLevel[]; // index 0 = level 1
}

export interface Building {
  id: string;
  type: BuildingType;
  level: number; // 1-based
  col: number;
  row: number;
  /** Producers: when the buffer was last reset (ms epoch). */
  lastCollectAt?: number;
  /** Set while an upgrade is in progress: when it finishes (ms epoch). */
  upgradeFinishAt?: number;
}

export interface GameState {
  version: number;
  gold: number;
  elixir: number;
  buildings: Building[];
}
