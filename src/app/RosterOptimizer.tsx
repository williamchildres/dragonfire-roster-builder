import { ChevronRight, CircleCheck, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dragon, DragonRarity, OwnedDragon } from '../models/dragon';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerRequestFingerprint,
} from '../optimizer/rosterOptimizerCandidates';
import {
  clampOptimizerFormationCount,
  maximumOptimizerFormationCount,
} from '../optimizer/rosterOptimizerCount';
import {
  RosterOptimizerClient,
  type RosterOptimizerRunner,
} from '../optimizer/rosterOptimizerClient';
import {
  RosterOptimizerCancelledError,
  type FlexiblePowerAwareOptimizationResult,
  type OptimizerAllocationMode,
  type OptimizerRosterDragon,
  type OptimizerRunProgress,
  type PowerAwareOptimizedFormation,
  type TierDistribution,
} from '../optimizer/rosterOptimizerTypes';
import type { FormationArrangement } from '../services/formationArrangement';
import type { FormationRelationshipV3 } from '../synergy/reliability';
import { AppLink, type NavigateToRoute } from './appRouter';
import {
  candidateAbilityLabels,
  candidateAdjustedValue,
  mixedUseLabels,
  nonSharedRequirementLabels,
  relationshipClassLabel,
  reliabilityMethodLabels,
  reliabilityReasonLabels,
  semanticTagLabel,
  signalLabel,
} from './relationshipReliabilityPresentation';

export const DEFAULT_OPTIMIZER_ALLOCATION_MODE: OptimizerAllocationMode = 'best-overall-first';
/** @deprecated v0.21 compatibility alias; the UI no longer exposes strategies. */
export const DEFAULT_ROSTER_OPTIMIZER_STRATEGY = DEFAULT_OPTIMIZER_ALLOCATION_MODE;

