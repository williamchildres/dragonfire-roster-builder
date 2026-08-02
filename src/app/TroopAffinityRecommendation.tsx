import { useId, useMemo } from 'react';
import type { Dragon } from '../models/dragon';
import {
  recommendTroopAffinity,
  type FormationTroopAffinityRecommendation,
  type TroopAffinityCandidate,
  type TroopAffinityRecommendationKind,
} from '../services/troopAffinityRecommendation';

export function TroopAffinityRecommendation({
  formationDragons,
  compact = false,
}: {
  formationDragons: readonly Dragon[];
  compact?: boolean;
}) {
  const headingId = useId();
  const recommendation = useMemo(
    () => formationDragons.length === 3 ? recommendTroopAffinity(formationDragons) : null,
    [formationDragons],
  );
  const namesById = useMemo(
    () => new Map(formationDragons.map((dragon) => [dragon.id, dragon.name])),
    [formationDragons],
  );

  if (!recommendation) {
    return (
      <section className={`troop-affinity-recommendation${compact ? ' is-compact' : ''}`} aria-labelledby={headingId}>
        <h4 id={headingId}>Troop Affinity</h4>
        <p className="empty-card-note">Add three dragons to receive a troop-affinity recommendation.</p>
      </section>
    );
  }

  const recommendedCandidates = recommendation.recommendedTroopTypes.map((troopType) =>
    recommendation.candidates.find((candidate) => candidate.troopType === troopType)!,
  );
  const positiveCoverage = Math.max(...recommendedCandidates.map((candidate) => candidate.positiveCount));
  return (
    <section className={`troop-affinity-recommendation${compact ? ' is-compact' : ''}`} aria-labelledby={headingId}>
      <div className="troop-affinity-heading">
        <div>
          <p className="eyebrow">Suggested troop affinity</p>
          <h4 id={headingId}>Troop Affinity</h4>
        </div>
        <span className={`troop-affinity-kind kind-${recommendation.kind}`}>{kindLabel(recommendation.kind)}</span>
      </div>
      <p className="troop-affinity-summary">
        {recommendationSummary(recommendation, recommendedCandidates, namesById)}
      </p>
      <p className="sr-only">Positive affinity coverage is {positiveCoverage} of 3 dragons.</p>
      {recommendation.kind === 'incomplete' ? (
        <p className="troop-affinity-warning" role="status">
          Some troop affinities are not verified, so this recommendation may be incomplete.
        </p>
      ) : null}
      {recommendation.recommendedTroopTypes.includes('Siege') ? (
        <p className="troop-affinity-warning" role="note">
          Siege has the strongest affinity coverage for this formation, but it is intended for Durability damage and is weak in ordinary troop matchups.
        </p>
      ) : null}
      <p className="troop-affinity-caveat">Enemy troop advantage may change this choice.</p>
      <details className="troop-affinity-details">
        <summary>Affinity breakdown for all five troop types</summary>
        <div className="troop-affinity-candidates">
          {recommendation.candidates.map((candidate) => (
            <CandidateBreakdown key={candidate.troopType} candidate={candidate} namesById={namesById} />
          ))}
        </div>
      </details>
    </section>
  );
}

function CandidateBreakdown({
  candidate,
  namesById,
}: {
  candidate: TroopAffinityCandidate;
  namesById: ReadonlyMap<string, string>;
}) {
  return (
    <div className="troop-affinity-candidate">
      <header>
        <strong>{candidate.troopType}</strong>
        <span>{candidate.positiveCount} of 3 positive</span>
      </header>
      {candidate.troopType === 'Siege' ? <p>Objective-specific: Durability and siege damage.</p> : null}
      <dl>
        <AffinityGroup label="+20% positive affinity" ids={candidate.positiveDragonIds} namesById={namesById} />
        <AffinityGroup label="No affinity modifier" ids={candidate.neutralDragonIds} namesById={namesById} />
        <AffinityGroup label="Negative affinity — reduced stats and siege damage" ids={candidate.negativeDragonIds} namesById={namesById} />
        <AffinityGroup label="Affinity not verified" ids={candidate.unknownDragonIds} namesById={namesById} />
      </dl>
    </div>
  );
}

function AffinityGroup({
  label,
  ids,
  namesById,
}: {
  label: string;
  ids: readonly string[];
  namesById: ReadonlyMap<string, string>;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{ids.length > 0 ? ids.map((id) => namesById.get(id) ?? id).join(', ') : 'None'}</dd>
    </div>
  );
}

function recommendationSummary(
  recommendation: FormationTroopAffinityRecommendation,
  recommended: readonly TroopAffinityCandidate[],
  namesById: ReadonlyMap<string, string>,
): string {
  const troopTypes = formatList(recommendation.recommendedTroopTypes);
  const first = recommended[0]!;
  if (recommendation.kind === 'full-positive') {
    return recommended.length === 1
      ? `Full affinity match: all 3 dragons receive the +20% positive-affinity benefit with ${troopTypes}.`
      : `Full affinity match: ${troopTypes} each give all 3 dragons positive affinity (+20% per dragon).`;
  }
  if (recommendation.kind === 'best-nonnegative-coverage') {
    const suffix = recommended.length === 1 ? describeNonpositive(first, namesById) : '';
    return `Best shared affinity: ${first.positiveCount} of 3 dragons receive +20% with ${troopTypes}${suffix}.`;
  }
  if (recommendation.kind === 'incomplete') {
    return `Known affinity coverage: ${first.positiveCount} of 3 dragons receive +20% with ${troopTypes}.`;
  }
  return `Affinity tradeoff: no troop type avoids a negative affinity. ${troopTypes} ${recommended.length === 1 ? 'has' : 'each have'} ${first.positiveCount} positive ${first.positiveCount === 1 ? 'match' : 'matches'} and ${first.negativeCount} negative ${first.negativeCount === 1 ? 'match' : 'matches'}.`;
}

function describeNonpositive(candidate: TroopAffinityCandidate, namesById: ReadonlyMap<string, string>): string {
  const details = [
    candidate.neutralDragonIds.length > 0
      ? `${formatList(candidate.neutralDragonIds.map((id) => namesById.get(id) ?? id))} ${candidate.neutralDragonIds.length === 1 ? 'is' : 'are'} neutral`
      : null,
    candidate.negativeDragonIds.length > 0
      ? `${formatList(candidate.negativeDragonIds.map((id) => namesById.get(id) ?? id))} ${candidate.negativeDragonIds.length === 1 ? 'has' : 'have'} negative affinity`
      : null,
    candidate.unknownDragonIds.length > 0
      ? `${formatList(candidate.unknownDragonIds.map((id) => namesById.get(id) ?? id))} ${candidate.unknownDragonIds.length === 1 ? 'is' : 'are'} not verified`
      : null,
  ].filter((detail): detail is string => detail !== null);
  return details.length > 0 ? `; ${details.join('; ')}` : '';
}

function formatList(values: readonly string[]): string {
  if (values.length < 2) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function kindLabel(kind: TroopAffinityRecommendationKind): string {
  if (kind === 'full-positive') return 'Full affinity match';
  if (kind === 'best-nonnegative-coverage') return 'Partial affinity match';
  if (kind === 'incomplete') return 'Incomplete affinity data';
  return 'Affinity tradeoff';
}
