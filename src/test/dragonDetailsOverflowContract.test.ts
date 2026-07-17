/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalCss = readFileSync(join(__dirname, '..', 'styles', 'global.css'), 'utf8');

describe('FRR-F005 Dragon Details descendant wrapping contract', () => {
  it('allows reusable Details descendants to shrink within their boxes', () => {
    const shrinkRule = cssBlock('.details-dialog :where');

    expect(globalCss).toMatch(
      /\.details-dialog :where\([\s\S]*?\.ability-card-title[\s\S]*?\.ability-technical-disclosure[\s\S]*?\.technical-disclosure[\s\S]*?\.chip-list[\s\S]*?\)\s*\{/,
    );
    expect(shrinkRule).toContain('min-width: 0;');
  });

  it('wraps long Details headings, technical labels, and chips without clipping', () => {
    expect(globalCss).toMatch(
      /\.details-dialog :where\(h2, h3, h4, p, li, summary, dt, dd, a, strong\)[\s\S]*?overflow-wrap: anywhere;[\s\S]*?word-break: break-word;/,
    );
    expect(globalCss).toMatch(/\.details-dialog \.chip\s*\{\s*white-space: normal;\s*\}/);
    expect(globalCss).not.toMatch(/\.details-dialog \.chip\s*\{[^}]*overflow\s*:\s*hidden/);
  });
});

function cssBlock(selector: string): string {
  const pattern = new RegExp(`${escapeRegExp(selector)}[\\s\\S]*?\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = globalCss.match(pattern);
  if (!match) throw new Error(`Missing CSS block for ${selector}`);
  return match[1]!;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
