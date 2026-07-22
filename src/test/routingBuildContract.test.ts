import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('routing build contract', () => {
  it('ships matching index and GitHub Pages fallback entries with root-relative source assets', () => {
    const index = readFileSync('index.html', 'utf8');
    const fallback = readFileSync('404.html', 'utf8');
    for (const html of [index, fallback]) {
      expect(html).toContain('src="/src/main.tsx"');
      expect(html).toContain('href="https://dragonfirelab.com/overview"');
      expect(html).not.toContain('local-first unofficial');
    }
  });
});
