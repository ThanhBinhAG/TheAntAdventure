import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Dev Notes page uses CRM BFF instead of browser hydrate', () => {
  const page = source('components/dev-notes/DevNotesPage.tsx');
  const hook = source('hooks/useDevNotesPage.ts');
  const createHook = source('hooks/useCreateDevNote.ts');
  const updateHook = source('hooks/useUpdateDevNote.ts');
  const deleteHook = source('hooks/useDeleteDevNote.ts');

  assert.match(page, /useDevNotesPage/);
  assert.match(page, /usePagePermission\('devnotes'\)/);
  assert.match(page, /useCreateDevNote/);
  assert.match(page, /useUpdateDevNote/);
  assert.match(page, /useDeleteDevNote/);
  assert.match(page, /DevNoteEditModal/);
  assert.doesNotMatch(page, /useStore\(\(s\) => s\.devNotes\)/);
  assert.doesNotMatch(page, /lib\/supabase\/client/);

  assert.match(hook, /getBffArray/);
  assert.match(hook, /\/api\/dev-notes/);
  assert.match(hook, /withoutAutoSyncAsync/);
  assert.match(createHook, /\/api\/dev-notes/);
  assert.match(updateHook, /\/api\/dev-notes\//);
  assert.match(deleteHook, /DELETE/);
  assert.match(deleteHook, /\/api\/dev-notes\//);
});

test('Dev Notes API routes enforce devnotes.read / devnotes.write', () => {
  const listRoute = source('app/api/dev-notes/route.ts');
  const patchRoute = source('app/api/dev-notes/[id]/route.ts');
  assert.match(listRoute, /requiredPermission: 'devnotes\.read'/);
  assert.match(listRoute, /requiredPermission: 'devnotes\.write'/);
  assert.match(patchRoute, /requiredPermission: 'devnotes\.write'/);
  assert.match(patchRoute, /export async function DELETE/);
  assert.match(source('lib/dev-notes/dev-notes-repository.ts'), /deleteDevNoteServer/);
});

test('dev-notes-bff tables are BFF-managed', () => {
  assert.equal(BFF_MANAGED_TABLES.has('dev_notes'), true);
});

