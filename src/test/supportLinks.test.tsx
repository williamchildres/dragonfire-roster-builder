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

  it('offers compact feedback and support-options links outside About without adding a route', () => {
    render(<App />);

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Feedback & support' })).toHaveAttribute('href', supportLinks.emailHref);
    expect(within(footer).getByRole('link', { name: 'Support options' })).toHaveAttribute('href', '/about');
    expect(within(footer).queryByRole('link', { name: /support the project/i })).not.toBeInTheDocument();
    expect(Object.values(routePaths)).toEqual(['/overview', '/roster', '/formations', '/optimizer', '/about', '/updates']);
  });
});
