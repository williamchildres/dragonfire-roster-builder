import { useState } from 'react';
import type { AbilityDefinition, Dragon, FormationPosition, OwnedDragon, TroopType } from '../models/dragon';
import { FORMATION_POSITIONS } from '../models/dragon';
import { positionLabels } from '../services/teamShare';
import { summarizeAbility } from './dragonDetailPresentation';
import type { FormationSignalChip } from './formationCardPresentation';
import { getPublicVerificationLabel, getPublicVerificationTone } from './publicCardLabels';

const unknown = 'Not verified yet';

export function SimpleFormationCard({
  position,
  dragon,
  rosterEntry,
  signalChips,
  onChooseDragon,
  onOpenDetails,
  onMove,
  onClear,
}: {
  position: FormationPosition;
  dragon: Dragon | null;
  rosterEntry?: OwnedDragon;
  signalChips: {
    damageProfile: FormationSignalChip[];
    provides: FormationSignalChip[];
    benefitsFrom: FormationSignalChip[];
  };
  onChooseDragon: () => void;
  onOpenDetails: (dragon: Dragon) => void;
  onMove: (position: FormationPosition) => void;
  onClear: () => void;
}) {
  const owned = dragon ? rosterEntry?.owned === true : false;
  const starSummary = dragon && owned ? (rosterEntry?.starRank !== null && rosterEntry?.starRank !== undefined ? `Star ${rosterEntry.starRank}` : 'Star unknown') : null;

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
            <div>
              <h3>{dragon.name}</h3>
              <div className="dragon-card-chips" aria-label={`${dragon.name} metadata`}>
                <span className="badge">{dragon.rarity}</span>
                <span className="badge">{dragon.breed}</span>
                {starSummary ? <span className="badge">{starSummary}</span> : null}
              </div>
            </div>
          </div>
          <FormationSignalPanel title="Damage profile" chips={signalChips.damageProfile} fallback="No current damage profile recorded." />
          <FormationSignalPanel title="Provides" chips={signalChips.provides} fallback="No formation-wide output profile recorded." />
          <FormationSignalPanel title="Benefits from" chips={signalChips.benefitsFrom} fallback="No mapped incoming synergy yet." />
          <SimpleCommandPanel command={dragon.command} />
          <SimpleTraitPanel trait={dragon.trait} position={position} rosterEntry={rosterEntry} />
          <DragonAffinityStrip dragonName={dragon.name} affinities={dragon.affinities} />
          <div className="formation-card-actions">
            <button type="button" className="secondary-button compact-action" onClick={onChooseDragon}>
              Change dragon
            </button>
            <button type="button" className="secondary-button compact-action" onClick={() => onOpenDetails(dragon)}>
              View details
            </button>
            <div className="movement-controls" aria-label={`${positionLabels[position]} movement controls`}>
              {FORMATION_POSITIONS.filter((target) => target !== position).map((target) => (
                <button className="secondary-button compact-action" key={target} type="button" onClick={() => onMove(target)}>
                  Move to {positionLabels[target]}
                </button>
              ))}
              <button type="button" className="secondary-button compact-action clear-position-action" onClick={onClear}>
                Clear position
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-formation-slot">
          <p className="empty-card-note">Add a dragon to review command, Vanguard Trait, affinities, and synergy signals.</p>
          <button type="button" className="primary-button" onClick={onChooseDragon}>
            + Add Dragon
          </button>
        </div>
      )}
    </article>
  );
}

function SimpleCommandPanel({ command }: { command: Dragon['command'] }) {
  if (!command) {
    return (
      <section className="card-mini-section command-panel" aria-label="Command">
        <h4>Command</h4>
        <p>Ability details not verified.</p>
      </section>
    );
  }

  return (
    <section className="card-mini-section command-panel" aria-label="Command">
      <div className="mini-section-heading">
        <h4>Command</h4>
        <AbilityBadges ability={command} />
      </div>
      <p>
        <strong>{command.name}</strong>
      </p>
      <AbilitySummary ability={command} />
      {command.rawDescription ? <RawDescription text={command.rawDescription} /> : <p>{unknown}</p>}
    </section>
  );
}

function SimpleTraitPanel({
  trait,
  position,
  rosterEntry,
}: {
  trait: Dragon['trait'];
  position: FormationPosition;
  rosterEntry?: OwnedDragon;
}) {
  if (position !== 'vanguard') {
    return null;
  }

  if (!trait) {
    return (
      <section className="card-mini-section" aria-label="Trait status">
        <h4>Vanguard Trait</h4>
        <p>Ability details not verified.</p>
      </section>
    );
  }

  return (
    <section className="card-mini-section" aria-label="Trait status">
      <div className="mini-section-heading">
        <h4>Vanguard Trait</h4>
        <AbilityBadges ability={trait} />
      </div>
      <p>
        <strong>{trait.name}</strong>
      </p>
      <RequirementList ability={trait} />
      <TraitPositionStatus trait={trait} position={position} rosterEntry={rosterEntry} />
      {trait.rawDescription ? <RawDescription text={trait.rawDescription} /> : <p>{unknown}</p>}
    </section>
  );
}