export function RosterOptimizer({
  allDragons,
  roster,
  allocationMode,
  onAllocationModeChange,
  formationCount,
  onFormationCountChange,
  result,
  onResultChange,
  runner: suppliedRunner,
  onOpenFormation,
  onOpenRoster,
  onNavigate,
}: {
  allDragons: Dragon[];
  roster: Record<string, OwnedDragon>;
  allocationMode: OptimizerAllocationMode;
  onAllocationModeChange: (mode: OptimizerAllocationMode) => void;
  formationCount: number;
  onFormationCountChange: (count: number) => void;
  result: FlexiblePowerAwareOptimizationResult | null;
  onResultChange: (result: FlexiblePowerAwareOptimizationResult) => void;
  runner?: RosterOptimizerRunner;
  onOpenFormation: (arrangement: FormationArrangement) => void;
  onOpenRoster: () => void;
  onNavigate?: NavigateToRoute;
}) {
  const [ownedRunner] = useState<RosterOptimizerRunner | null>(() =>
    suppliedRunner ? null : new RosterOptimizerClient(),
  );
  const runner = suppliedRunner ?? ownedRunner!;
  const snapshot = useMemo(
    () => buildOptimizerRosterSnapshot(allDragons, roster),
    [allDragons, roster],
  );
  const maximumCount = maximumOptimizerFormationCount(snapshot.length);
  const effectiveCount = clampOptimizerFormationCount(formationCount, snapshot.length);
  const requestFingerprint = useMemo(
    () => createRosterOptimizerRequestFingerprint(
      snapshot,
      allocationMode,
      effectiveCount,
    ),
    [allocationMode, effectiveCount, snapshot],
  );
  const latestRequestFingerprint = useRef(requestFingerprint);
  const activeRunId = useRef(0);
  const isMounted = useRef(true);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState<OptimizerRunProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countNotice, setCountNotice] = useState<string | null>(null);
  const isStale = Boolean(result && result.requestFingerprint !== requestFingerprint);
  const eligibleCounts = rarityCounts(snapshot.map((dragon) => dragon.rarity));

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      activeRunId.current += 1;
      runner.cancel();
      if (!suppliedRunner) ownedRunner?.dispose();
    };
  }, [ownedRunner, runner, suppliedRunner]);

  useEffect(() => {
    latestRequestFingerprint.current = requestFingerprint;
  }, [requestFingerprint]);

  useEffect(() => {
    if (formationCount === effectiveCount) return;
    onFormationCountChange(effectiveCount);
    if (effectiveCount > 0) queueMicrotask(() => {
      if (!isMounted.current) return;
      setCountNotice(
        `Your eligible roster now supports ${effectiveCount} ${armyWord(effectiveCount)}. The selected count was adjusted to ${effectiveCount}.`,
      );
    });
  }, [effectiveCount, formationCount, onFormationCountChange]);

  const run = async () => {
    if (effectiveCount < 1) return;
    const activeFingerprint = requestFingerprint;
    const runId = activeRunId.current + 1;
    activeRunId.current = runId;
    setStatus('running');
    setProgress({
      stage: 'candidate-generation',
      allocationMode,
      formationCount: effectiveCount,
    });
    setError(null);
    try {
      const response = await runner.run(
        roster,
        allocationMode,
        effectiveCount,
        setProgress,
      );
      if (
        !isMounted.current ||
        activeRunId.current !== runId ||
        latestRequestFingerprint.current !== activeFingerprint ||
        response.requestFingerprint !== activeFingerprint
      ) {
        setStatus('idle');
        return;
      }
      if (!response.optimal) {
        setStatus('idle');
        return;
      }
      if (!('allocationMode' in response) || response.contractVersion !== 6) {
        throw new Error('The optimizer response contract is stale. Refresh and try again.');
      }
      onResultChange(response);
      setStatus('success');
    } catch (runError) {
      if (!isMounted.current || activeRunId.current !== runId) return;
      if (runError instanceof RosterOptimizerCancelledError) {
        setStatus('idle');
        return;
      }
      setError(runError instanceof Error ? runError.message : 'Roster optimization failed.');
      setStatus('error');
    }
  };

  const cancel = () => {
    activeRunId.current += 1;
    runner.cancel();
    setStatus('idle');
    setProgress(null);
  };

  const changeMode = (mode: OptimizerAllocationMode) => {
    setCountNotice(null);
    onAllocationModeChange(mode);
  };

  const changeCount = (count: number) => {
    setCountNotice(null);
    onFormationCountChange(count);
  };

  return (
    <section className="optimizer-workspace" aria-labelledby="optimizer-title">
      <header className="optimizer-header">
        <p className="eyebrow">Flexible Power-Aware allocation</p>
        <h2 id="optimizer-title" tabIndex={-1}>Roster Optimizer</h2>
        <p>Build 1–11 exact, non-overlapping armies using current progression, Estimated Power v2, and Formation Rating v3.</p>
      </header>

      <div className="optimizer-roster-summary" aria-label="Eligible roster summary">
        <Metric label="Eligible dragons" value={snapshot.length} />
        <Metric label="Available armies" value={maximumCount} />
        <Metric label="Legendary" value={eligibleCounts.Legendary} />
        <Metric label="Epic" value={eligibleCounts.Epic} />
        <Metric label="Rare" value={eligibleCounts.Rare} />
      </div>
      <p className="optimizer-policy-note">
        Recommendations use owned dragons, current Star Ranks, Dragon Levels, and active Habit Levels.{' '}
        <AppLink route="about" navigate={onNavigate}>How recommendations are built</AppLink>
      </p>

      <div className="optimizer-count-control">
        <label htmlFor="optimizer-formation-count"><strong>Number of armies</strong></label>
        <select
          id="optimizer-formation-count"
          value={effectiveCount || ''}
          disabled={status === 'running' || maximumCount < 1}
          onChange={(event) => changeCount(Number(event.target.value))}
        >
          {Array.from({ length: maximumCount }, (_unused, index) => index + 1).map((count) => (
            <option key={count} value={count}>{count}</option>
          ))}
        </select>
        {effectiveCount > 0 ? (
          <p>{effectiveCount} {armyWord(effectiveCount)} use {effectiveCount * 3} of your {snapshot.length} eligible dragons.</p>
        ) : null}
      </div>

      <fieldset className="optimizer-strategy" disabled={status === 'running'}>
        <legend>Allocation mode</legend>
        <ModeOption
          mode="best-overall-first"
          selected={allocationMode === 'best-overall-first'}
          label="Best Overall First"
          description="Combines current progression power with Formation Rating, then assigns the remaining dragons to each following army."
          support="Overall Score uses 60% relative progression power and 40% Formation Rating."
          onSelect={changeMode}
        />
        <ModeOption
          mode="strongest-first"
          selected={allocationMode === 'strongest-first'}
          label="Highest Raw Power First"
          description="Groups the highest standalone Estimated Power dragons first. Formation Rating only resolves exact power ties."
          onSelect={changeMode}
        />
        <ModeOption
          mode="balanced"
          selected={allocationMode === 'balanced'}
          label="Balance Raw Power Across Armies"
          description="Distributes standalone Estimated Power across all selected armies, strengthening the weakest raw-power army first."
          onSelect={changeMode}
        />
      </fieldset>

      {snapshot.length < 3 ? (
        <div className="optimizer-unavailable" role="status">
          <p>You need {3 - snapshot.length} more eligible {dragonWord(3 - snapshot.length)} to build one complete army.</p>
          <button type="button" className="secondary-button" onClick={onOpenRoster}>
            Go to My Roster <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="optimizer-actions">
          <button
            type="button"
            className="primary-button"
            disabled={status === 'running'}
            onClick={() => void run()}
          >
            <Sparkles size={18} aria-hidden="true" />
            Build {effectiveCount} {armyWord(effectiveCount)}
          </button>
          {status === 'running' ? (
            <button type="button" className="secondary-button" onClick={cancel}>
              <X size={17} aria-hidden="true" /> Cancel
            </button>
          ) : null}
        </div>
      )}

      {countNotice ? <div className="optimizer-stale" role="status">{countNotice}</div> : null}
      {status === 'running' ? (
        <div className="optimizer-running" role="status">
          <span className="optimizer-spinner" aria-hidden="true" />
          <div>
            <strong>
              {progress?.stage === 'exact-solving'
                ? 'Proving the exact allocation…'
                : 'Generating every eligible trio…'}
            </strong>
            <p>
              {effectiveCount} {armyWord(effectiveCount)} · {modeLabel(allocationMode)}. Only a fully proven exact result is returned.
            </p>
          </div>
        </div>
      ) : null}
      <div className="sr-only" role="status" aria-live="polite">
        {status === 'success' ? 'Exact roster allocation ready.' : null}
        {status === 'error' ? error : null}
      </div>
      {error ? <div className="status-message error" role="alert">{error}</div> : null}
      {isStale ? (
        <div className="optimizer-stale" role="status">
          Your roster progression, army count, or allocation mode changed. Run the optimizer again to refresh this result.
        </div>
      ) : null}
      {result ? (
        <OptimizerResultView
          result={result}
          allDragons={allDragons}
          snapshot={snapshot}
          stale={isStale}
          onOpenFormation={onOpenFormation}
        />
      ) : null}
      <Methodology mode={allocationMode} />
    </section>
  );
}

