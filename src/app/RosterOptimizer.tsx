import { BookmarkPlus, ChevronRight, CircleCheck, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dragon, DragonRarity, OwnedDragon } from '../models/dragon';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerRequestFingerprint,
} from '../optimizer/rosterOptimizerCandidates';
import {
  clampOptimizerFormationCount,
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
import { createEmptySavedFormationLibrary } from '../savedFormations/contract';
import type { SavedFormationLibrary } from '../savedFormations/types';
import { getReservedFormationRecords } from '../savedFormations/reservations';
import {
  buildOptimizerReservationContextFingerprint,
  projectReservedOptimizerRoster,
  reservationPresentationEntries,
  OPTIMIZER_RESERVATION_CONTEXT_VERSION,
  type OptimizerReservationRunContext,
} from '../optimizer/reservedOptimizerProjection';
import type { FormationRelationshipV3 } from '../synergy/reliability';
import { AppLink, type NavigateToRoute } from './appRouter';
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

export const DEFAULT_OPTIMIZER_ALLOCATION_MODE: OptimizerAllocationMode = 'best-overall-first';
const EMPTY_SAVED_FORMATION_LIBRARY = createEmptySavedFormationLibrary('1970-01-01T00:00:00.000Z');
/** @deprecated v0.21 compatibility alias; the UI no longer exposes strategies. */
export const DEFAULT_ROSTER_OPTIMIZER_STRATEGY = DEFAULT_OPTIMIZER_ALLOCATION_MODE;

export function RosterOptimizer({
  allDragons,
  roster,
  allocationMode,
  onAllocationModeChange,
  formationCount,
  onFormationCountChange,
  savedFormationLibrary = EMPTY_SAVED_FORMATION_LIBRARY,
  excludeReservedDragons = true,
  onExcludeReservedDragonsChange = () => undefined,
  result,
  resultReservationContext = null,
  onResultChange,
  runner: suppliedRunner,
  onOpenFormation,
  onSaveFormation = () => undefined,
  savedFormationLimitReached = false,
  onOpenRoster,
  onOpenSavedFormations = onOpenRoster,
  onNavigate,
}: {
  allDragons: Dragon[];
  roster: Record<string, OwnedDragon>;
  allocationMode: OptimizerAllocationMode;
  onAllocationModeChange: (mode: OptimizerAllocationMode) => void;
  formationCount: number;
  onFormationCountChange: (count: number) => void;
  savedFormationLibrary?: SavedFormationLibrary;
  excludeReservedDragons?: boolean;
  onExcludeReservedDragonsChange?: (exclude: boolean) => void;
  result: FlexiblePowerAwareOptimizationResult | null;
  resultReservationContext?: OptimizerReservationRunContext | null;
  onResultChange: (result: FlexiblePowerAwareOptimizationResult, reservationContext: OptimizerReservationRunContext) => void;
  runner?: RosterOptimizerRunner;
  onOpenFormation: (arrangement: FormationArrangement) => void;
  onSaveFormation?: (arrangement: FormationArrangement) => void;
  savedFormationLimitReached?: boolean;
  onOpenRoster: () => void;
  onOpenSavedFormations?: () => void;
  onNavigate?: NavigateToRoute;
}) {
  const [ownedRunner] = useState<RosterOptimizerRunner | null>(() =>
    suppliedRunner ? null : new RosterOptimizerClient(),
  );
  const runner = suppliedRunner ?? ownedRunner!;
  const reservedFormations = useMemo(() => getReservedFormationRecords(savedFormationLibrary), [savedFormationLibrary]);
  const reservationExclusionEnabled = reservedFormations.length > 0 && excludeReservedDragons;
  const projection = useMemo(() => projectReservedOptimizerRoster({
    dragons: allDragons,
    roster,
    library: savedFormationLibrary,
    exclusionEnabled: reservationExclusionEnabled,
  }), [allDragons, reservationExclusionEnabled, roster, savedFormationLibrary]);
  const snapshot = useMemo(
    () => buildOptimizerRosterSnapshot(allDragons, projection.effectiveRoster),
    [allDragons, projection.effectiveRoster],
  );
  const maximumCount = projection.maximumFormationCount;
  const effectiveCount = clampOptimizerFormationCount(formationCount, snapshot.length);
  const requestFingerprint = useMemo(
    () => createRosterOptimizerRequestFingerprint(
      snapshot,
      allocationMode,
      effectiveCount,
    ),
    [allocationMode, effectiveCount, snapshot],
  );
  const reservationContextFingerprint = useMemo(() => buildOptimizerReservationContextFingerprint({
    dragons: allDragons,
    projection,
    exclusionEnabled: reservationExclusionEnabled,
    allocationMode,
    formationCount: effectiveCount,
    optimizerRequestFingerprint: requestFingerprint,
  }), [allocationMode, allDragons, effectiveCount, projection, requestFingerprint, reservationExclusionEnabled]);
  const latestRequestFingerprint = useRef(requestFingerprint);
  const latestReservationContextFingerprint = useRef(reservationContextFingerprint);
  const activeRunId = useRef(0);
  const isMounted = useRef(true);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState<OptimizerRunProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countNotice, setCountNotice] = useState<string | null>(null);
  const isStale = Boolean(result && (
    result.requestFingerprint !== requestFingerprint ||
    (resultReservationContext && resultReservationContext.fingerprint !== reservationContextFingerprint)
  ));
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
    latestReservationContextFingerprint.current = reservationContextFingerprint;
  }, [requestFingerprint, reservationContextFingerprint]);

  useEffect(() => {
    if (formationCount === effectiveCount) return;
    onFormationCountChange(effectiveCount);
    if (effectiveCount > 0) queueMicrotask(() => {
      if (!isMounted.current) return;
      setCountNotice(
        reservationExclusionEnabled
          ? `Reserved-dragon exclusions leave ${projection.eligibleAfterExclusions} eligible dragons. Your roster now supports ${effectiveCount} ${armyWord(effectiveCount)}; the selected count was adjusted to ${effectiveCount}.`
          : `Your eligible roster now supports ${effectiveCount} ${armyWord(effectiveCount)}. The selected count was adjusted to ${effectiveCount}.`,
      );
    });
  }, [effectiveCount, formationCount, onFormationCountChange, projection.eligibleAfterExclusions, reservationExclusionEnabled]);

  const run = async () => {
    if (effectiveCount < 1) return;
    const activeFingerprint = requestFingerprint;
    const activeReservationFingerprint = reservationContextFingerprint;
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
        projection.effectiveRoster,
        allocationMode,
        effectiveCount,
        setProgress,
      );
      if (
        !isMounted.current ||
        activeRunId.current !== runId ||
        latestRequestFingerprint.current !== activeFingerprint ||
        latestReservationContextFingerprint.current !== activeReservationFingerprint ||
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
      onResultChange(response, {
        version: OPTIMIZER_RESERVATION_CONTEXT_VERSION,
        fingerprint: activeReservationFingerprint,
        exclusionEnabled: reservationExclusionEnabled,
        reservedFormationCount: reservedFormations.length,
        reservedDragonCount: projection.reservedDragonIds.length,
        resolvedExcludedDragonIds: projection.resolvedExcludedDragonIds,
        unavailableReservedDragonIds: projection.unavailableReservedDragonIds,
        eligibleDragonCount: projection.eligibleAfterExclusions,
        requestedFormationCount: effectiveCount,
        generatedFormationCount: response.generatedFormationCount,
        reservations: reservationPresentationEntries(savedFormationLibrary, projection),
      });
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
      <div className="optimizer-reservation-control">
        <label className={reservedFormations.length === 0 ? 'checkbox-row is-disabled' : 'checkbox-row'}>
          <input
            type="checkbox"
            checked={reservedFormations.length > 0 && excludeReservedDragons}
            disabled={reservedFormations.length === 0 || status === 'running'}
            onChange={(event) => { setCountNotice(null); onExcludeReservedDragonsChange(event.target.checked); }}
          />
          <span><strong>Exclude reserved dragons</strong><small>{reservedFormations.length === 0 ? 'No Saved Formations are currently reserved.' : 'Temporarily keep reserved dragons out of optimizer recommendations without changing reservations.'}</small></span>
        </label>
        {reservedFormations.length > 0 ? <div className="optimizer-reservation-summary" aria-live="polite"><p><strong>{projection.reservedDragonIds.length} dragons reserved in {reservedFormations.length} {reservedFormations.length === 1 ? 'formation' : 'formations'}.</strong></p><p>{reservationExclusionEnabled ? `${projection.resolvedExcludedDragonIds.length} currently owned dragons will be excluded.` : 'Reserved dragons will be included in this run.'}</p>{projection.unavailableReservedDragonIds.length > 0 ? <p>{projection.unavailableReservedDragonIds.length} reserved {projection.unavailableReservedDragonIds.length === 1 ? 'dragon is' : 'dragons are'} not currently owned and will not be described as excluded.</p> : null}<p>{projection.eligibleAfterExclusions} dragons remain eligible, allowing up to {projection.maximumFormationCount} {armyWord(projection.maximumFormationCount)}.</p><button type="button" className="text-button" onClick={onOpenSavedFormations}>Review Saved Formations</button></div> : null}
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
          <p>{reservationExclusionEnabled ? <><strong>Only {snapshot.length} eligible {dragonWord(snapshot.length)} remain.</strong> You need {3 - snapshot.length} more to build one complete army; reserved-dragon exclusions are reducing availability.</> : <>You need {3 - snapshot.length} more eligible {dragonWord(3 - snapshot.length)} to build one complete army.</>}</p>
          <div className="button-row">
            {reservationExclusionEnabled ? <button type="button" className="primary-button" onClick={() => onExcludeReservedDragonsChange(false)}>Include reserved dragons</button> : null}
            {reservedFormations.length > 0 ? <button type="button" className="secondary-button" onClick={onOpenSavedFormations}>Review reservations</button> : null}
            <button type="button" className="secondary-button" onClick={onOpenRoster}>Go to My Roster <ChevronRight size={16} aria-hidden="true" /></button>
          </div>
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
          Your roster progression, army count, or allocation mode changed; the effective eligible roster or reservation exclusions may also have changed. Run the optimizer again to refresh this result.
        </div>
      ) : null}
      {result ? (
        <OptimizerResultView
          result={result}
          allDragons={allDragons}
          snapshot={snapshot}
          reservationContext={resultReservationContext}
          savedFormationLibrary={savedFormationLibrary}
          stale={isStale}
          onOpenFormation={onOpenFormation}
          onSaveFormation={onSaveFormation}
          savedFormationLimitReached={savedFormationLimitReached}
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
  reservationContext,
  savedFormationLibrary,
  stale,
  onOpenFormation,
  onSaveFormation,
  savedFormationLimitReached,
}: {
  result: FlexiblePowerAwareOptimizationResult;
  allDragons: Dragon[];
  snapshot: OptimizerRosterDragon[];
  reservationContext: OptimizerReservationRunContext | null;
  savedFormationLibrary: SavedFormationLibrary;
  stale: boolean;
  onOpenFormation: (arrangement: FormationArrangement) => void;
  onSaveFormation: (arrangement: FormationArrangement) => void;
  savedFormationLimitReached: boolean;
}) {
  const dragonsById = new Map(allDragons.map((dragon) => [dragon.id, dragon]));
  const progressionById = new Map(snapshot.map((dragon) => [dragon.dragonId, dragon]));
  const collection = result.collection;
  return (
    <div className={stale ? 'optimizer-result is-stale' : 'optimizer-result'}>
      <header className="optimizer-result-header">
        <div>
          <p className="eyebrow">{modeLabel(result.allocationMode)}</p>
          <h3>{resultHeading(result.allocationMode)}</h3>
          <p className="optimizer-result-proof">
            {resultProofCopy(result.allocationMode)}
          </p>
        </div>
        <span
          className="optimizer-optimal-badge"
          aria-label={resultBadgeLabel(result.allocationMode)}
        >
          <CircleCheck size={17} aria-hidden="true" /> Proven exact
        </span>
      </header>
      <p className="optimizer-allocation-note">
        {result.allocationMode === 'best-overall-first'
          ? 'Each army’s Overall Score is calculated against the dragons remaining at that selection step. Scores from different army numbers are not directly comparable.'
          : result.allocationMode === 'strongest-first'
            ? 'Later armies are selected by raw Estimated Power only after every earlier army has claimed its three dragons.'
            : 'The solver prioritized the weakest raw-power army first, then the next weakest, before applying Formation Rating and relationship tie-breaks.'}
      </p>
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
      {reservationContext ? <ReservationRunSummary context={reservationContext} dragonsById={dragonsById} library={savedFormationLibrary} /> : null}
      <p className="optimizer-tier-summary"><strong>Rating tiers:</strong> {tierSummary(collection.tierDistribution)}</p>
      <div className="optimizer-formation-grid">
        {result.formations.map((formation) => (
          <OptimizerFormationCard
            key={formation.stableCandidateKey}
            formation={formation}
            dragonsById={dragonsById}
            disabled={stale}
            onOpen={() => onOpenFormation(formation.arrangement)}
            onSave={() => onSaveFormation(formation.arrangement)}
            saveDisabled={stale || savedFormationLimitReached}
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
  onSave,
  saveDisabled,
}: {
  formation: PowerAwareOptimizedFormation;
  dragonsById: Map<string, Dragon>;
  disabled: boolean;
  onOpen: () => void;
  onSave: () => void;
  saveDisabled: boolean;
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
        <BestOverallScoreDetails
          score={formation.bestOverallScore}
          armyRank={formation.rank}
        />
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
      <TroopAffinityRecommendation
        compact
        formationDragons={(['left-flank', 'vanguard', 'right-flank'] as const).flatMap((position) => {
          const dragon = dragonsById.get(formation.arrangement[position]);
          return dragon ? [dragon] : [];
        })}
      />
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
      <div className="button-row optimizer-card-actions">
        <button type="button" className="secondary-button" disabled={disabled} onClick={onOpen}>
          Open in Formation Builder <ChevronRight size={16} aria-hidden="true" />
        </button>
        <button type="button" className="primary-button" disabled={saveDisabled} onClick={onSave}>
          <BookmarkPlus size={16} aria-hidden="true" /> Save Formation
        </button>
      </div>
    </article>
  );
}

function BestOverallScoreDetails({
  score,
  armyRank,
}: {
  score: NonNullable<PowerAwareOptimizedFormation['bestOverallScore']>;
  armyRank: number;
}) {
  return (
    <details className="optimizer-overall-score">
      <summary>Overall Score {score.overallScore.toFixed(1)}</summary>
      <p>An explainable planning index, not combat power or predicted damage.</p>
      <p>
        Relative power compares this army with the strongest raw-power trio still available
        {' '}when Army {armyRank} was selected.
      </p>
      <dl>
        <div>
          <dt>Candidate raw power</dt>
          <dd>{formatEstimatedPowerUnits(score.estimatedPowerUnits)}</dd>
        </div>
        <div>
          <dt>Strongest raw power remaining at that step</dt>
          <dd>{formatEstimatedPowerUnits(score.maxRemainingPowerUnits)}</dd>
        </div>
        <div>
          <dt>Relative power index</dt>
          <dd>{(score.powerIndexBasisPoints / 100).toFixed(1)} / 100</dd>
        </div>
        <div>
          <dt>Formation Rating</dt>
          <dd>{score.ratingIndexBasisPoints / 100} / 100</dd>
        </div>
        <div>
          <dt>Power contribution ({score.powerWeight}%)</dt>
          <dd>{score.powerContributionUnits.toLocaleString()} score units</dd>
        </div>
        <div>
          <dt>Formation contribution ({score.formationRatingWeight}%)</dt>
          <dd>{score.ratingContributionUnits.toLocaleString()} score units</dd>
        </div>
        <div>
          <dt>Overall Score</dt>
          <dd>{score.overallScore.toFixed(1)}</dd>
        </div>
      </dl>
    </details>
  );
}

function ReservationRunSummary({ context, dragonsById, library }: {
  context: OptimizerReservationRunContext;
  dragonsById: ReadonlyMap<string, Dragon>;
  library: SavedFormationLibrary;
}) {
  const currentNames = new Map(library.formations.map((record) => [record.id, record.name]));
  return <div className="optimizer-reservation-result-summary">
    <p><strong>{context.exclusionEnabled ? `${context.resolvedExcludedDragonIds.length} reserved dragons were excluded from this run.` : 'Reserved dragons were included in this run.'}</strong></p>
    <dl className="optimizer-reservation-run-metrics">
      <div><dt>Reserved formations</dt><dd>{context.reservedFormationCount}</dd></div>
      <div><dt>Reserved dragons</dt><dd>{context.reservedDragonCount}</dd></div>
      <div><dt>Actually excluded</dt><dd>{context.resolvedExcludedDragonIds.length}</dd></div>
      <div><dt>Unavailable reserved</dt><dd>{context.unavailableReservedDragonIds.length}</dd></div>
      <div><dt>Eligible for solve</dt><dd>{context.eligibleDragonCount}</dd></div>
      <div><dt>Requested / generated</dt><dd>{context.requestedFormationCount} / {context.generatedFormationCount}</dd></div>
    </dl>
    {context.reservations.length > 0 ? <details className="optimizer-reserved-details"><summary>Reserved and excluded dragons</summary><ul>{context.reservations.map((reservation) => <li key={`${reservation.formationId}:${reservation.dragonId}`}><strong>{dragonsById.get(reservation.dragonId)?.name ?? reservation.dragonId}</strong><span>{currentNames.get(reservation.formationId) ?? reservation.formationName}</span><span>{reservation.eligible ? context.exclusionEnabled ? 'Currently owned · excluded' : 'Currently owned · included' : 'Not currently optimizer-eligible'}</span></li>)}</ul></details> : null}
  </div>;
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
  const upliftSummary = conditionalUpliftSummary(relationship, dragonsById);
  return (
    <>
      <p>
        <strong>{semanticTagLabel(relationship)}</strong> ·{' '}
        {relationshipClassLabel(relationship)} ·{' '}
        {relationship.quantification.status === 'quantified'
          ? `${formatPercent(relationship.quantification.reliability)} reliability`
          : 'Unquantified'}
      </p>
      {upliftSummary ? <p>{upliftSummary}</p> : null}
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
            <li>Overall Score is an integer planning index: 60% step-relative progression power and 40% Formation Rating. It is recalculated after each army claims its dragons, so scores from different army numbers are not directly comparable.</li>
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

function resultHeading(mode: OptimizerAllocationMode): string {
  return mode === 'balanced' ? 'Exact optimal result' : 'Exact sequential result';
}

function resultProofCopy(mode: OptimizerAllocationMode): string {
  if (mode === 'best-overall-first') {
    return 'Each army is the exact Best Overall winner at its selection step. The complete multi-army collection is not jointly optimized.';
  }
  if (mode === 'strongest-first') {
    return 'Each army is the exact highest raw-power trio remaining at its selection step.';
  }
  return 'All selected armies are solved jointly with exact lexicographic raw-power balance.';
}

function resultBadgeLabel(mode: OptimizerAllocationMode): string {
  return mode === 'balanced'
    ? 'Proven exact joint optimization'
    : 'Proven exact sequential selection';
}

function formatEstimatedPowerUnits(units: number): string {
  return (units * 10).toLocaleString();
}
