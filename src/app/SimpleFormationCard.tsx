import { Bomb, BowArrow, Check, ChessKnight, Circle, LockKeyhole, Shield, Swords, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { AbilityDefinition, Dragon, FormationPosition, OwnedDragon, TroopType } from '../models/dragon';
import { FORMATION_POSITIONS, TROOP_TYPES } from '../models/dragon';
import { positionLabels } from '../services/teamShare';
import type { DragonSynergyProfile } from '../synergy/types';
import { summarizeAbilityForProgression } from './dragonDetailPresentation';
import type { FormationSignalChip } from './formationCardPresentation';

const unknown = 'Full wording not verified.';

export function SimpleFormationCard({
  position,
  dragon,
  rosterEntry,
  profile,
  signalChips,
  movementOccupancy,
  onChooseDragon,
  onOpenDetails,
  onMove,
  onClear,
}: {
  position: FormationPosition;
  dragon: Dragon | null;
  rosterEntry?: OwnedDragon;
  profile?: DragonSynergyProfile;
  signalChips: {
    damageProfile: FormationSignalChip[];
    provides: FormationSignalChip[];
    benefitsFrom: FormationSignalChip[];
  };
  movementOccupancy: Partial<Record<FormationPosition, boolean>>;
  onChooseDragon: () => void;
  onOpenDetails: (dragon: Dragon) => void;
  onMove: (position: FormationPosition) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const owned = dragon ? rosterEntry?.owned === true : false;
  const starSummary = dragon && owned ? (rosterEntry?.starRank !== null && rosterEntry?.starRank !== undefined ? `Star ${rosterEntry.starRank}` : 'Star unknown') : null;
  const detailsId = `formation-card-details-${position}`;

  return (
    <article className={`team-slot formation-position ${position}`} aria-labelledby={`formation-card-${position}`}>
      <div className="position-card-top">
        <div className="position-card-heading">
          <p className="position-label" id={`formation-card-${position}`}>
            {positionLabels[position]}
          </p>
          {position === 'vanguard' ? <span className="vanguard-badge" aria-label="Vanguard badge">Center</span> : null}
        </div>
      </div>
      {dragon ? (
        <>
          <div className="formation-dragon-summary" aria-label={`${dragon.name} selected dragon summary`}>
            <DragonAffinityIcons dragonName={dragon.name} affinities={dragon.affinities} />
            <div className="formation-dragon-identity">
              <h3>{dragon.name}</h3>
              <div className="dragon-card-chips" aria-label={`${dragon.name} metadata`}>
                <span className="badge">{dragon.rarity}</span>
                <span className="badge">{dragon.breed}</span>
                {starSummary ? <span className="badge">{starSummary}</span> : null}
              </div>
            </div>
          </div>
          <div className="formation-signal-grid">
            <FormationSignalPanel title="Damage profile" chips={signalChips.damageProfile} fallback={profile ? 'No mapped damage profile.' : 'Damage profile not verified.'} />
            <FormationSignalPanel title="Provides" chips={signalChips.provides} fallback={profile ? 'No mapped Provides signals.' : 'Provides signals not verified.'} />
            <FormationSignalPanel title="Synergy needs" chips={signalChips.benefitsFrom} fallback={profile ? 'No mapped incoming synergy.' : 'Synergy needs not verified.'} />
          </div>
          <SimpleCommandPanel command={dragon.command} profile={profile} rosterEntry={rosterEntry} />
          <SimpleTraitPanel trait={dragon.trait} position={position} profile={profile} rosterEntry={rosterEntry} />
          <button
            type="button"
            className="secondary-button formation-card-details-toggle"
            aria-controls={detailsId}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? 'Collapse details' : 'Expand details'}
          </button>
          {expanded ? (
            <div className="formation-card-expanded-details" id={detailsId}>
              <ExpandedAbilityText label="Full Command wording" text={dragon.command?.rawDescription} />
              {position === 'vanguard' ? (
                <ExpandedAbilityText label="Full Vanguard Trait wording" text={dragon.trait?.rawDescription} />
              ) : null}
            </div>
          ) : null}
          <div className="formation-card-actions">
            <div className="formation-card-primary-actions">
              <button type="button" className="secondary-button compact-action" onClick={onChooseDragon}>
                Change dragon
              </button>
              <button type="button" className="secondary-button compact-action" onClick={() => onOpenDetails(dragon)}>
                View details
              </button>
            </div>
            <div className="movement-controls" aria-label={`${positionLabels[position]} movement controls`}>
              {FORMATION_POSITIONS.filter((target) => target !== position).map((target) => {
                const label = `Move to ${positionLabels[target]}`;
                const actionLabel = movementOccupancy[target] ? `${label}, swapping with the selected dragon there` : label;
                return (
                  <button
                    aria-label={actionLabel}
                    className="secondary-button compact-action"
                    key={target}
                    title={actionLabel}
                    type="button"
                    onClick={() => onMove(target)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button type="button" className="text-button compact-action clear-position-action" onClick={onClear}>
              Clear position
            </button>
          </div>
        </>
      ) : (
        <div className="empty-formation-slot">
          <p className="empty-card-note">Add a dragon to review its command, position trait, and mapped synergy signals.</p>
          <button type="button" className="primary-button" onClick={onChooseDragon}>
            + Add Dragon
          </button>
        </div>
      )}
    </article>
  );
}

function SimpleCommandPanel({
  command,
  profile,
  rosterEntry,
}: {
  command: Dragon['command'];
  profile?: DragonSynergyProfile;
  rosterEntry?: OwnedDragon;
}) {
  if (!command) {
    return (
      <section className="card-mini-section command-panel" aria-label="Command">
        <h4>Command</h4>
        <p>Command details not verified.</p>
      </section>
    );
  }

  return (
    <section className="card-mini-section command-panel" aria-label="Command">
      <div className="mini-section-heading">
        <h4>{command.name}</h4>
        <AbilityTypeBadge label="Command" />
      </div>
      <AbilitySummary ability={command} profile={profile} rosterEntry={rosterEntry} />
    </section>
  );
}

function SimpleTraitPanel({
  trait,
  position,
  profile,
  rosterEntry,
}: {
  trait: Dragon['trait'];
  position: FormationPosition;
  profile?: DragonSynergyProfile;
  rosterEntry?: OwnedDragon;
}) {
  if (position !== 'vanguard') {
    return null;
  }

  if (!trait) {
    return (
      <section className="card-mini-section" aria-label="Trait status">
        <h4>Vanguard Trait</h4>
        <p>Vanguard Trait details not verified.</p>
      </section>
    );
  }

  return (
    <section className="card-mini-section" aria-label="Trait status">
      <div className="mini-section-heading">
        <h4>{trait.name}</h4>
        <AbilityTypeBadge label="Vanguard Trait" />
      </div>
      <p className="trait-compact-context">{traitProgressionSummary(trait, rosterEntry)}</p>
      <AbilitySummary ability={trait} profile={profile} rosterEntry={rosterEntry} />
    </section>
  );
}

function traitProgressionSummary(trait: AbilityDefinition, rosterEntry?: OwnedDragon) {
  if (trait.minimumDragonLevel === null) {
    return 'Active while deployed in Vanguard.';
  }
  if (rosterEntry?.reignLevel === null || rosterEntry?.reignLevel === undefined) {
    return `Vanguard effect · Dragon Level ${trait.minimumDragonLevel}+`;
  }
  return rosterEntry.reignLevel >= trait.minimumDragonLevel
    ? `Active in Vanguard · Dragon Level ${trait.minimumDragonLevel}+`
    : `Progression locked · Dragon Level ${trait.minimumDragonLevel}+`;
}

function FormationSignalPanel({
  title,
  chips,
  fallback,
}: {
  title: 'Damage profile' | 'Provides' | 'Synergy needs';
  chips: FormationSignalChip[];
  fallback: string;
}) {
  return (
    <section className="card-mini-section formation-signal-panel formation-signal-panel--light" aria-label={title}>
      <h4>{title}</h4>
      {chips.length > 0 ? (
        <ul className="chip-list formation-chip-list">
          {chips.map((chip) => {
            const marker = signalMarker(chip);
            return (
              <li
                key={chip.label}
                className={`chip formation-signal-chip signal-${chip.state}`}
                data-state={chip.state}
                title={`${chip.label}: ${chip.reason}`}
                aria-label={`${chip.label} ${chip.state}. ${chip.reason}`}
              >
                <marker.Icon className="signal-state-icon" size={13} aria-hidden="true" />
                {chip.label}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="notice-text">{fallback}</p>
      )}
    </section>
  );
}

function signalMarker(chip: FormationSignalChip): { Icon: LucideIcon } {
  if (chip.state === 'supported' || chip.state === 'used' || chip.state === 'satisfied') {
    return { Icon: Check };
  }
  if (chip.state === 'available') {
    return { Icon: Circle };
  }
  if (chip.state === 'inactive' && /star|dragon level|progression|unlock/i.test(chip.reason)) {
    return { Icon: LockKeyhole };
  }
  return { Icon: X };
}

function AbilityTypeBadge({ label }: { label: 'Command' | 'Vanguard Trait' }) {
  return (
    <p className="ability-badges compact-ability-badges">
      <span className="badge">{label}</span>
    </p>
  );
}

function AbilitySummary({
  ability,
  profile,
  rosterEntry,
}: {
  ability: AbilityDefinition;
  profile?: DragonSynergyProfile;
  rosterEntry?: OwnedDragon;
}) {
  const summary = summarizeAbilityForProgression(ability, [...(profile?.outputs ?? []), ...(profile?.supports ?? [])], {
    starRank: rosterEntry?.starRank ?? null,
    dragonLevel: rosterEntry?.reignLevel ?? null,
  });

  return (
    <div className="ability-summary compact-ability-summary">
      <p className="ability-summary-text">{summary.plainSummary}</p>
    </div>
  );
}

function ExpandedAbilityText({ label, text }: { label: string; text: string | null | undefined }) {
  return (
    <section className="expanded-ability-section" aria-label={label}>
      <h4>{label}</h4>
      {text ? (
        <div className="raw-ability-text">
          {text.split(/\n\n+/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : <p className="notice-text">{unknown}</p>}
    </section>
  );
}

const troopIcons: Record<TroopType, LucideIcon> = {
  Cavalry: ChessKnight,
  Shieldbearers: Shield,
  Archers: BowArrow,
  Spearmen: Swords,
  Siege: Bomb,
};

function DragonAffinityIcons({
  dragonName,
  affinities,
}: {
  dragonName: string;
  affinities: Dragon['affinities'];
}) {
  const known = TROOP_TYPES.filter((troopType) => affinities[troopType] !== 'unknown');
  const unknownCount = TROOP_TYPES.length - known.length;

  if (known.length === 0) {
    return (
      <div className="compact-affinity-group is-unverified" aria-label={`${dragonName} affinities`}>
        <span className="affinity-unverified-mark" aria-hidden="true">?</span>
        <span>Affinities not verified.</span>
      </div>
    );
  }

  return (
    <div className="compact-affinity-group" aria-label={`${dragonName} affinities`}>
      <div className="compact-affinity-icons">
        {known.map((troopType) => {
          const affinity = affinities[troopType];
          const Icon = troopIcons[troopType];
          const polarity = affinity === 'positive' ? 'Favorable' : affinity === 'negative' ? 'Unfavorable' : 'Neutral';
          const symbol = affinity === 'positive' ? '+' : affinity === 'negative' ? '−' : '•';
          return (
            <span
              className={`compact-affinity-icon affinity-${affinity}`}
              key={troopType}
              title={`${polarity} affinity: ${troopType}`}
              aria-label={`${polarity} affinity: ${troopType}`}
            >
              <Icon size={17} aria-hidden="true" />
              <span className="affinity-polarity" aria-hidden="true">{symbol}</span>
            </span>
          );
        })}
      </div>
      {unknownCount > 0 ? (
        <span
          className="partial-affinity-notice"
          title={`${unknownCount} additional ${unknownCount === 1 ? 'affinity remains' : 'affinities remain'} unverified.`}
          aria-label={`${unknownCount} additional ${unknownCount === 1 ? 'affinity remains' : 'affinities remain'} unverified.`}
        >
          +?
        </span>
      ) : null}
    </div>
  );
}