function FormationSignalPanel({
  title,
  chips,
  fallback,
}: {
  title: 'Damage profile' | 'Provides' | 'Benefits from';
  chips: FormationSignalChip[];
  fallback: string;
}) {
  return (
    <section className="card-mini-section formation-signal-panel" aria-label={title}>
      <h4>{title}</h4>
      {chips.length > 0 ? (
        <ul className="chip-list formation-chip-list">
          {chips.map((chip) => (
            <li
              key={chip.label}
              className={`chip formation-signal-chip signal-${chip.state}`}
              data-state={chip.state}
              title={`${chip.label}: ${chip.reason}`}
              aria-label={`${chip.label} ${chip.state}. ${chip.reason}`}
            >
              {chip.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="notice-text">{fallback}</p>
      )}
    </section>
  );
}

function AbilityBadges({ ability }: { ability: AbilityDefinition }) {
  const verificationLabel = getPublicVerificationLabel(ability.verification.status);
  const verificationTone = getPublicVerificationTone(ability.verification.status);

  return (
    <p className="ability-badges compact-ability-badges">
      <span className="badge">{ability.kind === 'trait' ? 'Vanguard Trait' : titleCase(ability.kind)}</span>
      {ability.abilityClass ? <span className="badge">{titleCase(ability.abilityClass)}</span> : null}
      {verificationLabel ? (
        <span className={`badge verification-${verificationTone ?? 'verified'}`}>{verificationLabel}</span>
      ) : null}
    </p>
  );
}

function AbilitySummary({ ability }: { ability: AbilityDefinition }) {
  const summary = summarizeAbility(ability);

  return (
    <div className="ability-summary compact-ability-summary">
      <p className="ability-summary-text">{summary.plainSummary}</p>
    </div>
  );
}

function RequirementList({ ability }: { ability: AbilityDefinition }) {
  const requirements = [
    ability.unlockStarRank !== null ? `Star Rank ${ability.unlockStarRank}` : null,
    ability.minimumDragonLevel !== null ? `Dragon Level ${ability.minimumDragonLevel}` : null,
    ability.positionRequirement ? positionLabels[ability.positionRequirement] : null,
  ].filter((item): item is string => item !== null);

  if (requirements.length === 0) {
    return null;
  }

  return (
    <p className="notice-text">
      Requirement: {requirements.join(', ')}
    </p>
  );
}

function TraitPositionStatus({
  trait,
  position,
  rosterEntry,
}: {
  trait: NonNullable<Dragon['trait']>;
  position: FormationPosition;
  rosterEntry?: OwnedDragon;
}) {
  const levelBlocked = trait.minimumDragonLevel !== null && (rosterEntry?.reignLevel ?? 0) < trait.minimumDragonLevel;

  if (trait.positionRequirement && trait.positionRequirement !== position) {
    return <p className="notice-text">Requires {positionLabels[trait.positionRequirement]}.</p>;
  }

  if (levelBlocked) {
    return <p className="notice-text">Requires Dragon Level {trait.minimumDragonLevel}.</p>;
  }

  if (trait.positionRequirement) {
    return <p className="notice-text">Position requirement met.</p>;
  }

  return null;
}

function RawDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        className="text-button formation-wording-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? 'Hide full wording' : 'Show full wording'}
      </button>
      {expanded ? (
        <div className="raw-ability-text">
          {text.split(/\n\n+/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}
    </>
  );
}

function DragonAffinityStrip({
  dragonName,
  affinities,
}: {
  dragonName: string;
  affinities: Dragon['affinities'];
}) {
  const favorable = troopTypesForAffinity(affinities, 'positive');
  const unfavorable = troopTypesForAffinity(affinities, 'negative');

  return (
    <section className="card-mini-section" aria-label={`${dragonName} affinities`}>
      <h4>Affinities</h4>
      <div className="affinity-row">
        <span className="affinity-label">Favorable</span>
        <AffinityIconList troopTypes={favorable} polarity="positive" emptyText="None recorded" />
      </div>
      <div className="affinity-row">
        <span className="affinity-label">Unfavorable</span>
        <AffinityIconList troopTypes={unfavorable} polarity="negative" emptyText="None recorded" />
      </div>
    </section>
  );
}

function troopTypesForAffinity(affinities: Dragon['affinities'], affinity: Dragon['affinities'][TroopType]): TroopType[] {
  return Object.entries(affinities)
    .filter((entry): entry is [TroopType, typeof affinity] => entry[1] === affinity)
    .map(([troopType]) => troopType);
}

function AffinityIconList({
  troopTypes,
  polarity,
  emptyText,
}: {
  troopTypes: TroopType[];
  polarity: 'positive' | 'negative';
  emptyText: string;
}) {
  if (troopTypes.length === 0) {
    return <span className="muted-inline">{emptyText}</span>;
  }
  return (
    <span className="affinity-icons">
      {troopTypes.map((troopType) => (
        <span
          className={`affinity-chip ${polarity}`}
          key={troopType}
          title={`${polarity === 'positive' ? 'Favorable' : 'Unfavorable'} affinity: ${troopType}`}
          aria-label={`${polarity === 'positive' ? 'Favorable' : 'Unfavorable'} affinity: ${troopType}`}
        >
          <span aria-hidden="true">{polarity === 'positive' ? '+' : '-'}</span>
          {troopType}
        </span>
      ))}
    </span>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
