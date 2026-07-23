import { ExternalLink, Flame, X } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { supportLinks } from '../data/supportLinks';

export function SupportOptionsDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('modal-open');
    closeButtonRef.current?.focus();
    return () => {
      document.body.classList.remove('modal-open');
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        aria-labelledby="support-options-dialog-title"
        aria-modal="true"
        className="details-dialog account-dialog support-options-dialog"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="details-header account-dialog-header">
          <div className="details-heading-copy">
            <p className="eyebrow">Optional support</p>
            <h2 id="support-options-dialog-title">Support Dragonfire Lab</h2>
          </div>
          <button
            aria-label="Close dialog"
            className="icon-button"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>
        <div className="account-dialog-body support-options-dialog-body">
          <p>
            Dragonfire Lab is free to use. Optional support helps cover hosting, ongoing dragon
            research, and continued development.
          </p>
          <div className="support-actions">
            <a className="primary-button support-link" href={supportLinks.buyMeACoffee} rel="noopener noreferrer" target="_blank">
              <Flame size={16} aria-hidden="true" /> Buy me a dragon <ExternalLink size={16} aria-hidden="true" />
            </a>
            <a className="secondary-button support-link" href={supportLinks.paypal} rel="noopener noreferrer" target="_blank">
              Support with PayPal <ExternalLink size={16} aria-hidden="true" />
            </a>
          </div>
          <p className="support-disclaimer">Optional support is not a tax-deductible charitable contribution.</p>
        </div>
      </div>
    </div>
  );
}
