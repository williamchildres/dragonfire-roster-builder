/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalCss = readFileSync(join(__dirname, '..', 'styles', 'global.css'), 'utf8');

describe('mobile page scrolling contract', () => {
  it('keeps the header and Roster panes in normal page flow below the tablet breakpoint', () => {
    const mobileCss = mediaBlock('@media (max-width: 900px)');

    expect(cssBlock(mobileCss, '.site-header')).toContain('position: static;');

    const list = cssBlock(mobileCss, '.roster-list');
    expect(list).toContain('max-height: none;');
    expect(list).toContain('overflow-y: visible;');
    expect(list).toContain('overscroll-behavior: auto;');

    const editor = cssBlock(mobileCss, '.roster-editor-pane');
    expect(editor).toContain('height: auto;');
    expect(editor).toContain('max-height: none;');
    expect(editor).toContain('overflow: visible;');
    expect(editor).toContain('overscroll-behavior: auto;');
    expect(editor).toContain('position: static;');
  });
});

function mediaBlock(selector: string): string {
  const start = globalCss.indexOf(selector);
  if (start < 0) throw new Error(`Missing media block ${selector}`);

  const nextMedia = globalCss.indexOf('@media ', start + selector.length);
  return globalCss.slice(start, nextMedia < 0 ? undefined : nextMedia);
}

function cssBlock(css: string, selector: string): string {
  const pattern = new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = css.match(pattern);
  if (!match) throw new Error(`Missing CSS block for ${selector}`);
  return match[1]!;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}
