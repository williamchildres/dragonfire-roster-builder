import { ArrowRightLeft, Bomb, BookOpen, BowArrow, ChevronDown, ChevronUp, ChessKnight, RefreshCw, Shield, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { AriaAttributes } from 'react';
import type { AbilityDefinition, Dragon, FormationPosition, OwnedDragon, TroopType } from '../models/dragon';
import { FORMATION_POSITIONS, TROOP_TYPES } from '../models/dragon';
import { positionLabels } from '../services/teamShare';
import type { DragonSynergyProfile } from '../synergy/types';
import { summarizeAbilityForProgression } from './dragonDetailPresentation';
import { currentProgressionVisibleChips, type FormationSignalChip } from './formationCardPresentation';
import { formationSignalStateMarker } from './formationSignalPresentation';

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
  const starRank = dragon && owned ? rosterEntry?.starRank : undefined;
  const starRankLabel = starRank === null || starRank === undefined ? 'Star Rank unknown' : `Star Rank ${starRank}`;
  const starRankDisplay = starRank === null || starRank === undefined ? '?★' : `${starRank}★`;
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
              <div className="formation-dragon-title-row">
                <h3>{dragon.name}</h3>
                {owned ? <span className="formation-inline-rank" aria-label={starRankLabel}>{starRankDisplay}</span> : null}
              </div>
              <div className="formation-identity-metadata" aria-label={`${dragon.name} identity metadata`}>
                <span className="badge">{dragon.rarity}</span>
                <span className="badge">{dragon.breed}</span>
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
            {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
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
                <RefreshCw size={16} aria-hidden="true" />
                Replace dragon
              </button>
              <button type="button" className="secondary-button compact-action" onClick={() => onOpenDetails(dragon)}>
                <BookOpen size={16} aria-hidden="true" />
                Dragon details
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
                    <ArrowRightLeft size={16} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
            <button type="button" className="text-button compact-action clear-position-action" onClick={onClear}>
              <X size={16} aria-hidden="true" />
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
  const visibleChips = title === 'Damage profile' ? chips : currentProgressionVisibleChips(chips);
  const hiddenOnly = chips.length > 0 && visibleChips.length === 0;
  const emptyMessage = title === 'Provides'
    ? 'No currently unlocked Provides signals.'
    : 'No currently unlocked synergy needs.';

  return (
    <section className="card-mini-section formation-signal-panel formation-signal-panel--light" aria-label={title}>
      <h4>{title}</h4>
      {visibleChips.length > 0 ? (
        <ul className="chip-list formation-chip-list">
          {visibleChips.map((chip) => {
            const { Icon, marker } = formationSignalStateMarker(chip);
            return (
              <li
                key={chip.label}
                className={`chip formation-signal-chip signal-${chip.state}`}
                data-state={chip.state}
                title={`${chip.label}: ${chip.reason}`}
                aria-label={`${chip.label} ${chip.state}. ${chip.reason}`}
              >
                <Icon className="signal-state-icon" data-state-marker={marker} size={13} aria-hidden="true" />
                {chip.label}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="notice-text">{hiddenOnly ? emptyMessage : fallback}</p>
      )}
    </section>
  );
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

const troopIcons: Record<Exclude<TroopType, 'Spearmen'>, LucideIcon> = {
  Cavalry: ChessKnight,
  Shieldbearers: Shield,
  Archers: BowArrow,
  Siege: Bomb,
};

function SpearIcon({ size = 17, 'aria-hidden': ariaHidden }: { size?: number; 'aria-hidden'?: AriaAttributes['aria-hidden'] }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden={ariaHidden}>
      <path d="M5 19 19 5" />
      <path d="m15 5 4-3 3 3-3 4Z" />
      <path d="m4 20 3-1-2-2Z" />
    </svg>
  );
}

export function DragonAffinityIcons({
  dragonName,
  affinities,
}: {
  dragonName: string;
  affinities: Dragon['affinities'];
}) {
  const known = TROOP_TYPES.filter((troopType) => affinities[troopType] === 'positive' || affinities[troopType] === 'negative');
  const unknownCount = TROOP_TYPES.filter((troopType) => affinities[troopType] === 'unknown').length;

  if (known.length === 0 && unknownCount === TROOP_TYPES.length) {
    return (
      <div className="compact-affinity-group is-unverified" aria-label={`${dragonName} affinities`}>
        <span className="affinity-unverified-mark" aria-hidden="true">?</span>
        <span>Affinities not verified.</span>
      </div>
    );
  }

  return (
    <div
      className="compact-affinity-group"
      aria-label={`${dragonName} affinities${unknownCount > 0 ? '; additional affinities are unverified' : ''}`}
    >
      <div className="compact-affinity-icons">
        {known.map((troopType) => {
          const affinity = affinities[troopType];
          const Icon = troopType === 'Spearmen' ? SpearIcon : troopIcons[troopType];
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
    </div>
  );
}
