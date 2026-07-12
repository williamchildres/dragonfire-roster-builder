import type { Dragon, FormationPosition, OwnedDragon, TroopType } from '../models/dragon';
import { FORMATION_POSITIONS } from '../models/dragon';
import { positionLabels, type Formation } from '../services/teamShare';

const unknown = 'Not verified yet';

export function SimpleFormationCard({
  position,
  formation,
  dragon,
  selectableDragons,
  rosterEntry,
  hasSimpleProfile,
  onDragonChange,
  onMove,
  onClear,
}: {
  position: FormationPosition;
  formation: Formation;
  dragon: Dragon | null;
  selectableDragons: Dragon[];
  rosterEntry?: OwnedDragon;
  hasSimpleProfile: boolean;
  onDragonChange: (dragonId: string | null) => void;
  onMove: (position: FormationPosition) => void;
  onClear: () => void;
}) {
  return (
    <article className={`team-slot formation-position ${position}`} aria-labelledby={`formation-card-${position}`}>
      <div className="position-card-top">
        <div className="position-card-heading">
          <p className="position-label" id={`formation-card-${position}`}>
            {positionLabels[position]}
          </p>
          {position === 'vanguard' ? <span className="vanguard-badge" aria-label="Vanguard badge">Center</span> : null}
        </div>
        <div className="position-controls">
          <label htmlFor={`formation-${position}`}>Dragon</label>
          <select
            id={`formation-${position}`}
            value={formation[position] ?? ''}
            onChange={(event) => onDragonChange(event.target.value || null)}
          >
            <option value="">Choose a dragon</option>
            {selectableDragons.map((candidate) => (
              <option
                key={candidate.id}
                value={candidate.id}
                disabled={FORMATION_POSITIONS.some(
                  (existingPosition) => existingPosition !== position && formation[existingPosition] === candidate.id,
                )}
              >
                {candidate.name} ({candidate.rarity}, {candidate.breed})
              </option>
            ))}
          </select>
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
      </div>
      {dragon ? (
        <>
          <ProfileCoverageIndicator mapped={hasSimpleProfile} />
          <SimpleCommandPanel command={dragon.command} />
          <SimpleTraitPanel trait={dragon.trait} position={position} rosterEntry={rosterEntry} />
          <DragonAffinityStrip dragonName={dragon.name} affinities={dragon.affinities} />
        </>
      ) : (
        <p className="empty-card-note">Choose a dragon to see command, trait, affinity, and curated profile coverage.</p>
      )}
    </article>
  );
}

function ProfileCoverageIndicator({ mapped }: { mapped: boolean }) {
  return (
    <section className="card-mini-section profile-coverage" aria-label="Curated profile">
      <h4>Curated profile</h4>
      <p>{mapped ? 'Curated profile available.' : 'Curated profile not yet mapped.'}</p>
    </section>
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
      <h4>Command</h4>
      <p>
        <strong>{command.name}</strong>
      </p>
      <RequirementList ability={command} />
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
  if (!trait) {
    return (
      <section className="card-mini-section" aria-label="Trait status">
        <h4>Trait</h4>
        <p>Ability details not verified.</p>
      </section>
    );
  }

  return (
    <section className="card-mini-section" aria-label="Trait status">
      <h4>Trait</h4>
      <p>
        <strong>{trait.name}</strong>
      </p>
      <RequirementList ability={trait} />
      <TraitPositionStatus trait={trait} position={position} rosterEntry={rosterEntry} />
      {trait.rawDescription ? <RawDescription text={trait.rawDescription} /> : <p>{unknown}</p>}
    </section>
  );
}

function RequirementList({ ability }: { ability: NonNullable<Dragon['command']> }) {
  const requirements = [
    ability.unlockStarRank !== null ? `Star Rank ${ability.unlockStarRank}` : null,
    ability.minimumDragonLevel !== null ? `Dragon Level ${ability.minimumDragonLevel}` : null,
    ability.positionRequirement ? positionLabels[ability.positionRequirement] : null,
  ].filter((item): item is string => item !== null);

  if (requirements.length === 0) {
    return <p className="notice-text">No recorded unlock requirement.</p>;
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
  return (
    <div className="raw-ability-text">
      {text.split(/\n\n+/).map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
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
