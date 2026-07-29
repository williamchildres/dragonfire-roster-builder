import { ChevronRight, CircleCheck, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dragon, DragonRarity, OwnedDragon } from '../models/dragon';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerRequestFingerprint,
} from '../optimizer/rosterOptimizerCandidates';
import {
  RosterOptimizerClient,
  type RosterOptimizerRunner,
} from '../optimizer/rosterOptimizerClient';
import {
  RosterOptimizerCancelledError,
  type BestTenOverallOptimizationResult,
  type OptimizedFormation,
  type OptimizerRosterDragon,
  type OptimizerWaveResult,
  type PrimaryBackupOptimizationResult,
  type PowerAwareOptimizedFormation,
  type PowerAwareOptimizerWaveResult,
  type PowerAwarePrimaryBackupOptimizationResult,
  type RosterOptimizationResult,
  type RosterOptimizerStrategy,
} from '../optimizer/rosterOptimizerTypes';
import type { FormationArrangement } from '../services/formationArrangement';
import type {
  FormationRelationshipV3,
} from '../synergy/reliability';
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

export const DEFAULT_ROSTER_OPTIMIZER_STRATEGY: RosterOptimizerStrategy =
  'power-aware-primary-five-backup-five';

export function RosterOptimizer({
  allDragons,
  roster,
  strategy,
  onStrategyChange,
  result,
  onResultChange,
  runner: suppliedRunner,
  onOpenFormation,
  onOpenRoster,
  onNavigate,
}: {
  allDragons: Dragon[];
  roster: Record<string, OwnedDragon>;
  strategy: RosterOptimizerStrategy;
  onStrategyChange: (strategy: RosterOptimizerStrategy) => void;
  result: RosterOptimizationResult | null;
  onResultChange: (result: RosterOptimizationResult) => void;
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
  const requestFingerprint = useMemo(
    () => createRosterOptimizerRequestFingerprint(snapshot, strategy),
    [snapshot, strategy],
  );
  const latestRequestFingerprint = useRef(requestFingerprint);
  const activeRunId = useRef(0);
  const isMounted = useRef(true);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const eligibleCounts = rarityCounts(snapshot.map((dragon) => dragon.rarity));
  const isStale = Boolean(result && result.requestFingerprint !== requestFingerprint);

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

  const run = async () => {
    const activeFingerprint = requestFingerprint;
    const runId = activeRunId.current + 1;
    activeRunId.current = runId;
    setStatus('running');
    setError(null);
    try {
      const response = await runner.run(roster, strategy);
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
      onResultChange(response);
      setStatus('success');
    } catch (runError) {
      if (!isMounted.current || activeRunId.current !== runId) {
        return;
      }
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
  };

  return (
    <section className="optimizer-workspace" aria-labelledby="optimizer-title">
      <header className="optimizer-header">
        <p className="eyebrow">Exact global allocation</p>
        <h2 id="optimizer-title" tabIndex={-1}>Roster Optimizer</h2>
        <p>Build 10 non-overlapping formations from your current roster, with a strategy that reflects how you play.</p>
      </header>

      <div className="optimizer-roster-summary" aria-label="Eligible roster summary">
        <Metric label="Eligible dragons" value={snapshot.length} />
        <Metric label="Required" value={30} />
        <Metric label="Legendary" value={eligibleCounts.Legendary} />
        <Metric label="Epic" value={eligibleCounts.Epic} />
        <Metric label="Rare" value={eligibleCounts.Rare} />
      </div>
      <p className="optimizer-policy-note">
        Recommendations use your owned dragons, current Star Ranks, Dragon Levels, and saved Habit Levels. Missing required progression remains unquantified.{' '}
        <AppLink route="about" navigate={onNavigate}>How recommendations are built</AppLink>
      </p>

      <fieldset className="optimizer-strategy" disabled={status === 'running'}>
        <legend>Optimization Strategy</legend>
        <label className={strategy === 'power-aware-primary-five-backup-five' ? 'is-selected' : undefined}>
          <input
            type="radio"
            name="optimizer-strategy"
            value="power-aware-primary-five-backup-five"
            checked={strategy === 'power-aware-primary-five-backup-five'}
            onChange={() => onStrategyChange('power-aware-primary-five-backup-five')}
          />
          <span>
            <strong>Power-Aware 5 + Backup 5</strong>
            <small>Use Estimated Power to choose the strongest 15 Primary dragons, then arrange them into five formations using Formation Rating.</small>
            <em className="optimizer-experimental-badge">Estimated / Experimental</em>
          </span>
        </label>
        <label className={strategy === 'primary-five-backup-five' ? 'is-selected' : undefined}>
          <input
            type="radio"
            name="optimizer-strategy"
            value="primary-five-backup-five"
            checked={strategy === 'primary-five-backup-five'}
            onChange={() => onStrategyChange('primary-five-backup-five')}
          />
          <span>
            <strong>Rarity-Priority 5 + Backup 5</strong>
            <small>Prioritize your five active formations first, then optimize five Backup formations from the remaining dragons.</small>
            <em>Legendary dragons are prioritized into Primary before Epic and Rare.</em>
          </span>
        </label>
        <label className={strategy === 'best-ten-overall' ? 'is-selected' : undefined}>
          <input
            type="radio"
            name="optimizer-strategy"
            value="best-ten-overall"
            checked={strategy === 'best-ten-overall'}
            onChange={() => onStrategyChange('best-ten-overall')}
          />
          <span>
            <strong>Best 10 Overall</strong>
            <small>Optimize all ten formations as one equally weighted collection.</small>
          </span>
        </label>
      </fieldset>

      {snapshot.length < 30 ? (
        <div className="optimizer-unavailable" role="status">
          <p>You need {30 - snapshot.length} more eligible dragons to build 10 complete formations.</p>
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
            {strategy === 'best-ten-overall'
              ? 'Find My Best 10 Overall'
              : 'Find My Primary & Backup Formations'}
          </button>
          {status === 'running' ? (
            <button type="button" className="secondary-button" onClick={cancel}>
              <X size={17} aria-hidden="true" /> Cancel
            </button>
          ) : null}
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {status === 'running' ? 'Finding the exact optimal roster allocation.' : null}
        {status === 'success' ? 'Exact optimal roster allocation ready.' : null}
        {status === 'error' ? error : null}
      </div>
      {status === 'running' ? (
        <div className="optimizer-running" role="status">
          <span className="optimizer-spinner" aria-hidden="true" />
          <div>
            <strong>Finding the exact optimal allocation…</strong>
            <p>Evaluating every trio and proving the global result. No percentage is estimated.</p>
          </div>
        </div>
      ) : null}
      {error ? <div className="status-message error" role="alert">{error}</div> : null}
      {isStale ? (
        <div className="optimizer-stale" role="status">
          Your roster progression or optimization strategy changed. Run the optimizer again to refresh this result.
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

      <Methodology strategy={strategy} />
    </section>
  );
}

function OptimizerResultView({
  result,
  allDragons,
  snapshot,
  stale,
  onOpenFormation,
}: {
  result: RosterOptimizationResult;
  allDragons: Dragon[];
  snapshot: OptimizerRosterDragon[];
  stale: boolean;
  onOpenFormation: (arrangement: FormationArrangement) => void;
}) {
  const dragonsById = new Map(allDragons.map((dragon) => [dragon.id, dragon]));
  const progressionById = new Map(snapshot.map((dragon) => [dragon.dragonId, dragon]));
  return (
    <div className={stale ? 'optimizer-result is-stale' : 'optimizer-result'}>
      <header className="optimizer-result-header">
        <div>
          <p className="eyebrow">
            {result.strategy === 'power-aware-primary-five-backup-five'
              ? 'Power-Aware 5 + Backup 5'
              : result.strategy === 'primary-five-backup-five'
                ? 'Rarity-Priority 5 + Backup 5'
                : 'Best 10 Overall'}
          </p>
          <h3>Exact optimal result</h3>
        </div>
        <span className="optimizer-optimal-badge"><CircleCheck size={17} aria-hidden="true" /> Proven optimal</span>
      </header>
      {result.strategy !== 'best-ten-overall' ? (
        <PrimaryBackupResult
          result={result}
          dragonsById={dragonsById}
          stale={stale}
          onOpenFormation={onOpenFormation}
        />
      ) : (
        <BestTenResult
          result={result}
          dragonsById={dragonsById}
          stale={stale}
          onOpenFormation={onOpenFormation}
        />
      )}
      <UnusedDragons
        result={result}
        dragonsById={dragonsById}
        progressionById={progressionById}
      />
      <TechnicalDetails result={result} />
    </div>
  );
}

function BestTenResult({
  result,
  dragonsById,
  stale,
  onOpenFormation,
}: {
  result: BestTenOverallOptimizationResult;
  dragonsById: Map<string, Dragon>;
  stale: boolean;
  onOpenFormation: (arrangement: FormationArrangement) => void;
}) {
  return <>
    <div className="optimizer-result-metrics">
      <Metric label="Total Formation Rating" value={result.collection.totalRating} />
      <Metric label="Average" value={result.collection.averageRating.toFixed(1)} />
      <Metric label="Lowest" value={result.collection.minimumRating} />
      <Metric label="Dragons used" value={result.usedDragonIds.length} />
      <Metric label="Legendary used" value={result.usedRarityCounts.Legendary} />
      <Metric label="Epic used" value={result.usedRarityCounts.Epic} />
      <Metric label="Rare used" value={result.usedRarityCounts.Rare} />
      <Metric label="Adjusted relationship value" value={result.collection.totalRelationshipValue} />
      <Metric label="Evidence-backed relationships" value={result.collection.totalActiveRelationships} />
      <Metric label="Quantified relationships" value={result.collection.quantifiedRelationshipCount} />
      <Metric label="Unquantified relationships" value={result.collection.unquantifiedRelationshipCount} />
      <Metric label="Unquantified base potential" value={result.collection.unquantifiedBasePotential} />
    </div>
    <p className="optimizer-allocation-note">All ten formations are optimized as one equally weighted non-overlapping collection.</p>
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
  </>;
}

function PrimaryBackupResult({
  result,
  dragonsById,
  stale,
  onOpenFormation,
}: {
  result: PrimaryBackupOptimizationResult | PowerAwarePrimaryBackupOptimizationResult;
  dragonsById: Map<string, Dragon>;
  stale: boolean;
  onOpenFormation: (arrangement: FormationArrangement) => void;
}) {
  const powerAware = result.strategy === 'power-aware-primary-five-backup-five';
  const hasLowConfidence = powerAware && result.combined.powerConfidenceCounts.low > 0;
  return <>
    {hasLowConfidence ? (
      <p className="optimizer-power-warning" role="status">
        Some selected dragons have low-confidence Estimated Power extrapolations. Confidence is a warning only and never changes objective priority.
      </p>
    ) : null}
    <WaveSection
      wave={result.primary}
      description={powerAware
        ? 'Estimated Power selects the Primary dragon pool; Formation Rating organizes that pool into five formations.'
        : 'Your strongest five active formations. Rarity and formation quality are prioritized here before the Backup set.'}
      dragonsById={dragonsById}
      stale={stale}
      onOpenFormation={onOpenFormation}
    />
    <WaveSection
      wave={result.backup}
      description="Five optimized Backup formations built from dragons not used by the Primary set."
      dragonsById={dragonsById}
      stale={stale}
      onOpenFormation={onOpenFormation}
    />
    <section className="optimizer-combined-summary" aria-labelledby="combined-summary-title">
      <h4 id="combined-summary-title">Combined result</h4>
      <div className="optimizer-result-metrics">
        <Metric label="Total rating" value={result.combined.totalRating} />
        <Metric label="Average" value={result.combined.averageRating.toFixed(1)} />
        <Metric label="Unique dragons" value={result.usedDragonIds.length} />
        <Metric label="Evidence-backed relationships" value={result.combined.totalActiveRelationships} />
        <Metric label="Quantified relationships" value={result.combined.quantifiedRelationshipCount} />
        <Metric label="Unquantified relationships" value={result.combined.unquantifiedRelationshipCount} />
        <Metric label="Unquantified base potential" value={result.combined.unquantifiedBasePotential} />
      </div>
    </section>
  </>;
}

function WaveSection({
  wave,
  description,
  dragonsById,
  stale,
  onOpenFormation,
}: {
  wave: OptimizerWaveResult | PowerAwareOptimizerWaveResult;
  description: string;
  dragonsById: Map<string, Dragon>;
  stale: boolean;
  onOpenFormation: (arrangement: FormationArrangement) => void;
}) {
  const headingId = `optimizer-${wave.kind}-heading`;
  return (
    <section className={`optimizer-wave optimizer-wave-${wave.kind}`} aria-labelledby={headingId}>
      <header>
        <div>
          <p className="eyebrow">{wave.label} set</p>
          <h4 id={headingId}>{wave.label} Formations</h4>
          <p>{description}</p>
        </div>
      </header>
      <div className="optimizer-result-metrics optimizer-wave-metrics">
        {'totalEstimatedPower' in wave ? <>
          <Metric label="Total Estimated Power" value={wave.totalEstimatedPower.toLocaleString()} />
          <Metric label="Average Power / dragon" value={Math.round(wave.averageEstimatedPowerPerDragon).toLocaleString()} />
          <Metric label="Formation Power range" value={`${wave.minimumFormationEstimatedPower.toLocaleString()}–${wave.maximumFormationEstimatedPower.toLocaleString()}`} />
        </> : null}
        <Metric label="Formations" value={wave.formations.length} />
        <Metric label="Total rating" value={wave.totalRating} />
        <Metric label="Average" value={wave.averageRating.toFixed(1)} />
        <Metric label="Lowest" value={wave.minimumRating} />
        <Metric label="Legendary" value={wave.rarityCounts.Legendary} />
        <Metric label="Epic" value={wave.rarityCounts.Epic} />
        <Metric label="Rare" value={wave.rarityCounts.Rare} />
        <Metric label="Adjusted relationship value" value={wave.totalRelationshipValue} />
        <Metric label="Evidence-backed relationships" value={wave.totalActiveRelationships} />
        <Metric label="Quantified relationships" value={wave.quantifiedRelationshipCount} />
        <Metric label="Unquantified relationships" value={wave.unquantifiedRelationshipCount} />
        <Metric label="Unquantified base potential" value={wave.unquantifiedBasePotential} />
        {'powerConfidenceCounts' in wave ? <>
          <Metric label="Observed Power" value={wave.powerConfidenceCounts.observed} />
          <Metric label="Modeled Power" value={wave.powerConfidenceCounts.modeled} />
          <Metric label="Low-confidence Power" value={wave.powerConfidenceCounts.low} />
        </> : null}
      </div>
      <p className="optimizer-tier-summary"><strong>Rating tiers:</strong> {tierSummary(wave.tierDistribution)}</p>
      <div className="optimizer-formation-grid">
        {wave.formations.map((formation) => (
          <OptimizerFormationCard
            key={`${wave.kind}-${formation.stableCandidateKey}`}
            formation={formation}
            dragonsById={dragonsById}
            disabled={stale}
            onOpen={() => onOpenFormation(formation.arrangement)}
          />
        ))}
      </div>
    </section>
  );
}

function UnusedDragons({
  result,
  dragonsById,
  progressionById,
}: {
  result: RosterOptimizationResult;
  dragonsById: Map<string, Dragon>;
  progressionById: Map<string, OptimizerRosterDragon>;
}) {
  if (result.unusedDragonIds.length === 0) return null;
  return (
    <div className="optimizer-unused">
      <h4>Unused eligible {result.unusedDragonIds.length === 1 ? 'dragon' : 'dragons'}</h4>
      <p>Not used in this exact, strategy-specific allocation.</p>
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

function TechnicalDetails({ result }: { result: RosterOptimizationResult }) {
  return (
    <details className="optimizer-technical">
      <summary>Technical details</summary>
      <dl>
        <div><dt>Strategy</dt><dd>{result.strategy}</dd></div>
        <div><dt>Exactness</dt><dd>Optimal · zero gap</dd></div>
        <div><dt>Candidates considered</dt><dd>{result.diagnostics.candidateCount.toLocaleString()}</dd></div>
        <div><dt>Solver passes</dt><dd>{result.diagnostics.solverPasses ?? '—'}</dd></div>
        <div><dt>Nodes visited</dt><dd>{result.diagnostics.nodesVisited.toLocaleString()}</dd></div>
        <div><dt>Branches pruned</dt><dd>{result.diagnostics.branchesPruned.toLocaleString()}</dd></div>
        <div><dt>Candidate generation</dt><dd>{formatMs(result.diagnostics.candidateGenerationMs)}</dd></div>
        <div><dt>Exact solver</dt><dd>{formatMs(result.diagnostics.solverMs)}</dd></div>
        <div><dt>Total</dt><dd>{formatMs(result.diagnostics.totalMs)}</dd></div>
        <div><dt>Solution hash</dt><dd><code>{result.optimizerSolutionHash}</code></dd></div>
        <div><dt>Result hash</dt><dd><code>{result.optimizerResultHash}</code></dd></div>
        {result.strategy === 'power-aware-primary-five-backup-five' ? <>
          <div><dt>Power model</dt><dd><code>{result.estimatedPowerModelVersion}</code></dd></div>
          <div><dt>Power model hash</dt><dd><code>{result.estimatedPowerModelHash}</code></dd></div>
          <div><dt>Power observation hash</dt><dd><code>{result.estimatedPowerObservationHash}</code></dd></div>
        </> : null}
      </dl>
    </details>
  );
}

function OptimizerFormationCard({
  formation,
  dragonsById,
  disabled,
  onOpen,
}: {
  formation: OptimizedFormation | PowerAwareOptimizedFormation;
  dragonsById: Map<string, Dragon>;
  disabled: boolean;
  onOpen: () => void;
}) {
  const label = formation.wave
    ? `${formation.wave === 'primary' ? 'Primary' : 'Backup'} ${formation.waveRank}`
    : `Formation ${formation.rank}`;
  const headingId = `optimizer-formation-${formation.wave ?? 'overall'}-${formation.rank}`;
  return (
    <article className="optimizer-formation-card" aria-labelledby={headingId}>
      <header>
        <div>
          <p className="eyebrow">{label}</p>
          <h4 id={headingId}>{formation.rating} · {formation.tier}</h4>
        </div>
        {formation.wave ? <span className={`optimizer-wave-badge ${formation.wave}`}>{formation.wave === 'primary' ? 'Primary' : 'Backup'}</span> : null}
        <div className="optimizer-score-pills" aria-label="Formation score breakdown">
          <span>Synergy {formation.activeSynergyScore}/80</span>
          <span>Placement {formation.placementScore}/20</span>
        </div>
      </header>
      {'estimatedPower' in formation ? (
        <div className="optimizer-formation-power">
          <span>Estimated Formation Power</span>
          <strong>{formation.estimatedPower.toLocaleString()}</strong>
          <small>Separate from Formation Rating {formation.rating}</small>
        </div>
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
        {formation.activeRelationshipCount} evidence-backed {formation.activeRelationshipCount === 1 ? 'relationship' : 'relationships'}
        {' · '}
        {formation.quantifiedRelationshipCount} quantified
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
        <p className="optimizer-tie-note">{formation.tiedBestArrangements.length} position assignments tie for best; the stable first is shown.</p>
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
        <strong>{semanticTagLabel(relationship)}</strong>
        {' · '}
        {relationshipClassLabel(relationship)}
        {' · '}
        {relationship.quantification.status === 'quantified'
          ? `${formatPercent(relationship.quantification.reliability)} reliability`
          : 'Unquantified'}
      </p>
      <p>
        {dragonsById.get(relationship.providerDragonId)?.name ??
          relationship.providerDragonId}
        {' → '}
        {dragonsById.get(relationship.beneficiaryDragonId)?.name ??
          relationship.beneficiaryDragonId}
      </p>
      <dl className="optimizer-relationship-metrics">
        <div><dt>Base value</dt><dd>{formatRelationshipValue(relationship.baseValue)}</dd></div>
        <div>
          <dt>Final contribution</dt>
          <dd>{formatRelationshipValue(relationship.adjustedMarginalValue)}</dd>
        </div>
        <div><dt>Redundancy rank</dt><dd>{relationship.redundancyRank}</dd></div>
      </dl>
      {relationship.quantification.status === 'quantified' ? (
        <p>
          {reliabilityMethodLabels[relationship.quantification.method]}:{' '}
          {relationship.quantification.explanation}
        </p>
      ) : (
        <>
          <p>
            Base potential {formatRelationshipValue(relationship.unquantifiedBasePotential)};
            numeric contribution 0. Unconditional reliability is unresolved:{' '}
            {reliabilityReasonLabels[relationship.quantification.reason]}.
          </p>
          {relationship.quantification.conditionalProbabilities?.length ? (
            <p>
              Conditional per-opportunity probability:{' '}
              {relationship.quantification.conditionalProbabilities
                .map(formatPercent)
                .join(', ')}.
            </p>
          ) : null}
          <p>{relationship.quantification.explanation}</p>
        </>
      )}
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
          Shared activation counted once; distinct provider and beneficiary
          requirements remain required
          {nonSharedRequirements.length > 0
            ? ` (${nonSharedRequirements.join(', ')})`
            : ''}.
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
          {relationship.candidateTraces.map((trace) => {
            const selected = trace.candidate.id === relationship.selectedCandidateId;
            return (
              <li key={trace.candidate.id}>
                <strong>
                  {candidateAbilityLabels(trace, 'provider', dragonsById).join(' + ')}
                  {' → '}
                  {candidateAbilityLabels(trace, 'beneficiary', dragonsById).join(' + ')}
                </strong>
                {' · '}
                {trace.candidate.resultKind === 'setup-payoff'
                  ? 'Setup payoff'
                  : 'Amplifier output'}
                {' · '}
                {trace.quantification.status === 'quantified'
                  ? `${formatPercent(trace.quantification.reliability)} · ${reliabilityMethodLabels[trace.quantification.method]}`
                  : `Unquantified · ${reliabilityReasonLabels[trace.quantification.reason]}`}
                {' · adjusted value '}
                {formatRelationshipValue(candidateAdjustedValue(relationship, trace))}
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
    </>
  );
}

function formatPercent(value: number): string {
  return `${Math.round(value * 10_000) / 100}%`;
}

function formatRelationshipValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function Methodology({ strategy }: { strategy: RosterOptimizerStrategy }) {
  return (
    <details className="optimizer-methodology">
      <summary>How this was chosen</summary>
      <div>
        <p>The optimizer uses eligible dragons from My Roster and requires at least 30.</p>
        {strategy === 'power-aware-primary-five-backup-five' ? (
          <ul>
            <li>Estimated Power chooses the Primary dragon pool. Formation Rating organizes equally powerful choices into formations.</li>
            <li>Estimated Power is empirical and unofficial. It is not combat simulation or an official game formula.</li>
            <li>Backup Estimated Power is optimized only after every Primary numeric quality objective is fixed.</li>
            <li>Power and the 0–100 Formation Rating remain separate; no weighted blend is used.</li>
            <li>Rarity and power confidence are diagnostics only. Formation reliability uses the saved Habit Levels from My Roster.</li>
          </ul>
        ) : strategy === 'primary-five-backup-five' ? (
          <ul>
            <li>Only five formations may be active at once, so the Primary five are optimized first.</li>
            <li>Primary Legendary inclusion is prioritized before Epic and Rare, then Primary formation quality is optimized.</li>
            <li>Backup uses dragons not used by Primary. Exactly tied Primary results are decided by the strongest possible Backup set.</li>
            <li>No dragon is repeated across the five Primary and five Backup formations.</li>
            <li>Every trio checks all six placements with Formation Rating v3 reliability-adjusted value.</li>
            <li>Star Rank, Dragon Level, and saved Habit Levels are respected.</li>
            <li>No combat simulation occurs.</li>
          </ul>
        ) : (
          <ul>
            <li>All ten formations are optimized together as one collection with no dragon reuse.</li>
            <li>Legendary inclusion is prioritized over Epic; Epic is prioritized over Rare.</li>
            <li>Every trio checks all six placements with Formation Rating v3 reliability-adjusted value.</li>
            <li>Star Rank, Dragon Level, and saved Habit Levels are respected.</li>
            <li>No combat simulation occurs.</li>
          </ul>
        )}
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

function tierSummary(distribution: OptimizerWaveResult['tierDistribution']): string {
  return Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => `${tier} ${count}`)
    .join(' · ');
}

function formatMs(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}
