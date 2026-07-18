import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HeaderAccountAction } from '../app/AccountUi';
import { accountDisplayName } from '../app/accountSyncPresentation';

const session = { userId: 'user-1', email: 'williamrchildres@gmail.com' };

function renderAction(status: Parameters<typeof HeaderAccountAction>[0]['status'], email = session.email) {
  const onOpenAccount = vi.fn();
  const onOpenSignIn = vi.fn();
  render(
    <HeaderAccountAction
      session={{ ...session, email }}
      sessionLoading={false}
      status={status}
      onOpenAccount={onOpenAccount}
      onOpenSignIn={onOpenSignIn}
    />,
  );
  return { onOpenAccount, onOpenSignIn };
}

describe('HeaderAccountAction', () => {
  it('shows only a capped local-part display name while retaining the complete email accessibly', () => {
    renderAction('synced');
    const account = screen.getByRole('button', { name: 'Account for williamrchildres@gmail.com, roster synchronized' });
    expect(account).toHaveTextContent('williamrchildres');
    expect(account).not.toHaveTextContent('@gmail.com');
    expect(screen.getByTitle('williamrchildres@gmail.com')).toBeInTheDocument();
    expect(account.querySelector('.lucide-user-round')).toBeInTheDocument();
  });

  it('uses a deterministic sixteen-character local-part cap and handles unexpected email text defensively', () => {
    expect(accountDisplayName('verylongusernamefortheheader@example.com')).toBe('verylongusernam…');
    expect(accountDisplayName('short@example.com')).toBe('short');
    expect(accountDisplayName('unexpected-value')).toBe('unexpected-value');
    expect(accountDisplayName('')).toBe('Account');
  });

  it.each([
    ['loading-cloud', 'loading account roster'],
    ['syncing', 'roster syncing'],
  ] as const)('uses a spinning loading indicator for %s', (status, description) => {
    renderAction(status);
    const account = screen.getByRole('button', { name: `Account for ${session.email}, ${description}` });
    expect(account.querySelector('.lucide-loader-circle')).toHaveClass('is-spinning');
    expect(account).toHaveTextContent('Account');
    expect(account).not.toHaveTextContent('Syncing');
  });

  it.each([
    ['conflict', 'lucide-circle-alert'],
    ['error', 'lucide-circle-alert'],
    ['offline', 'lucide-cloud-off'],
  ] as const)('uses an attention icon and accessible status for %s', (status, iconClass) => {
    renderAction(status);
    const account = screen.getByRole('button', { name: `Account for ${session.email}, roster synchronization needs attention` });
    expect(account.querySelector(`.${iconClass}`)).toBeInTheDocument();
    expect(account.querySelector('.is-spinning')).not.toBeInTheDocument();
  });

  it('keeps the same Account action and signed-out Sign in action', async () => {
    const user = userEvent.setup();
    const { onOpenAccount } = renderAction('synced');
    await user.click(screen.getByRole('button', { name: /Account for williamrchildres@gmail.com/i }));
    expect(onOpenAccount).toHaveBeenCalledOnce();

    const onOpenSignIn = vi.fn();
    render(
      <HeaderAccountAction
        session={null}
        sessionLoading={false}
        status="local-only"
        onOpenAccount={() => undefined}
        onOpenSignIn={onOpenSignIn}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onOpenSignIn).toHaveBeenCalledOnce();
  });
});
