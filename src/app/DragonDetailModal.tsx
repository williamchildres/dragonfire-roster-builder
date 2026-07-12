import { ExternalLink, X } from 'lucide-react';
import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { dragonObservationSnapshots } from '../data/observations';
import { dragonStatDefinitions } from '../data/statDefinitions';
import { evidenceSources } from '../data/evidence';
import { statusGlossary } from '../data/statusGlossary';
import type {
  AbilityDefinition,
  Dragon,
  DragonCollectionState,
  OwnedDragon,
  VerificationStatus,
} from '../models/dragon';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { positionLabels } from '../services/teamShare';
import { buildDragonDetailPresentation, summarizeAbility, type DragonDetailPresentation } from './dragonDetailPresentation';

const unknown = 'Not yet verified';

export function DragonDetailsDialog({
  dragon,
  rosterEntry,
  onClose,
  onUpdateRoster,
}: {
  dragon: Dragon;
  rosterEntry?: OwnedDragon;
  onClose: () => void;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const profile = useMemo(
    () => simpleSynergyProfiles.find((candidate) => candidate.dragonId === dragon.id),
    [dragon.id],
  );
  const presentation = useMemo(() => buildDragonDetailPresentation(profile), [profile]);

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
      previousFocus.current?.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) {
      return;
    }

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const dataStatusLabel = formatStatus(dragon.dataStatus);
  const rosterSourceLabel = formatRosterSourceStatus(dragon.rosterSourceStatus);

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        aria-labelledby="dragon-dialog-title"
        aria-modal="true"
        className="details-dialog"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="details-header">
          <div className="details-heading">
            <DragonEmblem dragon={dragon} />
            <div className="details-heading-copy">
              <p className="eyebrow">Dragon details</p>
              <h2 id="dragon-dialog-title">{dragon.name}</h2>
              <p className="details-subtitle">
                {dragon.rarity} - {dragon.breed} - {dataStatusLabel}
              </p>
              <p className="details-summary-line">{presentation.headerLine}</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close details">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        {presentation.metadataNotice ? <p className="notice-text details-notice">{presentation.metadataNotice}</p> : null}

        <div className="details-layout">
          <div className="details-main">
            <DragonAtAGlance presentation={presentation} />
            <section className="panel details-abilities-panel">
              <h3>What it does</h3>
              <div className="ability-stack">
                {dragon.command ? (
                  <DragonAbilityCard ability={dragon.command} rosterEntry={rosterEntry} onUpdateRoster={onUpdateRoster} />
                ) : null}
                {dragon.trait ? (
                  <DragonAbilityCard ability={dragon.trait} rosterEntry={rosterEntry} onUpdateRoster={onUpdateRoster} />
                ) : null}
                {dragon.habits.length > 0 ? (
                  dragon.habits.map((habit) => (
                    <DragonAbilityCard
                      ability={habit}
                      key={habit.id}
                      rosterEntry={rosterEntry}
                      onUpdateRoster={onUpdateRoster}
                    />
                  ))
                ) : dragon.command || dragon.trait ? null : (
                  <p className="notice-text">Ability details not yet verified.</p>
                )}
              </div>
            </section>
            <DragonTechnicalDetails dragon={dragon} />
          </div>

          <aside className="details-side">
            <section className="panel">
              <h3>Ownership</h3>
              <RosterFields dragon={dragon} rosterEntry={rosterEntry} onUpdateRoster={onUpdateRoster} />
            </section>

            <section className="panel">
              <h3>Identity</h3>
              <dl className="detail-list">
                <div>
                  <dt>Verification status</dt>
                  <dd>{dataStatusLabel}</dd>
                </div>
                <div>
                  <dt>Roster source</dt>
                  <dd>{rosterSourceLabel}</dd>
                </div>
                <div>
                  <dt>First observed in game</dt>
                  <dd>{dragon.firstObservedInGame ?? unknown}</dd>
                </div>
                <div>
                  <dt>Game version</dt>
                  <dd>{dragon.gameVersion ?? unknown}</dd>
                </div>
                <div>
                  <dt>Last verified</dt>
                  <dd>{dragon.lastVerified}</dd>
                </div>
              </dl>
              {dragon.officialProfileUrl ? (
                <a href={dragon.officialProfileUrl} target="_blank" rel="noreferrer" className="inline-link">
                  Official profile <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : (
                <p className="notice-text">Official profile pending on the public roster site.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DragonAtAGlance({ presentation }: { presentation: DragonDetailPresentation }) {
  return (
    <section className="panel at-a-glance-panel">
      <h3>At a glance</h3>
      <div className="at-a-glance-grid">
        <AtAGlanceCard
          title="Provides"
          items={presentation.provides}
          fallback="No formation-wide output profile recorded."
        />
        <AtAGlanceCard
          title="Benefits from"
          items={presentation.benefitsFrom}
          fallback="No mapped incoming synergy yet."
        />
        <AtAGlanceCard
          title="Placement notes"
          items={presentation.placementNotes}
          fallback="No special placement requirement recorded."
        />
      </div>
    </section>
  );
}

function AtAGlanceCard({
  title,
  items,
  fallback,
}: {
  title: string;
  items: string[];
  fallback: string;
}) {
  return (
    <article className="glance-card">
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul className="chip-list">
          {items.map((item) => (
            <li key={item} className="chip">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="notice-text">{fallback}</p>
      )}
    </article>
  );
}

function DragonAbilityCard({
  ability,
  rosterEntry,
  onUpdateRoster,
}: {
  ability: AbilityDefinition;
  rosterEntry?: OwnedDragon;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
}) {
  const presentation = summarizeAbility(ability);
  const starRank = rosterEntry?.starRank ?? null;
  const locked =
    ability.kind === 'habit' &&
    ability.unlockStarRank !== null &&
    (starRank === null || starRank < ability.unlockStarRank);
  const habitLevel = rosterEntry?.habitLevels[ability.id] ?? null;

  return (
    <article className="ability-card">
      <div className="ability-card-header">
        <div>
          <h4>{ability.name}</h4>
          <p className="ability-badges">
            <span className="badge">{titleCase(ability.kind)}</span>
            <span className="badge">{ability.abilityClass ? titleCase(ability.abilityClass) : 'Unknown Class'}</span>
            <span className="badge">{verificationLabel(ability.verification.status)}</span>
            {locked ? <span className="badge">Locked preview</span> : <span className="badge">Unlocked or available</span>}
          </p>
        </div>
      </div>

      <div className="ability-summary">
        <p className="ability-summary-label">Plain summary</p>
        <p className="ability-summary-text">{presentation.plainSummary}</p>
        {presentation.chips.length > 0 ? (
          <ul className="chip-list ability-chip-list">
            {presentation.chips.map((chip) => (
              <li key={chip} className="chip">
                {chip}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <dl className="detail-list ability-meta">
        <div>
          <dt>Unlock requirement</dt>
          <dd>{formatUnlockRequirement(ability)}</dd>
        </div>
        <div>
          <dt>Position requirement</dt>
          <dd>{ability.positionRequirement ? positionLabels[ability.positionRequirement] : 'No special position requirement'}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{ability.evidenceIds.length > 0 ? ability.evidenceIds.length : unknown}</dd>
        </div>
        {ability.kind === 'habit' ? (
          <div>
            <dt>Saved Habit Level</dt>
            <dd>{habitLevel ?? 'Not recorded'}</dd>
          </div>
        ) : null}
      </dl>

      {ability.kind === 'habit' ? (
        <label className="ability-habit-level">
          Habit Level
          <select
            value={habitLevel ?? ''}
            onChange={(event) =>
              onUpdateRoster(ability.dragonId, {
                habitLevels: {
                  ...(rosterEntry?.habitLevels ?? {}),
                  [ability.id]: event.target.value === '' ? null : (Number(event.target.value) as 0 | 1 | 2 | 3 | 4 | 5),
                },
              })
            }
          >
            <option value="">Not recorded</option>
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <details className="ability-technical-disclosure">
        <summary>Technical tags</summary>
        {presentation.technicalTags.length > 0 ? (
          <p>{presentation.technicalTags.join(', ')}</p>
        ) : (
          <p>{unknown}</p>
        )}
      </details>

      <RawWordingDisclosure rawText={ability.rawDescription} />
    </article>
  );
}

function DragonTechnicalDetails({ dragon }: { dragon: Dragon }) {
  const observation = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === dragon.id);
  const hasStatusGlossary = statusGlossary.some((entry) =>
    dragon.tags.some((tag) => tag.toLowerCase().replaceAll('_', '-') === entry.id),
  );
  const matchedEvidence = evidenceSources.filter(
    (source) =>
      source.id === 'official-roster-2026-06-23' ||
      [dragon.command, dragon.trait, ...dragon.habits]
        .filter(Boolean)
        .flatMap((ability) => ability?.evidenceIds ?? [])
        .includes(source.id) ||
      source.id.startsWith(dragon.id),
  );

  return (
    <section className="panel technical-panel">
      <h3>Evidence & technical details</h3>
      <div className="technical-disclosure-stack">
        <details className="technical-disclosure">
          <summary>Structured tags</summary>
          <p>{dragon.tags.length > 0 ? dragon.tags.join(', ') : unknown}</p>
        </details>

        <details className="technical-disclosure">
          <summary>Stat definitions</summary>
          <ul className="plain-list">
            {dragonStatDefinitions.map((definition) => (
              <li key={definition.id}>
                <strong>{definition.name}:</strong> {definition.description}{' '}
                {definition.canonicalFormulaKnown ? 'Formula known.' : 'Formula not yet verified.'}
              </li>
            ))}
          </ul>
        </details>

        <details className="technical-disclosure">
          <summary>Status glossary</summary>
          {hasStatusGlossary ? (
            <ul className="plain-list">
              {statusGlossary
                .filter((entry) => dragon.tags.some((tag) => tag.toLowerCase().replaceAll('_', '-') === entry.id))
                .map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.term}:</strong> {entry.definition}
                  </li>
                ))}
            </ul>
          ) : (
            <p>{unknown}</p>
          )}
        </details>

        <details className="technical-disclosure">
          <summary>Evidence</summary>
          {matchedEvidence.length > 0 ? (
            <ul className="plain-list">
              {matchedEvidence.map((source) => (
                <li key={source.id}>
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  ) : (
                    <span>{source.title}</span>
                  )}
                  <span> - {formatStatus(source.verificationStatus)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>{unknown}</p>
          )}
        </details>

        <details className="technical-disclosure">
          <summary>Account observation</summary>
          {observation ? (
            <>
              <p className="notice-text">Account-specific observation - not a canonical base-stat record.</p>
              <dl className="detail-list">
                <div>
                  <dt>Dragon Level</dt>
                  <dd>{observation.dragonLevel ?? unknown}</dd>
                </div>
                <div>
                  <dt>Star Rank</dt>
                  <dd>{observation.starRank ?? unknown}</dd>
                </div>
                <div>
                  <dt>Star Progress</dt>
                  <dd>
                    {observation.starProgressCurrent !== null && observation.starProgressRequired !== null
                      ? `${observation.starProgressCurrent} / ${observation.starProgressRequired}`
                      : unknown}
                  </dd>
                </div>
                <div>
                  <dt>Collection</dt>
                  <dd>
                    {observation.collection
                      ? `${formatCollectionState(observation.collection.state)}${
                          observation.collection.shardsCurrent !== null &&
                          observation.collection.shardsRequired !== null
                            ? ` (${observation.collection.shardsCurrent} / ${observation.collection.shardsRequired} shards)`
                            : ''
                        }`
                      : unknown}
                  </dd>
                </div>
                {Object.entries(observation.combatStats).map(([key, value]) => (
                  <div key={key}>
                    <dt>{titleCase(key)}</dt>
                    <dd>{value ?? unknown}</dd>
                  </div>
                ))}
                <div>
                  <dt>March Speed</dt>
                  <dd>{observation.marchSpeed ?? unknown}</dd>
                </div>
                <div>
                  <dt>Stamina</dt>
                  <dd>
                    {observation.staminaCurrent !== null && observation.staminaMaximum !== null
                      ? `${observation.staminaCurrent} / ${observation.staminaMaximum}`
                      : unknown}
                  </dd>
                </div>
                <div>
                  <dt>Troop Capacity</dt>
                  <dd>{observation.troopCapacity ?? unknown}</dd>
                </div>
                <div>
                  <dt>Dragon Power</dt>
                  <dd>{observation.dragonPower ?? unknown}</dd>
                </div>
                <div>
                  <dt>Modifier context known</dt>
                  <dd>{observation.modifierContextKnown ? 'Known' : 'Unknown'}</dd>
                </div>
                <div>
                  <dt>Canonical</dt>
                  <dd>No</dd>
                </div>
              </dl>
            </>
          ) : (
            <p>{unknown}</p>
          )}
        </details>
      </div>
    </section>
  );
}

export function RawWordingDisclosure({ rawText }: { rawText: string | null }) {
  if (!rawText) {
    return null;
  }

  const paragraphs = rawText
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <details className="ability-technical-disclosure">
      <summary>Verified wording</summary>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </details>
  );
}

function RosterFields({
  dragon,
  rosterEntry,
  onUpdateRoster,
}: {
  dragon: Dragon;
  rosterEntry?: OwnedDragon;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
}) {
  return (
    <div className="roster-fields roster-fields-wide">
      <label className="check-row">
        <input
          type="checkbox"
          checked={rosterEntry?.owned === true}
          onChange={(event) =>
            onUpdateRoster(dragon.id, {
              owned: event.target.checked,
            })
          }
        />
        Owned / Hatched
      </label>
      <label>
        Star Rank
        <select
          value={rosterEntry?.starRank ?? ''}
          onChange={(event) =>
            onUpdateRoster(dragon.id, {
              starRank: event.target.value ? Number(event.target.value) : null,
            })
          }
        >
          <option value="">Unknown</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => (
            <option key={rank} value={rank}>
              {rank}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reign Level
        <input
          min={0}
          step={1}
          type="number"
          value={rosterEntry?.reignLevel ?? ''}
          placeholder="Unknown"
          onChange={(event) =>
            onUpdateRoster(dragon.id, {
              reignLevel: event.target.value === '' ? null : Math.max(0, Number.parseInt(event.target.value, 10)),
            })
          }
        />
      </label>
      <label>
        Personal notes
        <textarea
          maxLength={1000}
          rows={4}
          value={rosterEntry?.notes ?? ''}
          onChange={(event) => onUpdateRoster(dragon.id, { notes: event.target.value })}
        />
      </label>
    </div>
  );
}

function formatUnlockRequirement(ability: AbilityDefinition) {
  const unlockParts: string[] = [];
  if (ability.unlockStarRank !== null) {
    unlockParts.push(`Star Rank ${ability.unlockStarRank}`);
  }
  if (ability.minimumDragonLevel !== null) {
    unlockParts.push(`Level ${ability.minimumDragonLevel}+`);
  }
  return unlockParts.length > 0 ? unlockParts.join(' / ') : 'No star rank requirement recorded';
}

function verificationLabel(status: string) {
  return status
    .split('-')
    .map((part) => titleCase(part))
    .join(' ');
}

function formatStatus(status: VerificationStatus) {
  return status
    .split('-')
    .map((part) => titleCase(part))
    .join(' ');
}

function formatRosterSourceStatus(status: Dragon['rosterSourceStatus']) {
  switch (status) {
    case 'official-website':
      return 'Official website';
    case 'in-game-verified-pending-official-site':
      return 'In-game verified, pending official site';
    case 'community-unverified':
      return 'Community unverified';
  }
}

function formatCollectionState(state: DragonCollectionState) {
  switch (state) {
    case 'not-collected':
      return 'Not collected';
    case 'not-hatched':
      return 'Not hatched';
    case 'hatched':
      return 'Hatched';
  }
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function DragonEmblem({ dragon }: { dragon: Dragon }) {
  return (
    <div className={`dragon-emblem breed-${dragon.breed.toLowerCase()}`} aria-hidden="true">
      <span>{dragon.name.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}