function ModeOption({
  mode,
  selected,
  label,
  description,
  support,
  onSelect,
}: {
  mode: OptimizerAllocationMode;
  selected: boolean;
  label: string;
  description: string;
  support?: string;
  onSelect: (mode: OptimizerAllocationMode) => void;
}) {
  return (
    <label className={selected ? 'is-selected' : undefined}>
      <input
        type="radio"
        name="optimizer-allocation-mode"
        value={mode}
        checked={selected}
        onChange={() => onSelect(mode)}
      />
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
        {support ? <em>{support}</em> : null}
      </span>
    </label>
  );
}

function OptimizerResultView({
  result,
  allDragons,
  snapshot,
  stale,
  onOpenFormation,
}: {
  result: FlexiblePowerAwareOptimizationResult;
  allDragons: Dragon[];
  snapshot: OptimizerRosterDragon[];
  stale: boolean;
  onOpenFormation: (arrangement: FormationArrangement) => void;
}) {
  const dragonsById = new Map(allDragons.map((dragon) => [dragon.id, dragon]));
  const progressionById = new Map(snapshot.map((dragon) => [dragon.dragonId, dragon]));
  const collection = result.collection;
  return (
    <div className={stale ? 'optimizer-result is-stale' : 'optimizer-result'}>
      <header className="optimizer-result-header">
        <div>
          <p className="eyebrow">{modeLabel(result.allocationMode)}</p>
          <h3>Exact optimal result</h3>
        </div>
        <span className="optimizer-optimal-badge"><CircleCheck size={17} aria-hidden="true" /> Proven exact</span>
      </header>
      <div className="optimizer-result-metrics">
        <Metric label="Armies" value={result.generatedFormationCount} />
        <Metric label="Strongest power" value={collection.maximumFormationEstimatedPower.toLocaleString()} />
        <Metric label="Weakest power" value={collection.minimumFormationEstimatedPower.toLocaleString()} />
        <Metric label="Average power" value={Math.round(collection.averageEstimatedPower).toLocaleString()} />
        <Metric label="Power spread" value={collection.estimatedPowerSpread.toLocaleString()} />
        <Metric label="Total power" value={collection.totalEstimatedPower.toLocaleString()} />
        <Metric label="Average Formation Rating" value={collection.averageRating.toFixed(1)} />
        <Metric label="Minimum Formation Rating" value={collection.minimumRating} />
      </div>
      <p className="optimizer-allocation-note">
        {result.allocationMode === 'best-overall-first'
          ? 'Army 1 has the highest Best Overall score from the full roster. Each later army is rescored after earlier armies claim their dragons.'
          : result.allocationMode === 'strongest-first'
            ? 'Later armies are selected by raw Estimated Power only after every earlier army has claimed its three dragons.'
            : 'The solver prioritized the weakest raw-power army first, then the next weakest, before applying Formation Rating and relationship tie-breaks.'}
      </p>
      <p className="optimizer-tier-summary"><strong>Rating tiers:</strong> {tierSummary(collection.tierDistribution)}</p>
      <div className="optimizer-formation-grid">
        {result.formations.map((formation) => (
          <OptimizerFormationCard
            key={formation.stableCandidateKey}
            formation={formation}
            dragonsById={dragonsById}
            disabled={stale}
            onOpen={() => onOpenFormation(formation.arrangement)}
          />
        ))}
      </div>
      <UnusedDragons
        result={result}
        dragonsById={dragonsById}
        progressionById={progressionById}
      />
      <TechnicalDetails result={result} />
    </div>
  );
}

