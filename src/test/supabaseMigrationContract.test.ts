import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDirectory = join(process.cwd(), 'supabase', 'migrations');
const migrationOnePath = join(migrationsDirectory, '202607170001_create_user_rosters.sql');
const migrationTwoPath = join(migrationsDirectory, '202607170002_restrict_user_roster_privileges.sql');
const migrationOneSql = readFileSync(migrationOnePath, 'utf8').toLowerCase();
const migrationTwoSql = readFileSync(migrationTwoPath, 'utf8').toLowerCase();

describe('Supabase roster migration contract', () => {
  it('creates the constrained one-row roster table with RLS', () => {
    expect(migrationOneSql).toContain('create table public.user_rosters');
    expect(migrationOneSql).toContain('user_id uuid primary key references auth.users (id) on delete cascade');
    expect(migrationOneSql).toContain('check (roster_schema_version > 0)');
    expect(migrationOneSql).toContain("check (jsonb_typeof(roster) = 'array')");
    expect(migrationOneSql).toContain('alter table public.user_rosters enable row level security');
    expect(migrationOneSql).toContain('create trigger set_user_rosters_updated_at');
  });

  it('normalizes final privileges to authenticated select, insert, and update only', () => {
    expect(migrationTwoSql).toMatch(/revoke all privileges\s+on table public\.user_rosters\s+from public, anon, authenticated/);
    expect(migrationTwoSql).toMatch(/grant select, insert, update\s+on table public\.user_rosters\s+to authenticated/);
    expect(migrationTwoSql).not.toMatch(/grant\s+[^;]*\bdelete\b/);
    expect(migrationTwoSql).not.toMatch(/grant\s+[^;]*\bto\s+anon\b/);
    expect(migrationTwoSql).not.toMatch(/create\s+policy[\s\S]*\bdelete\b/);
    expect(migrationOneSql.match(/create policy/g)).toHaveLength(3);
    expect(migrationOneSql).toMatch(/for select[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(migrationOneSql).toMatch(/for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(migrationOneSql).toMatch(/for update[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]*with check \(\(select auth\.uid\(\)\) = user_id\)/);
  });

  it('contains no privileged browser credential reference in frontend source', () => {
    const frontend = readSourceTree(join(process.cwd(), 'src')).filter(([path]) => !path.includes(`${join('src', 'test')}`));
    const forbiddenName = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_');
    const forbiddenRole = ['service', 'role'].join('_');
    for (const [path, content] of frontend) {
      expect(content, path).not.toContain(forbiddenName);
      expect(content.toLowerCase(), path).not.toContain(forbiddenRole);
    }
  });
});

function readSourceTree(directory: string): Array<[string, string]> {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return readSourceTree(path);
    }
    return /\.(ts|tsx)$/.test(name) ? [[path, readFileSync(path, 'utf8')] as [string, string]] : [];
  });
}
