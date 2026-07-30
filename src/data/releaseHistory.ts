import changelogText from '../../CHANGELOG.md?raw';
import { releaseMetadata } from './databaseMetadata';

export type ReleaseEntry = {
  version: string;
  date: string;
  items: string[];
};

const releaseHeading = /^## (\d+\.\d+\.\d+) - (\d{4}-\d{2}-\d{2})$/;

export function parseReleaseHistory(source: string): ReleaseEntry[] {
  const releases: ReleaseEntry[] = [];
  let current: ReleaseEntry | null = null;

  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('## ')) {
      const match = releaseHeading.exec(line);
      if (!match) {
        throw new Error(`Malformed CHANGELOG release heading: ${line}`);
      }
      const release = { version: match[1]!, date: match[2]!, items: [] };
      current = release;
      releases.push(release);
      continue;
    }

    if (current && line.startsWith('- ')) {
      current.items.push(line.slice(2).trim());
      continue;
    }

    if (current && current.items.length > 0 && /^\s{2,}\S/.test(line)) {
      const lastIndex = current.items.length - 1;
      current.items[lastIndex] = `${current.items[lastIndex]} ${line.trim()}`;
    }
  }

  if (releases.length === 0) {
    throw new Error('CHANGELOG.md did not contain any release headings.');
  }
  if (releases.some((release) => release.items.length === 0)) {
    const version = releases.find((release) => release.items.length === 0)?.version;
    throw new Error(`CHANGELOG release ${version} does not contain any top-level bullet items.`);
  }

  return releases;
}

export function validateLatestRelease(
  releases: readonly ReleaseEntry[],
  expected: { version: string; date: string },
): void {
  const latest = releases[0];
  if (!latest || latest.version !== expected.version || latest.date !== expected.date) {
    throw new Error(
      `Latest CHANGELOG release must be ${expected.version} - ${expected.date}; found ${latest?.version ?? 'none'} - ${latest?.date ?? 'none'}.`,
    );
  }
}

export const releaseHistory = parseReleaseHistory(changelogText);

validateLatestRelease(releaseHistory, {
  version: releaseMetadata.version,
  date: releaseMetadata.date,
});