function OptimizerFormationCard({
  formation,
  dragonsById,
  disabled,
  onOpen,
}: {
  formation: PowerAwareOptimizedFormation;
  dragonsById: Map<string, Dragon>;
  disabled: boolean;
  onOpen: () => void;
}) {
  const headingId = `optimizer-army-${formation.rank}`;
  return (
    <article className="optimizer-formation-card" aria-labelledby={headingId}>
      <header>
        <div>
          <p className="eyebrow">Army {formation.rank}</p>
          <h4 id={headingId}>{formation.rating} · {formation.tier}</h4>
        </div>
        <div className="optimizer-score-pills" aria-label="Formation score breakdown">
          <span>Synergy {formation.activeSynergyScore}/80</span>
          <span>Placement {formation.placementScore}/20</span>
        </div>
      </header>
      <div className="optimizer-formation-power">
        <span>Estimated Formation Power</span>
        <strong>{formation.estimatedPower.toLocaleString()}</strong>
        <small>
          Confidence: {powerConfidenceSummary(formation)} · Formation Rating v3 {formation.rating}
        </small>
      </div>
      {formation.bestOverallScore ? (
        <BestOverallScoreDetails score={formation.bestOverallScore} />
      ) : null}
      <dl className="optimizer-positions">
        {(['left-flank', 'vanguard', 'right-flank'] as const).map((position) => {
          const dragon = dragonsById.get(formation.arrangement[position]);
          return (
            <div key={position}>
              <dt>{position === 'left-flank' ? 'Left Flank' : position === 'right-flank' ? 'Right Flank' : 'Vanguard'}</dt>
              <dd><strong>{dragon?.name ?? formation.arrangement[position]}</strong><span>{dragon?.rarity}</span></dd>
            </div>
          );
        })}
      </dl>
      <p className="optimizer-relationship-count">
        Reliability coverage: {formation.reliabilityCoverage.replaceAll('-', ' ')} ·{' '}
        {formation.activeRelationshipCount} active · {formation.quantifiedRelationshipCount} quantified
        {formation.unquantifiedRelationshipCount > 0
          ? ` · ${formation.unquantifiedRelationshipCount} unquantified`
          : ''}
      </p>
      {formation.strengths[0] ? <p className="optimizer-strength"><strong>Key strength:</strong> {formation.strengths[0].summary}</p> : null}
      {formation.gaps.length > 0 ? (
        <ul className="optimizer-gaps" aria-label="Important gaps">
          {formation.gaps.slice(0, 2).map((gap) => <li key={gap.id}>{gap.summary}</li>)}
        </ul>
      ) : null}
      {formation.tiedBestArrangements.length > 1 ? (
        <p className="optimizer-tie-note">{formation.tiedBestArrangements.length} placements tie for best; the deterministic first is shown.</p>
      ) : null}
      <details>
        <summary>Relationship details</summary>
        <ul>
          {formation.relationships.map((relationship) => (
            <li key={relationship.id}>
              <OptimizerRelationshipDetail
                relationship={relationship}
                dragonsById={dragonsById}
              />
            </li>
          ))}
        </ul>
      </details>
      <button type="button" className="secondary-button" disabled={disabled} onClick={onOpen}>
        Open in Formation Builder <ChevronRight size={16} aria-hidden="true" />
      </button>
    </article>
  );
}

