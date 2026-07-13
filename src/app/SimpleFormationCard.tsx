import { useState } from 'react';
import type { AbilityDefinition, Dragon, FormationPosition, OwnedDragon, TroopType } from '../models/dragon';
import { FORMATION_POSITIONS } from '../models/dragon';
import { positionLabels } from '../services/teamShare';
import { summarizeAbility } from './dragonDetailPresentation';
import type { FormationSignalChip } from './formationCardPresentation';

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
          <FormationSignalPanel title="Synergy needs" chips={signalChips.benefitsFrom} fallback="No mapped incoming synergy yet." />
          <SimpleCommandPanel command={dragon.command} />
          <SimpleTraitPanel trait={dragon.trait} position={position} />
          <DragonAffinityStrip dragonName={dragon.name} affinities={dragon.affinities} />
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
              {FORMATION_POSITIONS.filter((target) => target !== position).map((target) => (
                <button className="secondary-button compact-action" key={target} type="button" onClick={() => onMove(target)}>
                  {positionLabels[target]}
                </button>
              ))}
            </div>
            <button type="button" className="text-button compact-action clear-position-action" onClick={onClear}>
              Clear position
            </button>
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
        <h4>{command.name}</h4>
        <AbilityTypeBadge label="Command" />
      </div>
      <AbilitySummary ability={command} />
      {command.rawDescription ? <RawDescription text={command.rawDescription} /> : <p>{unknown}</p>}
    </section>
  );
}

function SimpleTraitPanel({
  trait,
  position,
}: {
  trait: Dragon['trait'];
  position: FormationPosition;
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
        <h4>{trait.name}</h4>
        <AbilityTypeBadge label="Vanguard Trait" />
      </div>
      {trait.rawDescription ? <FullAbilityText text={trait.rawDescription} /> : <p>{unknown}</p>}
    </section>
  );
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

function AbilityTypeBadge({ label }: { label: 'Command' | 'Vanguard Trait' }) {
  return (
    <p className="ability-badges compact-ability-badges">
      <span className="badge">{label}</span>
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

function FullAbilityText({ text }: { text: string }) {
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
