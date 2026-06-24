import type { DragonCollectionProgress, FieldVerification, TroopType } from './dragon';

export interface DragonStatDefinition {
  id: string;
  name: string;
  category: 'combat' | 'operational' | 'derived';
  description: string;
  offensiveEffects: string[];
  defensiveEffects: string[];
  canonicalFormulaKnown: boolean;
}

export interface DragonObservationSnapshot {
  id: string;
  dragonId: string;
  capturedAt: string;
  gameVersion: string | null;
  collection: DragonCollectionProgress | null;
  displayState?: string | null;
  dragonLevel: number | null;
  starRank: number | null;
  starProgressCurrent?: number | null;
  starProgressRequired?: number | null;
  combatStats: {
    strength: number | null;
    instinct: number | null;
    intelligence: number | null;
    initiative: number | null;
  };
  marchSpeed: string | null;
  staminaCurrent: number | null;
  staminaMaximum: number | null;
  troopCapacity: number | null;
  dragonPower: number | null;
  modifierContextKnown: boolean;
  canonical: false;
  evidenceIds: string[];
}

export interface TroopMatchupRule {
  attacker: TroopType;
  defender: TroopType;
  damageModifierPercent: number;
  verification: FieldVerification;
  evidenceIds: string[];
}
