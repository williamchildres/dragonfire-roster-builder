import { Save, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { dragons } from '../data/dragons';
import { FORMATION_POSITIONS } from '../models/dragon';
import type { FormationArrangement } from '../services/formationArrangement';
import { positionLabels } from '../services/teamShare';
import { MAX_SAVED_FORMATION_NAME_LENGTH, type SavedFormationEvaluationMode, type SavedFormationRecord, type SavedFormationSource } from '../savedFormations/types';

export interface SavedFormationSaveRequest {
  kind: 'new' | 'update' | 'copy';
  arrangement: FormationArrangement;
  evaluationMode: SavedFormationEvaluationMode;
  source: SavedFormationSource;
  recordId?: string;
  defaultName: string;
}

export function SavedFormationSaveDialog({
  request,
  duplicate,
  destination,
  onCancel,
  onConfirm,
}: {
  request: SavedFormationSaveRequest;
  duplicate: SavedFormationRecord | null;
  destination: string;
  onCancel: () => void;
  onConfirm: (name: string, duplicateChoice?: 'update-existing' | 'save-copy') => void;
}) {
  const [name, setName] = useState(request.defaultName);
  const [showDuplicateChoice, setShowDuplicateChoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const namesById = new Map(dragons.map((dragon) => [dragon.id, dragon.name]));

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('modal-open');
    dialogRef.current?.focus();
    return () => {
      document.body.classList.remove('modal-open');
      previousFocus.current?.focus();
    };
  }, []);

  const submit = () => {
    const normalized = name.trim();
    if (!normalized) return setError('Enter a formation name.');
    if (normalized.length > MAX_SAVED_FORMATION_NAME_LENGTH) return setError(`Use ${MAX_SAVED_FORMATION_NAME_LENGTH} characters or fewer.`);
    if (duplicate) {
      setShowDuplicateChoice(true);
      return;
    }
    onConfirm(normalized);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className="details-dialog account-dialog saved-formation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-formation-title"
        tabIndex={-1}
        onKeyDown={(event) => trapDialogKey(event, dialogRef.current, onCancel)}
      >
        <header className="details-header account-dialog-header">
          <div className="details-heading-copy">
            <p className="eyebrow">Saved Formation Library</p>
            <h2 id="save-formation-title">{request.kind === 'update' ? 'Update Saved Formation' : request.kind === 'copy' ? 'Save as New' : 'Save Formation'}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close save formation dialog" onClick={onCancel}><X size={22} aria-hidden="true" /></button>
        </header>
        <div className="account-dialog-body">
          <label className="field-label" htmlFor="saved-formation-name">Formation name</label>
          <input
            id="saved-formation-name"
            value={name}
            maxLength={MAX_SAVED_FORMATION_NAME_LENGTH}
            onChange={(event) => { setName(event.target.value); setError(null); setShowDuplicateChoice(false); }}
            autoFocus
          />
          <p className="field-help">{name.length}/{MAX_SAVED_FORMATION_NAME_LENGTH} characters</p>
          <dl className="saved-formation-dialog-positions">
            {FORMATION_POSITIONS.map((position) => <div key={position}><dt>{positionLabels[position]}</dt><dd>{namesById.get(request.arrangement[position]) ?? request.arrangement[position]}</dd></div>)}
          </dl>
          <p><strong>Evaluation:</strong> {request.evaluationMode === 'planning' ? 'Planning — Star 10 and unlocked Habits at Level 5' : 'Current roster progression'}</p>
          <p><strong>Destination:</strong> {destination}</p>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {showDuplicateChoice && duplicate ? (
            <div className="duplicate-save-choice" role="alert">
              <p><strong>This exact placement is already saved as “{duplicate.name}”.</strong></p>
              <p>Update the existing record, save an explicit copy, or cancel.</p>
              <div className="dialog-actions decision-actions">
                <button type="button" className="primary-button" onClick={() => onConfirm(name.trim(), 'update-existing')}>Update “{duplicate.name}”</button>
                <button type="button" className="secondary-button" onClick={() => onConfirm(name.trim(), 'save-copy')}>Save explicit copy</button>
                <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="dialog-actions">
              <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
              <button type="button" className="primary-button" onClick={submit}><Save size={17} aria-hidden="true" /> {request.kind === 'update' ? 'Update Saved Formation' : request.kind === 'copy' ? 'Save as New' : 'Save Formation'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function trapDialogKey(event: KeyboardEvent<HTMLDivElement>, dialog: HTMLDivElement | null, onClose: () => void) {
  if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
  if (event.key !== 'Tab' || !dialog) return;
  const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
