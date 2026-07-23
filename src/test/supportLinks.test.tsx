import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { routePaths } from '../app/appRouter';
import { supportLinks } from '../data/supportLinks';

describe('support and feedback links', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('renders centralized feedback and optional-support links on About', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: 'About' }));

    expect(screen.getByText(supportLinks.email)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email Dragonfire Lab support' })).toHaveAttribute('href', supportLinks.emailHref);

    const buyMeADragon = screen.getByRole('link', { name: /buy me a dragon/i });
    expect(buyMeADragon).toHaveAttribute('href', supportLinks.buyMeACoffee);
    expect(buyMeADragon).toHaveAttribute('target', '_blank');
    expect(buyMeADragon).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(buyMeADragon).toHaveAttribute('rel', expect.stringContaining('noreferrer'));

    const paypal = screen.getByRole('link', { name: /support with paypal/i });
    expect(paypal).toHaveAttribute('href', supportLinks.paypal);
    expect(paypal).toHaveAttribute('target', '_blank');
    expect(paypal).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(paypal).toHaveAttribute('rel', expect.stringContaining('noreferrer'));

    const supportPanel = screen.getByRole('heading', { name: 'Support Dragonfire Lab' }).closest('section');
    expect(supportPanel).toHaveTextContent('Optional support is not a tax-deductible charitable contribution.');
    expect(supportPanel).not.toHaveTextContent(/charitable donation|nonprofit|\bcharity\b/i);
  });

  it('opens support options in a dialog without changing the route and restores focus after Escape', async () => {
    const user = userEvent.setup();
    render(<App />);

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Feedback & support' })).toHaveAttribute('href', supportLinks.emailHref);
    const supportOptions = within(footer).getByRole('button', { name: 'Support options' });
    expect(supportOptions).toHaveAttribute('type', 'button');
    expect(supportOptions).toHaveAttribute('aria-haspopup', 'dialog');
    expect(supportOptions).toHaveAttribute('aria-expanded', 'false');
    expect(within(footer).queryByRole('link', { name: 'Support options' })).not.toBeInTheDocument();
    expect(within(footer).queryByRole('link', { name: /support the project/i })).not.toBeInTheDocument();
    const pathname = window.location.pathname;

    await user.click(supportOptions);

    const dialog = screen.getByRole('dialog', { name: 'Support Dragonfire Lab' });
    expect(window.location.pathname).toBe(pathname);
    expect(supportOptions).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getByRole('button', { name: 'Close dialog' })).toHaveFocus();

    const buyMeADragon = within(dialog).getByRole('link', { name: /buy me a dragon/i });
    expect(buyMeADragon).toHaveAttribute('href', supportLinks.buyMeACoffee);
    expect(buyMeADragon).toHaveAttribute('target', '_blank');
    expect(buyMeADragon).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(buyMeADragon).toHaveAttribute('rel', expect.stringContaining('noreferrer'));

    const paypal = within(dialog).getByRole('link', { name: /support with paypal/i });
    expect(paypal).toHaveAttribute('href', supportLinks.paypal);
    expect(paypal).toHaveAttribute('target', '_blank');
    expect(paypal).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(paypal).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    expect(dialog).toHaveTextContent('Optional support is not a tax-deductible charitable contribution.');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Support Dragonfire Lab' })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe(pathname);
    expect(supportOptions).toHaveFocus();
    expect(Object.values(routePaths)).toEqual(['/overview', '/roster', '/formations', '/optimizer', '/about', '/updates']);
  });

  it('closes the support-options dialog with its Close button', async () => {
    const user = userEvent.setup();
    render(<App />);

    const supportOptions = within(screen.getByRole('contentinfo')).getByRole('button', { name: 'Support options' });
    await user.click(supportOptions);
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(screen.queryByRole('dialog', { name: 'Support Dragonfire Lab' })).not.toBeInTheDocument();
    expect(supportOptions).toHaveFocus();
  });
});
