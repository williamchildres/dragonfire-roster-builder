import { Shield } from 'lucide-react';
import type { Dragon, OwnedDragon } from '../models/dragon';
import { estimateDragonPower } from '../power/estimatedDragonPower';
import { applicableHabitCount, unlockedHabitCount } from './rosterWorkspaceState';

export function RosterList({
  dragons,
  roster,
  selectedDragonId,
  onSelect,
  registerRow,
}: {
  dragons: readonly Dragon[];
  roster: Record<string, OwnedDragon>;
  selectedDragonId: string | null;
  onSelect: (dragonId: string) => void;
  registerRow: (dragonId: string, element: HTMLButtonElement | null) => void;
}) {
  return (
    <ul className="roster-list" aria-label="Owned dragons">
      {dragons.map((dragon) => {
        const entry = roster[dragon.id];
        const selected = selectedDragonId === dragon.id;
        const unlockedHabits = unlockedHabitCount(dragon, entry);
        const totalHabits = applicableHabitCount(dragon);
        const estimatedPower = entry?.starRank != null && entry.reignLevel != null
          ? estimateDragonPower({ rarity: dragon.rarity, starRank: entry.starRank, dragonLevel: entry.reignLevel })
          : null;
        return (
          <li key={dragon.id}>
            <button
              type="button"
              className={selected ? 'roster-row is-selected' : 'roster-row'}
              aria-label={`${dragon.name}, ${dragon.rarity} ${dragon.breed}, Star Rank ${formatAccessible(entry?.starRank)}, Dragon Level ${formatAccessible(entry?.reignLevel)}, Estimated Power ${estimatedPower ? formatPower(estimatedPower.power) : 'unavailable'}, ${unlockedHabits} of ${totalHabits} habits unlocked${selected ? ', selected' : ''}`}
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(dragon.id)}
              ref={(element) => registerRow(dragon.id, element)}
            >
              <RosterDragonEmblem dragon={dragon} compact />
              <span className="roster-row-identity">
                <strong>{dragon.name}</strong>
                <span>{dragon.rarity} · {dragon.breed}</span>
              </span>
              <span className="roster-row-progression" aria-hidden="true">
                <span>{formatStarRank(entry?.starRank)}</span>
                <span>Lv {formatUnknown(entry?.reignLevel)}</span>
                <span title="Unofficial empirical estimate from current rarity, Star Rank, and Dragon Level.">
                  Est. Power {estimatedPower ? formatPower(estimatedPower.power) : '—'}
                </span>
                <span>{unlockedHabits}/{totalHabits} habits</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function RosterDragonEmblem({ dragon, compact = false }: { dragon: Dragon; compact?: boolean }) {
  return (
    <span className={`dragon-emblem roster-dragon-emblem breed-${dragon.breed.toLowerCase()}${compact ? ' is-compact' : ''}`} aria-hidden="true">
      <Shield size={compact ? 25 : 34} />
      <span>{dragon.name.slice(0, 1)}</span>
    </span>
  );
}

function formatUnknown(value: number | null | undefined): string | number {
  return value === null || value === undefined ? '—' : value;
}

function formatStarRank(value: number | null | undefined): string {
  return value === null || value === undefined ? '?★' : `${value}★`;
}

function formatAccessible(value: number | null | undefined): string | number {
  return value === null || value === undefined ? 'unknown' : value;
}

function formatPower(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
