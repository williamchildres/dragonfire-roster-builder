import type { FormationFindingSet } from '../services/formationFindings';
import type { FormationPlacementComparison } from '../services/formationPlacementComparison';
import type { FormationRatingResult } from '../services/formationRating';
import type { FormationRecommendationResult } from '../services/formationRecommendation';
import type { EstimatedFormationPower } from '../power/estimatedFormationPower';
import { ESTIMATED_POWER_MODEL_VERSION } from '../power/generatedDragonPowerModel';
import type { SemanticRelationship } from '../synergy/semanticRelationships';

export function SimpleFormationAnalysis({
  rating,
  estimatedPower,
  dragonNamesById,
  relationships,
  findings,
  recommendation,
  placementComparison,
}: {
  rating: FormationRatingResult;
  estimatedPower: EstimatedFormationPower | null;
  dragonNamesById: ReadonlyMap<string, string>;
  relationships: SemanticRelationship[];
  findings: FormationFindingSet;
  recommendation: FormationRecommendationResult;
  placementComparison: FormationPlacementComparison | null;
}) {
  const placementStatus = placementStatusLabel(placementComparison);
  const primaryRelationshipIds = new Set(
    findings.keyStrengths.flatMap((finding) => finding.semanticRelationshipId ?? []),
  );

  return (
    <section className="panel simple-formation-analysis" aria-labelledby="formation-analysis-title">
      <div className="formation-analysis-header">
        <div className="formation-rating-summary-score" aria-label={ratingAriaLabel(rating)}>
          <span className="formation-rating-value">{rating.score ?? '—'}</span>
          <span className="formation-rating-max">/ 100</span>
          <span className="formation-rating-tier">{rating.tier}</span>
        </div>
        <div className="formation-analysis-heading">
          <p className="eyebrow">Canonical relationship score</p>
          <h3 id="formation-analysis-title">Formation Rating</h3>
          <p>{rating.summary}</p>
        </div>
      </div>

      {rating.score !== null ? (
        <p className="formation-rating-limitations" role="note" aria-label="Formation Rating limitations">
          Formation Rating measures ability compatibility and placement. It does not currently weight relationships by activation chance, number of rolls, duration, target count, or exact effect magnitude.
        </p>
      ) : null}

      <section className="formation-power-diagnostic" aria-labelledby="estimated-formation-power-title">
        <div>
          <p className="eyebrow">Separate progression diagnostic</p>
          <h4 id="estimated-formation-power-title">Estimated Formation Power</h4>
          {estimatedPower ? (
            <p className="formation-power-total">
              <strong>{formatPower(estimatedPower.totalPower)}</strong>
              <span>{confidenceLabel(estimatedPower.confidence)} confidence</span>
            </p>
          ) : (
            <p className="empty-card-note">Record Star Rank and Dragon Level for all three dragons to estimate formation power.</p>
          )}
        </div>
        {estimatedPower ? (
          <dl className="formation-power-dragons" aria-label="Estimated Power by dragon">
            {Object.entries(estimatedPower.dragonPower).map(([dragonId, estimate]) => (
              <div key={dragonId}>
                <dt>{dragonNamesById.get(dragonId) ?? dragonId}</dt>
                <dd>{formatPower(estimate.power)} · {confidenceLabel(estimate.confidence)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="formation-power-methodology">
          Estimated from rarity, Star Rank, and Dragon Level using empirical Estimated Power {ESTIMATED_POWER_MODEL_VERSION.replace('estimated-power-', '')}. This is an unofficial diagnostic, not the game&apos;s formula, and it does not simulate combat.
          {estimatedPower ? ` Model: ${estimatedPower.modelVersion}.` : ''}
        </p>
      </section>

      {rating.confidence.status === 'limited' ? (
        <div className="formation-confidence-warning" role="status">
          <strong>Analysis incomplete</strong>
          {rating.confidence.issues.map((issue) => <p key={issue}>{issue}</p>)}
        </div>
      ) : (
        <>
          <dl className="formation-analysis-metrics" aria-label="Formation analysis summary">
            <Metric label="Active relationships" value={String(rating.activeRelationshipCount)} />
            <Metric label="Participating dragons" value={`${rating.participatingDragonCount} / 3`} />
            <Metric label="Key gaps" value={String(findings.keyGaps.length)} />
            <Metric label="Placement status" value={placementStatus} />
          </dl>

          <section className="formation-next-move" aria-labelledby="formation-next-move-title">
            <p className="eyebrow" id="formation-next-move-title">Best next move</p>
            <p>{recommendation.netSummary}</p>
          </section>
        </>
      )}

      <div className="formation-analysis-highlights">
        <FindingList
          title="Key strengths"
          findings={findings.keyStrengths}
          fallback="No positive mapped relationship is active yet."
        />
        <FindingList
          title="Key gaps"
          findings={findings.keyGaps}
          fallback="No primary diagnostic gap is mapped."
        />
      </div>

      {rating.confidence.status === 'complete' ? (
        <section className="formation-score-breakdown" aria-labelledby="formation-score-breakdown-title">
          <h4 id="formation-score-breakdown-title">Score breakdown</h4>
          <div className="formation-rating-breakdown" aria-label="Formation rating breakdown">
            {rating.breakdown.map((item) => (
              <div className="formation-rating-breakdown-row" key={item.label}>
                <div className="formation-rating-breakdown-copy">
                  <span>{item.label}</span>
                  <small>{item.explanation}</small>
                </div>
                <strong>{item.score} / {item.max}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="formation-analysis-details">
        <details>
          <summary>Relationship details</summary>
          <div className="formation-relationship-trace">
            {relationships.length === 0 ? (
              <p className="empty-card-note">No active canonical relationship is mapped.</p>
            ) : relationships.map((relationship) => (
              <article className="formation-relationship-item" key={relationship.id}>
                <div className="formation-relationship-heading">
                  <strong>{relationship.semanticTag}</strong>
                  <span>{relationship.relationshipClass}</span>
                  <span>{formatValue(relationship.marginalValue)} value</span>
                </div>
                {!primaryRelationshipIds.has(relationship.id) ? <p>{relationship.summary}</p> : null}
                <small>
                  Evidence: {relationship.abilityIds.join(', ')}. Redundancy rank {relationship.redundancyRank}.
                </small>
                {relationship.evidenceDetails.map((detail) => <small key={detail}>{detail}</small>)}
              </article>
            ))}
          </div>
        </details>

        <details>
          <summary>Neutral and future information</summary>
          {findings.neutralDetails.length > 0 ? (
            <ul className="plain-list formation-neutral-findings">
              {findings.neutralDetails.map((finding) => (
                <li key={finding.id}>
                  <span>{finding.summary}</span>
                  {finding.detail ? <small>{finding.detail}</small> : null}
                </li>
              ))}
            </ul>
          ) : <p className="empty-card-note">No additional neutral or future information.</p>}
        </details>
      </div>

      <p className="formation-rating-note">
        Active Synergy is scored once through canonical provider-to-beneficiary relationships. Kit gaps are diagnostic; this is not a combat simulation.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function FindingList({
  title,
  findings,
  fallback,
}: {
  title: string;
  findings: FormationFindingSet['keyStrengths'];
  fallback: string;
}) {
  return (
    <section aria-labelledby={`formation-${title.toLowerCase().replaceAll(' ', '-')}`}>
      <h4 id={`formation-${title.toLowerCase().replaceAll(' ', '-')}`}>{title}</h4>
      {findings.length > 0 ? (
        <ul className="plain-list">
          {findings.map((finding) => <li key={finding.id}>{finding.summary}</li>)}
        </ul>
      ) : <p className="empty-card-note">{fallback}</p>}
    </section>
  );
}

function placementStatusLabel(comparison: FormationPlacementComparison | null): string {
  if (!comparison) return 'Unavailable';
  if (comparison.status === 'better-available') return 'Better arrangement available';
  if (comparison.status === 'tied-best') return 'Tied best';
  if (comparison.status === 'no-meaningful-gain') return 'No meaningful gain';
  return 'Best';
}

function ratingAriaLabel(rating: FormationRatingResult): string {
  return rating.score === null
    ? 'Formation rating unavailable, Incomplete'
    : `Formation rating ${rating.score} out of 100, ${rating.tier}`;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPower(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function confidenceLabel(confidence: 'observed' | 'modeled' | 'low'): string {
  return confidence === 'observed' ? 'Observed' : confidence === 'modeled' ? 'Modeled' : 'Low';
}
