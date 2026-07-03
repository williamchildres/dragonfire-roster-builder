import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalCss = readFileSync(join(__dirname, '..', 'styles', 'global.css'), 'utf8');

describe('formation card ability text wrap contract', () => {
  it('keeps raw ability text unbounded and non-scrolling', () => {
    const rawAbilityText = cssBlock('.raw-ability-text');

    expect(rawAbilityText).toContain('overflow: visible;');
    expect(rawAbilityText).toContain('overflow-wrap: anywhere;');
    expect(rawAbilityText).not.toMatch(/max-height\s*:/);
    expect(rawAbilityText).not.toMatch(/overflow-y\s*:\s*(auto|scroll)/);
  });

  it('does not force fixed height on command or trait panels', () => {
    expect(cssBlock('.command-panel')).not.toMatch(/min-height\s*:\s*8\.2rem;/);
    expect(cssBlock(".card-mini-section[aria-label='Trait status']")).not.toMatch(/min-height\s*:\s*8\.2rem;/);
  });
});

function cssBlock(selector: string): string {
  const pattern = new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = globalCss.match(pattern);

  if (!match) {
    throw new Error(`Missing CSS block for ${selector}`);
  }

  return match[1]!;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