function BestOverallScoreDetails({
  score,
}: {
  score: NonNullable<PowerAwareOptimizedFormation['bestOverallScore']>;
}) {
  return (
    <details className="optimizer-overall-score">
      <summary>Overall Score {score.overallScore.toFixed(1)}</summary>
      <p>An explainable planning index, not combat power or predicted damage.</p>
      <dl>
        <div>
          <dt>Power contribution</dt>
          <dd>
            Relative power: {(score.powerIndexBasisPoints / 100).toFixed(1)} / 100
            {' · '}Weight: {score.powerWeight}%
          </dd>
        </div>
        <div>
          <dt>Formation contribution</dt>
          <dd>
            Formation Rating: {score.ratingIndexBasisPoints / 100} / 100
            {' · '}Weight: {score.formationRatingWeight}%
          </dd>
        </div>
      </dl>
    </details>
  );
}

function UnusedDragons({
  result,
  dragonsById,
  progressionById,
}: {
  result: FlexiblePowerAwareOptimizationResult;
  dragonsById: Map<string, Dragon>;
  progressionById: Map<string, OptimizerRosterDragon>;
}) {
  if (result.unusedDragonIds.length === 0) return null;
  return (
    <div className="optimizer-unused">
      <h4>Unused eligible {result.unusedDragonIds.length === 1 ? 'dragon' : 'dragons'}</h4>
      <p>Not used in this exact {modeLabel(result.allocationMode)} allocation.</p>
      <ul>
        {result.unusedDragonIds.map((dragonId) => {
          const dragon = dragonsById.get(dragonId);
          const progression = progressionById.get(dragonId);
          return (
            <li key={dragonId}>
              <strong>{dragon?.name ?? dragonId}</strong> · {dragon?.rarity ?? 'Unknown rarity'} · Star {progression?.starRank ?? '—'} · Level {progression?.dragonLevel ?? '—'}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TechnicalDetails({ result }: { result: FlexiblePowerAwareOptimizationResult }) {
  const profile = result.diagnostics.performanceProfile;
  return (
    <details className="optimizer-technical">
      <summary>Technical trace</summary>
      <dl>
        <div><dt>Contract</dt><dd>v{result.contractVersion}</dd></div>
        <div><dt>Allocation mode</dt><dd>{result.allocationMode}</dd></div>
        <div><dt>Requested / generated</dt><dd>{result.requestedFormationCount} / {result.generatedFormationCount}</dd></div>
        <div>
          <dt>Exactness</dt>
          <dd>
            {result.allocationMode === 'balanced'
              ? 'Optimal · zero MIP gap'
              : 'Exact deterministic sequential scan'}
          </dd>
        </div>
        <div><dt>Candidates</dt><dd>{result.diagnostics.candidateCount.toLocaleString()}</dd></div>
        <div><dt>Solver passes</dt><dd>{result.diagnostics.solverPasses ?? 0}</dd></div>
        <div><dt>Exact-search nodes</dt><dd>{result.diagnostics.nodesVisited.toLocaleString()}</dd></div>
        <div><dt>Model builds</dt><dd>{profile?.modelBuilds ?? 0}</dd></div>
        <div><dt>Variables</dt><dd>{maximumPhaseValue(profile, 'variableCount').toLocaleString()}</dd></div>
        <div><dt>Constraints</dt><dd>{maximumPhaseValue(profile, 'constraintCount').toLocaleString()}</dd></div>
        <div><dt>Skipped phases</dt><dd>{profile?.skippedPhases ?? 0}</dd></div>
        <div><dt>Certification passes</dt><dd>{profile?.certificationPasses ?? 0}</dd></div>
        <div><dt>Candidate generation</dt><dd>{formatMs(result.diagnostics.candidateGenerationMs)}</dd></div>
        <div><dt>Exact solver</dt><dd>{formatMs(result.diagnostics.solverMs)}</dd></div>
        <div><dt>Total</dt><dd>{formatMs(result.diagnostics.totalMs)}</dd></div>
        <div><dt>Power model</dt><dd><code>{result.estimatedPowerModelVersion}</code></dd></div>
        {result.allocationMode === 'best-overall-first' ? (
          <>
            <div><dt>Overall profile</dt><dd><code>{result.bestOverallScoringVersion}</code></dd></div>
            <div>
              <dt>Overall weights</dt>
              <dd>
                {result.bestOverallPowerWeight}% power /{' '}
                {result.bestOverallFormationRatingWeight}% rating
              </dd>
            </div>
            <div><dt>Normalization scale</dt><dd>{result.bestOverallNormalizationScale.toLocaleString()}</dd></div>
          </>
        ) : null}
        <div><dt>Power model hash</dt><dd><code>{result.estimatedPowerModelHash}</code></dd></div>
        <div><dt>Power observation hash</dt><dd><code>{result.estimatedPowerObservationHash}</code></dd></div>
        <div><dt>Solution hash</dt><dd><code>{result.optimizerSolutionHash}</code></dd></div>
        <div><dt>Result hash</dt><dd><code>{result.optimizerResultHash}</code></dd></div>
      </dl>
    </details>
  );
}

export function OptimizerRelationshipDetail({
  relationship,
  dragonsById,
}: {
  relationship: FormationRelationshipV3;
  dragonsById: ReadonlyMap<string, Dragon>;
}) {
  const selectedTrace = relationship.candidateTraces.find(
    (trace) => trace.candidate.id === relationship.selectedCandidateId,
  );
  const simultaneousUses = [
    ...(selectedTrace ? mixedUseLabels(selectedTrace.provider, dragonsById) : []),
    ...(selectedTrace ? mixedUseLabels(selectedTrace.beneficiary, dragonsById) : []),
  ];
  const nonSharedRequirements = selectedTrace
    ? nonSharedRequirementLabels(selectedTrace, dragonsById)
    : [];
  return (
    <>
      <p>
        <strong>{semanticTagLabel(relationship)}</strong> ·{' '}
        {relationshipClassLabel(relationship)} ·{' '}
        {relationship.quantification.status === 'quantified'
          ? `${formatPercent(relationship.quantification.reliability)} reliability`
          : 'Unquantified'}
      </p>
      <p>
        {dragonsById.get(relationship.providerDragonId)?.name ?? relationship.providerDragonId}
        {' → '}
        {dragonsById.get(relationship.beneficiaryDragonId)?.name ?? relationship.beneficiaryDragonId}
      </p>
      <dl className="optimizer-relationship-metrics">
        <div><dt>Base value</dt><dd>{formatRelationshipValue(relationship.baseValue)}</dd></div>
        <div><dt>Final contribution</dt><dd>{formatRelationshipValue(relationship.adjustedMarginalValue)}</dd></div>
        <div><dt>Redundancy rank</dt><dd>{relationship.redundancyRank}</dd></div>
      </dl>
      {relationship.quantification.status === 'quantified' ? (
        <p>{reliabilityMethodLabels[relationship.quantification.method]}: {relationship.quantification.explanation}</p>
      ) : (
        <>
          <p>
            Base potential {formatRelationshipValue(relationship.unquantifiedBasePotential)};
            numeric contribution 0. {reliabilityReasonLabels[relationship.quantification.reason]}.
          </p>
          <p>{relationship.quantification.explanation}</p>
        </>
      )}
      {simultaneousUses.length > 0 ? (
        <>
          <p>Simultaneous uses:</p>
          <ul>
            {simultaneousUses.map((use, index) => (
              <li key={`${use.label}:${index}`}>{use.label}{use.selected ? ' — selected lower bound' : ''}</li>
            ))}
          </ul>
          <p>One relationship base value is used. Use probabilities are not added or averaged.</p>
        </>
      ) : null}
      {(selectedTrace?.sharedRequirementIds.length ?? 0) > 0 ? (
        <p>
          Shared activation counted once
          {nonSharedRequirements.length > 0 ? `; distinct requirements: ${nonSharedRequirements.join(', ')}` : ''}.
        </p>
      ) : null}
      {selectedTrace ? (
        <p>
          Selected signals: {signalLabel(selectedTrace, 'provider', dragonsById)}
          {' → '}
          {signalLabel(selectedTrace, 'beneficiary', dragonsById)}.
        </p>
      ) : null}
      <details>
        <summary>Retained alternatives ({relationship.candidateTraces.length})</summary>
        <ol className="optimizer-retained-alternatives">
          {relationship.candidateTraces.map((trace) => (
            <li key={trace.candidate.id}>
              <strong>
                {candidateAbilityLabels(trace, 'provider', dragonsById).join(' + ')}
                {' → '}
                {candidateAbilityLabels(trace, 'beneficiary', dragonsById).join(' + ')}
              </strong>
              {' · '}
              {trace.quantification.status === 'quantified'
                ? `${formatPercent(trace.quantification.reliability)} · ${reliabilityMethodLabels[trace.quantification.method]}`
                : `Unquantified · ${reliabilityReasonLabels[trace.quantification.reason]}`}
              {' · adjusted value '}
              {formatRelationshipValue(candidateAdjustedValue(relationship, trace))}
              {' · '}
              {trace.candidate.id === relationship.selectedCandidateId ? 'Selected' : 'Not selected'}. {trace.selectionReason}
            </li>
          ))}
        </ol>
      </details>
      <details>
        <summary>Technical trace</summary>
        <p>
          Components: {relationship.componentIds.join(', ') || 'none'}. Events: {relationship.eventIds.join(', ') || 'none'}.
        </p>
        <p>
          Signals: {relationship.selectedProviderSignalId} → {relationship.selectedBeneficiarySignalId}.
          Candidate: {relationship.selectedCandidateId}. Variants: {relationship.probabilityVariantIds.join(', ') || 'none'}.
        </p>
      </details>
    </>
  );
}

function Methodology({ mode }: { mode: OptimizerAllocationMode }) {
  return (
    <details className="optimizer-methodology">
      <summary>How this was chosen</summary>
      <div>
        <ul>
          <li>Each eligible trio is generated once. All six placements are compared with Formation Rating v3 and the exact best arrangement is retained.</li>
          <li>Estimated Power v2 uses each dragon’s current Star Rank and Dragon Level. Formation reliability uses current active Habit Levels.</li>
          {mode === 'best-overall-first' ? (
            <li>Overall Score is an integer planning index: 60% step-relative progression power and 40% Formation Rating. It is recalculated after each army claims its dragons.</li>
          ) : (
            <li>Power, rating, and relationship values remain separate integer lexicographic objectives; no weighted floating-point blend or rarity priority is used.</li>
          )}
          <li>No dragon appears in more than one generated army.</li>
          {mode === 'best-overall-first'
            ? <li>Each Army K has the highest exact Overall Score among candidates remaining after Armies 1 through K−1.</li>
            : mode === 'strongest-first'
              ? <li>Each Army K has the highest raw Estimated Power remaining after Armies 1 through K−1 claim their dragons.</li>
              : <li>The complete ascending raw-power vector is maximized first, then the ascending rating vector, relationship value, relationship count, and stable key.</li>}
          <li>Estimated Power is unofficial and does not simulate combat or guarantee a real-game outcome.</li>
        </ul>
      </div>
    </details>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function rarityCounts(rarities: DragonRarity[]) {
  return rarities.reduce(
    (counts, rarity) => ({ ...counts, [rarity]: counts[rarity] + 1 }),
    { Legendary: 0, Epic: 0, Rare: 0 },
  );
}

function tierSummary(distribution: TierDistribution): string {
  return Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => `${tier} ${count}`)
    .join(' · ');
}

function powerConfidenceSummary(formation: PowerAwareOptimizedFormation): string {
  return (['observed', 'modeled', 'low'] as const)
    .filter((confidence) => formation.powerConfidenceCounts[confidence] > 0)
    .map((confidence) => `${confidence} ${formation.powerConfidenceCounts[confidence]}`)
    .join(', ');
}

function maximumPhaseValue(
  profile: FlexiblePowerAwareOptimizationResult['diagnostics']['performanceProfile'],
  field: 'variableCount' | 'constraintCount',
): number {
  return Math.max(0, ...(profile?.phases.map((phase) => phase[field]) ?? []));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 10_000) / 100}%`;
}

function formatRelationshipValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function formatMs(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

function armyWord(count: number): string {
  return count === 1 ? 'army' : 'armies';
}

function dragonWord(count: number): string {
  return count === 1 ? 'dragon' : 'dragons';
}

function modeLabel(mode: OptimizerAllocationMode): string {
  if (mode === 'best-overall-first') return 'Best Overall First';
  if (mode === 'strongest-first') return 'Highest Raw Power First';
  return 'Balance Raw Power Across Armies';
}
