import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { databaseMetadata } from '../data/databaseMetadata';
import { parseReleaseHistory, releaseHistory, validateLatestRelease } from '../data/releaseHistory';

describe('release history parser', () => {
  it('represents every CHANGELOG version heading in source order', () => {
    const source = readFileSync('CHANGELOG.md', 'utf8');
    const headingCount = source.split(/\r?\n/).filter((line) => line.startsWith('## ')).length;
    expect(releaseHistory).toHaveLength(headingCount);
    expect(releaseHistory[0]).toMatchObject({
      version: databaseMetadata.databaseVersion,
      date: databaseMetadata.lastUpdated,
    });
    expect(releaseHistory.every((release) => release.items.length > 0)).toBe(true);
  });

  it('parses wrapped top-level bullets as text', () => {
    expect(parseReleaseHistory('## 1.2.3 - 2026-01-02\n\n- One line\n  continued here\n- Second')).toEqual([
      { version: '1.2.3', date: '2026-01-02', items: ['One line continued here', 'Second'] },
    ]);
  });

  it('fails clearly for missing, malformed, empty, and mismatched releases', () => {
    expect(() => parseReleaseHistory('# Changelog')).toThrow(/did not contain any release/i);
    expect(() => parseReleaseHistory('## upcoming\n- Item')).toThrow(/malformed changelog release heading/i);
    expect(() => parseReleaseHistory('## 1.2.3 - 2026-01-02')).toThrow(/does not contain any/i);
    expect(() => validateLatestRelease(
      [{ version: '1.2.3', date: '2026-01-02', items: ['Item'] }],
      { version: '2.0.0', date: '2026-02-01' },
    )).toThrow(/latest changelog release must be/i);
  });
});
