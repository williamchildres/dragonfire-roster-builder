import type { Dragon } from '../models/dragon';
import type { FormationFindingSet } from '../services/formationFindings';
import { dragons } from '../data/dragons';
import type { FormationPlacementComparisonV3 } from '../services/formationPlacementComparisonV3';
import type { FormationRatingV3Result } from '../services/formationRatingV3';
import type { FormationRecommendationResult } from '../services/formationRecommendation';
import type { EstimatedFormationPower } from '../power/estimatedFormationPower';
import { ESTIMATED_POWER_MODEL_VERSION } from '../power/generatedDragonPowerModel';
import type {
  FormationRelationshipV3,
} from '../synergy/reliability';
import {
  candidateAbilityLabels,
  candidateAdjustedValue,
  conditionalUpliftSummary,
  mixedUseLabels,
  nonSharedRequirementLabels,
  relationshipClassLabel,
  reliabilityMethodLabels,
  reliabilityReasonLabels,
  semanticTagLabel,
  signalLabel,
} from './relationshipReliabilityPresentation';
import { TroopAffinityRecommendation } from './TroopAffinityRecommendation';

const canonicalDragonsById = new Map(dragons.map((dragon) => [dragon.id, dragon]));

export function SimpleFormationAnalysis({
  rating,
  estimatedPower,
  dragonNamesById,
  findings,
  recommendation,
  placementComparison,
  formationDragons,
}: {
  rating: FormationRatingV3Result;
  estimatedPower: EstimatedFormationPower | null;
  dragonNamesById: ReadonlyMap<string, string>;
  findings: FormationFindingSet;
  recommendation: FormationRecommendationResult;
  placementComparison: FormationPlacementComparisonV3 | null;
  formationDragons: readonly Dragon[];
}) {
  const placementStatus = placementStatusLabel(placementComparison);

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
          Formation Rating weights mapped relationships by documented activation reliability.
          Unquantified potential remains visible but is not added to the score. Reliability is
          not damage, Recovery magnitude, duration, target count, or battle-win probability.
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

      <TroopAffinityRecommendation formationDragons={formationDragons} />

      {rating.confidence.status === 'limited' ? (
        <div className="formation-confidence-warning" role="status">
          <strong>Analysis incomplete</strong>
          {rating.confidence.issues.map((issue) => <p key={issue}>{issue}</p>)}
        </div>
      ) : (
        <>
          <dl className="formation-analysis-metrics" aria-label="Formation analysis summary">
            <Metric
              label="Evidence-backed relationships"
              value={`${rating.activeRelationshipCount} (${rating.quantifiedRelationshipCount} quantified)`}
            />
            <Metric
              label="Unquantified potential"
              value={formatValue(rating.unquantifiedBasePotential)}
            />
            <Metric label="Reliability coverage" value={coverageLabel(rating.reliabilityCoverage)} />
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
            {rating.relationships.length === 0 ? (
              <p className="empty-card-note">No mapped relationship is active.</p>
            ) : rating.relationships.map((relationship) => (
              <ReliabilityRelationship
                key={relationship.id}
                relationship={relationship}
                dragonNamesById={dragonNamesById}
              />
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
        Supported exact opportunities use cumulative probability only when independence is
        confirmed. Formation Rating is unofficial and explainable, not a combat simulator or
        a guarantee of the best possible formation.
      </p>
    </section>
  );
}

function ReliabilityRelationship({
  relationship,
  dragonNamesById,
}: {
  relationship: FormationRelationshipV3;
  dragonNamesById: ReadonlyMap<string, string>;
}) {
  const quantified = relationship.quantification.status === 'quantified';
  const selectedTrace = relationship.candidateTraces.find(
    (trace) => trace.candidate.id === relationship.selectedCandidateId,
  );
  const simultaneousUses = [
    ...(selectedTrace
      ? mixedUseLabels(selectedTrace.provider, canonicalDragonsById)
      : []),
    ...(selectedTrace
      ? mixedUseLabels(selectedTrace.beneficiary, canonicalDragonsById)
      : []),
  ];
  const nonSharedRequirements = selectedTrace
    ? nonSharedRequirementLabels(selectedTrace, canonicalDragonsById)
    : [];
  const upliftSummary = conditionalUpliftSummary(relationship, canonicalDragonsById);
  return (
    <article className="formation-relationship-item">
      <div className="formation-relationship-heading">
        <strong>{semanticTagLabel(relationship)}</strong>
        <span>{relationshipClassLabel(relationship)}</span>
        <span>{quantified ? 'Quantified' : 'Unquantified'}</span>
        <span>{formatValue(relationship.adjustedMarginalValue)} contribution</span>
      </div>
      <p>
        {dragonNamesById.get(relationship.providerDragonId) ??
          relationship.providerDragonId}{' '}
        →{' '}
        {dragonNamesById.get(relationship.beneficiaryDragonId) ??
          relationship.beneficiaryDragonId}
      </p>
      {upliftSummary ? <p>{upliftSummary}</p> : null}
      <details>
        <summary>Reliability evidence</summary>
        <dl className="formation-analysis-metrics">
          <Metric label="Base value" value={formatValue(relationship.baseValue)} />
          <Metric
            label={quantified ? 'Activation reliability' : 'Base potential'}
            value={
              relationship.quantification.status === 'quantified'
                ? `${Math.round(relationship.quantification.reliability * 10_000) / 100}%`
                : formatValue(relationship.unquantifiedBasePotential)
            }
          />
          <Metric
            label="Adjusted base"
            value={formatValue(relationship.adjustedBaseValue)}
          />
          <Metric label="Redundancy rank" value={String(relationship.redundancyRank)} />
        </dl>
        {relationship.quantification.status === 'quantified' ? (
          <p>
            Method: {reliabilityMethodLabels[relationship.quantification.method]}.{' '}
            {relationship.quantification.explanation}
          </p>
        ) : (
          <>
            <p>
              Numeric contribution: 0. Unconditional reliability is unresolved:{' '}
              {reliabilityReasonLabels[relationship.quantification.reason]}.
            </p>
            {relationship.quantification.conditionalProbabilities?.length ? (
              <p>
                Conditional per-opportunity probability:{' '}
                {relationship.quantification.conditionalProbabilities
                  .map((value) => `${Math.round(value * 10_000) / 100}%`)
                  .join(', ')}
              </p>
            ) : null}
            <p>{relationship.quantification.explanation}</p>
          </>
        )}
        {selectedTrace ? (
          <p>
            Selected signals:{' '}
            {signalLabel(selectedTrace, 'provider', canonicalDragonsById)}
            {' → '}
            {signalLabel(selectedTrace, 'beneficiary', canonicalDragonsById)}.
          </p>
        ) : null}
        {simultaneousUses.length > 0 ? (
          <>
            <p>Simultaneous uses:</p>
            <ul>
              {simultaneousUses.map((use, index) => (
                <li key={`${use.label}:${index}`}>
                  {use.label}{use.selected ? ' — supplied the supported lower bound' : ''}
                </li>
              ))}
            </ul>
            <p>
              One relationship base value is used. Use probabilities are not added or averaged.
            </p>
          </>
        ) : null}
        {(selectedTrace?.sharedRequirementIds.length ?? 0) > 0 ? (
          <p>
            Shared activation counted once; distinct provider and beneficiary requirements
            remain required
            {nonSharedRequirements.length > 0
              ? ` (${nonSharedRequirements.join(', ')})`
              : ''}.
          </p>
        ) : null}
        <p>
          Candidate selection: {selectedTrace?.selectionReason ?? 'Only supported candidate.'}
        </p>
        <details>
          <summary>Retained alternatives ({relationship.candidateTraces.length})</summary>
          <ol className="formation-retained-alternatives">
            {relationship.candidateTraces.map((trace) => {
              const selected = trace.candidate.id === relationship.selectedCandidateId;
              return (
                <li key={trace.candidate.id}>
                  <strong>
                    {candidateAbilityLabels(
                      trace,
                      'provider',
                      canonicalDragonsById,
                    ).join(' + ')}
                    {' → '}
                    {candidateAbilityLabels(
                      trace,
                      'beneficiary',
                      canonicalDragonsById,
                    ).join(' + ')}
                  </strong>
                  {' · '}
                  {trace.candidate.resultKind === 'setup-payoff'
                    ? 'Setup payoff'
                    : 'Amplifier output'}
                  {' · '}
                  {trace.quantification.status === 'quantified'
                    ? `${Math.round(trace.quantification.reliability * 10_000) / 100}% · ${reliabilityMethodLabels[trace.quantification.method]}`
                    : `Unquantified · ${reliabilityReasonLabels[trace.quantification.reason]}`}
                  {' · adjusted value '}
                  {formatValue(candidateAdjustedValue(relationship, trace))}
                  {' · '}
                  {selected ? 'Selected' : 'Not selected'}. {trace.selectionReason}
                </li>
              );
            })}
          </ol>
        </details>
        <details>
          <summary>Technical trace</summary>
          <p>
            Components: {relationship.componentIds.join(', ') || 'none'}. Events:{' '}
            {relationship.eventIds.join(', ') || 'none'}.
          </p>
          <p>
            Selected signals: {relationship.selectedProviderSignalId} →{' '}
            {relationship.selectedBeneficiarySignalId}. Candidate:{' '}
            {relationship.selectedCandidateId}. Probability variants:{' '}
            {relationship.probabilityVariantIds.join(', ') || 'none'}.
          </p>
          {relationship.candidateTraces.map((trace) => (
            <p key={trace.candidate.id}>
              Candidate {trace.candidate.id}. Provider signal {trace.provider.signalId};
              beneficiary signal {trace.beneficiary.signalId}. Components{' '}
              {trace.componentIds.join(', ') || 'none'}; events{' '}
              {trace.eventIds.join(', ') || 'none'}; variants{' '}
              {trace.probabilityVariantIds.join(', ') || 'none'}; uses{' '}
              {[...trace.provider.useIds, ...trace.beneficiary.useIds].join(', ') || 'none'};
              paths {[...trace.provider.pathIds, ...trace.beneficiary.pathIds].join(', ') || 'none'}.
            </p>
          ))}
        </details>
      </details>
    </article>
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

function placementStatusLabel(comparison: FormationPlacementComparisonV3 | null): string {
  if (!comparison) return 'Unavailable';
  if (comparison.status === 'better-available') return 'Better arrangement available';
  if (comparison.status === 'tied-best') return 'Tied best';
  if (comparison.status === 'no-meaningful-gain') return 'No meaningful gain';
  return 'Best';
}

function ratingAriaLabel(rating: FormationRatingV3Result): string {
  return rating.score === null
    ? 'Formation rating unavailable, Incomplete'
    : `Formation rating ${rating.score} out of 100, ${rating.tier}`;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function coverageLabel(coverage: FormationRatingV3Result['reliabilityCoverage']): string {
  if (coverage === 'all-quantified') return 'All quantified';
  if (coverage === 'partially-quantified') return 'Partially quantified';
  return 'No quantified relationships';
}


function formatPower(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function confidenceLabel(confidence: 'observed' | 'modeled' | 'low'): string {
  return confidence === 'observed' ? 'Observed' : confidence === 'modeled' ? 'Modeled' : 'Low';
}
