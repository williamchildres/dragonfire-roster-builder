import type { DragonRarity } from '../models/dragon';

export interface DragonPowerObservation {
  rarity: DragonRarity;
  starRank: number;
  dragonLevel: number;
  displayedPower: number;
  provenance: string;
}

export interface UniqueDragonPowerObservation {
  rarity: DragonRarity;
  starRank: number;
  dragonLevel: number;
  displayedPower: number;
  provenance: string[];
  sampleCount: number;
}

export interface EstimatedPowerObservedEnvelope {
  starRank: Readonly<{ minimum: number; maximum: number }>;
  dragonLevel: Readonly<{ minimum: number; maximum: number }>;
}

export const DRAGON_POWER_OBSERVATIONS: readonly DragonPowerObservation[] = [
  { rarity: 'Legendary', starRank: 4, dragonLevel: 36, displayedPower: 31040, provenance: 'Vhagar' },
  { rarity: 'Legendary', starRank: 3, dragonLevel: 36, displayedPower: 27020, provenance: 'Kalspire' },
  { rarity: 'Legendary', starRank: 2, dragonLevel: 36, displayedPower: 24620, provenance: 'Crimson' },
  { rarity: 'Legendary', starRank: 2, dragonLevel: 36, displayedPower: 24620, provenance: 'Caraxes' },
  { rarity: 'Legendary', starRank: 1, dragonLevel: 36, displayedPower: 22400, provenance: 'Seasmoke' },
  { rarity: 'Legendary', starRank: 1, dragonLevel: 36, displayedPower: 22400, provenance: 'Syrax' },
  { rarity: 'Legendary', starRank: 2, dragonLevel: 35, displayedPower: 24620, provenance: 'Sheepstealer' },
  { rarity: 'Legendary', starRank: 1, dragonLevel: 35, displayedPower: 22400, provenance: 'Malachite' },
  { rarity: 'Legendary', starRank: 1, dragonLevel: 35, displayedPower: 22400, provenance: 'Venator' },
  { rarity: 'Legendary', starRank: 2, dragonLevel: 20, displayedPower: 13620, provenance: 'Sunfyre' },
  { rarity: 'Legendary', starRank: 2, dragonLevel: 21, displayedPower: 14620, provenance: 'Sunfyre' },

  { rarity: 'Epic', starRank: 6, dragonLevel: 36, displayedPower: 30820, provenance: 'Tessarion' },
  { rarity: 'Epic', starRank: 2, dragonLevel: 36, displayedPower: 19540, provenance: 'Daemoros' },
  { rarity: 'Epic', starRank: 4, dragonLevel: 35, displayedPower: 22580, provenance: 'Rhysarion' },
  { rarity: 'Epic', starRank: 4, dragonLevel: 35, displayedPower: 22580, provenance: 'Tashix' },
  { rarity: 'Epic', starRank: 4, dragonLevel: 35, displayedPower: 22580, provenance: 'Velar' },
  { rarity: 'Epic', starRank: 3, dragonLevel: 35, displayedPower: 20140, provenance: 'Shadowsong' },
  { rarity: 'Epic', starRank: 3, dragonLevel: 31, displayedPower: 18140, provenance: 'Vaeldra' },
  { rarity: 'Epic', starRank: 2, dragonLevel: 31, displayedPower: 16540, provenance: 'Feskar' },
  { rarity: 'Epic', starRank: 2, dragonLevel: 31, displayedPower: 16540, provenance: 'Vermax' },
  { rarity: 'Epic', starRank: 2, dragonLevel: 30, displayedPower: 15540, provenance: 'Zivern' },
  { rarity: 'Epic', starRank: 1, dragonLevel: 20, displayedPower: 9050, provenance: 'Tairax' },
  { rarity: 'Epic', starRank: 1, dragonLevel: 21, displayedPower: 9550, provenance: 'Tairax' },

  { rarity: 'Rare', starRank: 7, dragonLevel: 30, displayedPower: 19650, provenance: 'Jagadrix' },
  { rarity: 'Rare', starRank: 4, dragonLevel: 30, displayedPower: 13400, provenance: 'Thunderstrike' },
  { rarity: 'Rare', starRank: 3, dragonLevel: 30, displayedPower: 12050, provenance: 'Shadowrend' },
  { rarity: 'Rare', starRank: 4, dragonLevel: 29, displayedPower: 13000, provenance: 'Arulix' },
  { rarity: 'Rare', starRank: 3, dragonLevel: 29, displayedPower: 11650, provenance: 'Antares' },
  { rarity: 'Rare', starRank: 4, dragonLevel: 28, displayedPower: 12600, provenance: 'Dawnseeker' },
  { rarity: 'Rare', starRank: 4, dragonLevel: 20, displayedPower: 9600, provenance: 'Solstryker' },
  { rarity: 'Rare', starRank: 4, dragonLevel: 21, displayedPower: 10000, provenance: 'Solstryker' },
] as const;

