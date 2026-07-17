import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = join(process.cwd(), 'supabase', 'migrations', '202607170001_create_user_rosters.sql');
const sql = readFileSync(migrationPath, 'utf8').toLowerCase();

describe('Supabase roster migration contract', () => {
  it('creates the constrained one-row roster table with RLS', () => {
    expect(sql).toContain('create table public.user_rosters');
    expect(sql).toContain('user_id uuid primary key references auth.users (id) on delete cascade');
    expect(sql).toContain('check (roster_schema_version > 0)');
    expect(sql).toContain("check (jsonb_typeof(roster) = 'array')");
    expect(sql).toContain('alter table public.user_rosters enable row level security');
    expect(sql).toContain('create trigger set_user_rosters_updated_at');
  });

  it('grants only authenticated read/write operations with owner-bound policies', () => {
    expect(sql).toContain('grant select, insert, update on table public.user_rosters to authenticated');
    expect(sql).toContain('revoke all on table public.user_rosters from public, anon');
    expect(sql).not.toMatch(/grant\s+[^;]*\bdelete\b/);
    expect(sql).not.toMatch(/grant\s+[^;]*\bto\s+anon\b/);
    expect(sql.match(/create policy/g)).toHaveLength(3);
    expect(sql).toMatch(/for select[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(sql).toMatch(/for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(sql).toMatch(/for update[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]*with check \(\(select auth\.uid\(\)\) = user_id\)/);
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
