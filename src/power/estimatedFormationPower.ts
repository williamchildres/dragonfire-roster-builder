import type { Dragon, FormationPosition } from '../models/dragon';
import type { FormationArrangement } from '../services/formationPlacementComparison';
import {
  estimateDragonPower,
  type EstimatedDragonPower,
  type EstimatedPowerConfidence,
} from './estimatedDragonPower';
import { ESTIMATED_POWER_MODEL_VERSION } from './generatedDragonPowerModel';

export interface EstimatedFormationPower {
  totalPower: number;
  dragonPower: Record<string, EstimatedDragonPower>;
  confidence: EstimatedPowerConfidence;
  observedCount: number;
  modeledCount: number;
  lowConfidenceCount: number;
  modelVersion: string;
}

export function estimateFormationPower({
  formation,
  dragons,
  progression,
}: {
  formation: FormationArrangement;
  dragons: readonly Dragon[];
  progression: Record<string, { starRank?: number | null; dragonLevel?: number | null } | undefined>;
}): EstimatedFormationPower | null {
  const dragonById = new Map(dragons.map((dragon) => [dragon.id, dragon]));
  const estimates: [string, EstimatedDragonPower][] = [];
  for (const position of ['left-flank', 'vanguard', 'right-flank'] satisfies FormationPosition[]) {
    const dragonId = formation[position];
    const dragon = dragonById.get(dragonId);
    const current = progression[dragonId];
    if (!dragon || current?.starRank == null || current.dragonLevel == null) return null;
    estimates.push([
      dragonId,
      estimateDragonPower({
        rarity: dragon.rarity,
        starRank: current.starRank,
        dragonLevel: current.dragonLevel,
      }),
    ]);
  }
  const dragonPower = Object.fromEntries(estimates);
  const values = estimates.map(([, estimate]) => estimate);
  const lowConfidenceCount = values.filter((estimate) => estimate.confidence === 'low').length;
  const modeledCount = values.filter((estimate) => estimate.confidence === 'modeled').length;
  const observedCount = values.filter((estimate) => estimate.confidence === 'observed').length;
  return {
    totalPower: values.reduce((total, estimate) => total + estimate.power, 0),
    dragonPower,
    confidence: lowConfidenceCount > 0 ? 'low' : modeledCount > 0 ? 'modeled' : 'observed',
    observedCount,
    modeledCount,
    lowConfidenceCount,
    modelVersion: ESTIMATED_POWER_MODEL_VERSION,
  };
}
