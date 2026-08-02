import type { Dragon, OwnedDragon } from '../models/dragon';
import {
  estimateDragonPower,
  isValidEstimatedPowerProgression,
  type EstimatedDragonPower,
  type EstimatedPowerConfidence,
} from '../power/estimatedDragonPower';

export interface RosterEstimatedPowerPresentation {
  status: 'available' | 'unavailable';
  power: number | null;
  confidence: EstimatedPowerConfidence | null;
  basis: EstimatedDragonPower['basis'] | null;
}

const unavailablePresentation: RosterEstimatedPowerPresentation = {
  status: 'unavailable',
  power: null,
  confidence: null,
  basis: null,
};

export function rosterEstimatedPowerPresentation(
  dragon: Pick<Dragon, 'rarity'>,
  entry: Pick<OwnedDragon, 'starRank' | 'reignLevel'> | undefined,
): RosterEstimatedPowerPresentation {
  if (entry?.starRank == null || entry.reignLevel == null) return unavailablePresentation;
  const input = {
    rarity: dragon.rarity,
    starRank: entry.starRank,
    dragonLevel: entry.reignLevel,
  };
  if (!isValidEstimatedPowerProgression(input)) return unavailablePresentation;
  const estimate = estimateDragonPower(input);
  return {
    status: 'available',
    power: estimate.power,
    confidence: estimate.confidence,
    basis: estimate.basis,
  };
}

export function estimatedPowerConfidenceLabel(confidence: EstimatedPowerConfidence): string {
  if (confidence === 'observed') return 'Observed';
  if (confidence === 'modeled') return 'Modeled';
  return 'Low';
}