const rarityOrder: Record<DragonRarity, number> = {
  Legendary: 0,
  Epic: 1,
  Rare: 2,
};

export function deduplicateDragonPowerObservations(
  observations: readonly DragonPowerObservation[] = DRAGON_POWER_OBSERVATIONS,
): UniqueDragonPowerObservation[] {
  const grouped = new Map<string, UniqueDragonPowerObservation>();
  for (const observation of observations) {
    const key = observationTupleKey(observation);
    const current = grouped.get(key);
    if (current) {
      if (current.displayedPower !== observation.displayedPower) {
        throw new Error(
          `Conflicting Estimated Power observations for ${key}: ${current.displayedPower} and ${observation.displayedPower}.`,
        );
      }
      current.provenance.push(observation.provenance);
      current.sampleCount += 1;
    } else {
      grouped.set(key, {
        rarity: observation.rarity,
        starRank: observation.starRank,
        dragonLevel: observation.dragonLevel,
        displayedPower: observation.displayedPower,
        provenance: [observation.provenance],
        sampleCount: 1,
      });
    }
  }
  return [...grouped.values()]
    .map((observation) => ({
      ...observation,
      provenance: [...observation.provenance].sort(compareText),
    }))
    .sort(compareObservations);
}

export function deriveEstimatedPowerObservedEnvelopes(
  observations: readonly DragonPowerObservation[] = DRAGON_POWER_OBSERVATIONS,
): Readonly<Record<DragonRarity, EstimatedPowerObservedEnvelope>> {
  const uniqueObservations = deduplicateDragonPowerObservations(observations);
  return Object.freeze(Object.fromEntries((['Legendary', 'Epic', 'Rare'] as const).map((rarity) => {
    const rarityObservations = uniqueObservations.filter((observation) => observation.rarity === rarity);
    if (rarityObservations.length === 0) {
      throw new Error(`Estimated Power observations must include at least one ${rarity} tuple.`);
    }
    return [rarity, Object.freeze({
      starRank: Object.freeze({
        minimum: Math.min(...rarityObservations.map((observation) => observation.starRank)),
        maximum: Math.max(...rarityObservations.map((observation) => observation.starRank)),
      }),
      dragonLevel: Object.freeze({
        minimum: Math.min(...rarityObservations.map((observation) => observation.dragonLevel)),
        maximum: Math.max(...rarityObservations.map((observation) => observation.dragonLevel)),
      }),
    })] as const;
  }))) as Readonly<Record<DragonRarity, EstimatedPowerObservedEnvelope>>;
}

export const ESTIMATED_POWER_OBSERVED_ENVELOPES = deriveEstimatedPowerObservedEnvelopes();

export function hashDragonPowerObservations(
  observations: readonly DragonPowerObservation[] = DRAGON_POWER_OBSERVATIONS,
): string {
  const canonical = deduplicateDragonPowerObservations(observations).map((observation) => [
    observation.rarity,
    observation.starRank,
    observation.dragonLevel,
    observation.displayedPower,
    observation.sampleCount,
    observation.provenance,
  ]);
  return fnv1a64(JSON.stringify(canonical));
}

export function observationTupleKey(
  observation: Pick<DragonPowerObservation, 'rarity' | 'starRank' | 'dragonLevel'>,
): string {
  return `${observation.rarity}:${observation.starRank}:${observation.dragonLevel}`;
}

function compareObservations(
  left: Pick<UniqueDragonPowerObservation, 'rarity' | 'starRank' | 'dragonLevel' | 'displayedPower'>,
  right: Pick<UniqueDragonPowerObservation, 'rarity' | 'starRank' | 'dragonLevel' | 'displayedPower'>,
): number {
  return rarityOrder[left.rarity] - rarityOrder[right.rarity]
    || left.starRank - right.starRank
    || left.dragonLevel - right.dragonLevel
    || left.displayedPower - right.displayedPower;
}

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
