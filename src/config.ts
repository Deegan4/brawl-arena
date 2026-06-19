// Data-driven content + tunables for the Forge Kingdom economy slice.
// New buildings/levels are data here, not new code.

import { BuildingDef, BuildingType, GameState } from './types';

export const GRID_COLS = 5;
export const GRID_ROWS = 5;
export const BUILDER_COUNT = 1;

export const SAVE_KEY = 'forge-kingdom:save';
export const STATE_VERSION = 1;

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  townHall: {
    type: 'townHall',
    name: 'Town Hall',
    icon: '🏰',
    levels: [
      { baseCapacity: 1000, upgradeCost: { gold: 800, elixir: 800 }, upgradeTimeSec: 60 },
      { baseCapacity: 2000, upgradeCost: { gold: 2500, elixir: 2500 }, upgradeTimeSec: 180 },
      { baseCapacity: 4000 },
    ],
  },
  goldMine: {
    type: 'goldMine',
    name: 'Gold Mine',
    icon: '⛏️',
    produces: 'gold',
    levels: [
      { ratePerHour: 3600, bufferCapacity: 300, upgradeCost: { elixir: 300 }, upgradeTimeSec: 30 },
      { ratePerHour: 7200, bufferCapacity: 600, upgradeCost: { elixir: 900 }, upgradeTimeSec: 120 },
      { ratePerHour: 12000, bufferCapacity: 1200, upgradeCost: { elixir: 2200 }, upgradeTimeSec: 300 },
      { ratePerHour: 18000, bufferCapacity: 2000 },
    ],
  },
  elixirCollector: {
    type: 'elixirCollector',
    name: 'Elixir Collector',
    icon: '⚗️',
    produces: 'elixir',
    levels: [
      { ratePerHour: 3600, bufferCapacity: 300, upgradeCost: { gold: 300 }, upgradeTimeSec: 30 },
      { ratePerHour: 7200, bufferCapacity: 600, upgradeCost: { gold: 900 }, upgradeTimeSec: 120 },
      { ratePerHour: 12000, bufferCapacity: 1200, upgradeCost: { gold: 2200 }, upgradeTimeSec: 300 },
      { ratePerHour: 18000, bufferCapacity: 2000 },
    ],
  },
  goldStorage: {
    type: 'goldStorage',
    name: 'Gold Storage',
    icon: '🪙',
    levels: [
      { storageCapacity: 1500, upgradeCost: { elixir: 500 }, upgradeTimeSec: 60 },
      { storageCapacity: 3500, upgradeCost: { elixir: 1500 }, upgradeTimeSec: 180 },
      { storageCapacity: 7000 },
    ],
  },
  elixirStorage: {
    type: 'elixirStorage',
    name: 'Elixir Storage',
    icon: '🛢️',
    levels: [
      { storageCapacity: 1500, upgradeCost: { gold: 500 }, upgradeTimeSec: 60 },
      { storageCapacity: 3500, upgradeCost: { gold: 1500 }, upgradeTimeSec: 180 },
      { storageCapacity: 7000 },
    ],
  },
};

export function createInitialState(now: number): GameState {
  return {
    version: STATE_VERSION,
    gold: 800,
    elixir: 800,
    buildings: [
      { id: 'townHall', type: 'townHall', level: 1, col: 2, row: 0 },
      { id: 'goldMine', type: 'goldMine', level: 1, col: 1, row: 2, lastCollectAt: now },
      { id: 'elixirCollector', type: 'elixirCollector', level: 1, col: 3, row: 2, lastCollectAt: now },
      { id: 'goldStorage', type: 'goldStorage', level: 1, col: 1, row: 3 },
      { id: 'elixirStorage', type: 'elixirStorage', level: 1, col: 3, row: 3 },
    ],
  };
}
