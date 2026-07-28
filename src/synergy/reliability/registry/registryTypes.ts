import type { AbilityReliabilityComponent, SignalReliabilityBinding } from '../types';

export interface DragonReliabilityRegistry {
  dragonId: string;
  components: readonly AbilityReliabilityComponent[];
  bindings: readonly SignalReliabilityBinding[];
}

export function defineDragonReliabilityRegistry(
  registry: DragonReliabilityRegistry,
): DragonReliabilityRegistry {
  return registry;
}
