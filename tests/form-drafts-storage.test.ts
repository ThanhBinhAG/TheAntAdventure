import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  clearFormDraft,
  createFormDraftId,
  formDraftStorageKey,
  listFormDrafts,
  migrateLegacyAddDraft,
  readFormDraft,
  writeFormDraft,
} from '../lib/form-drafts/storage';

describe('formDraftStorageKey', () => {
  it('uses explicit ids for add and edit', () => {
    assert.equal(
      formDraftStorageKey('customers', 'add', 'd-abc'),
      'crm.formDraft.customers.add.d-abc',
    );
    assert.equal(
      formDraftStorageKey('customers', 'edit', 'CUS-001'),
      'crm.formDraft.customers.edit.CUS-001',
    );
  });
});

describe('form draft storage', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
        key: (index: number) => Array.from(memory.keys())[index] ?? null,
        get length() {
          return memory.size;
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('writes and reads an envelope with label', () => {
    const id = createFormDraftId();
    writeFormDraft(
      'customers',
      'add',
      id,
      { form: { name: 'Ada' }, logInquiry: false },
      'Ada',
    );
    const draft = readFormDraft<{ form: { name: string }; logInquiry: boolean }>(
      'customers',
      'add',
      id,
    );
    assert.ok(draft);
    assert.equal(draft.version, 1);
    assert.equal(draft.payload.form.name, 'Ada');
    assert.equal(draft.label, 'Ada');
  });

  it('lists multiple add drafts newest first', () => {
    writeFormDraft('customers', 'add', 'd-1', { name: 'A' }, 'A');
    // Ensure distinct updatedAt
    const older = memory.get('crm.formDraft.customers.add.d-1')!;
    memory.set(
      'crm.formDraft.customers.add.d-1',
      older.replace(/"updatedAt":"[^"]+"/, '"updatedAt":"2020-01-01T00:00:00.000Z"'),
    );
    writeFormDraft('customers', 'add', 'd-2', { name: 'B' }, 'B');
    writeFormDraft('customers', 'edit', 'CUS-9', { name: 'EditMe' }, 'EditMe');

    const list = listFormDrafts('customers');
    assert.equal(list.length, 3);
    assert.equal(list[0].id, 'd-2');
    assert.equal(list.some((d) => d.mode === 'edit' && d.id === 'CUS-9'), true);
  });

  it('migrates legacy add.new into a unique draft', () => {
    memory.set(
      'crm.formDraft.customers.add.new',
      JSON.stringify({
        version: 1,
        updatedAt: '2024-01-01T00:00:00.000Z',
        payload: { form: { name: 'Legacy' }, logInquiry: true },
        label: 'Legacy',
      }),
    );
    const id = migrateLegacyAddDraft('customers');
    assert.ok(id);
    assert.equal(memory.has('crm.formDraft.customers.add.new'), false);
    assert.ok(memory.has(`crm.formDraft.customers.add.${id}`));
    const listed = listFormDrafts('customers');
    assert.equal(listed.length, 1);
    assert.equal(listed[0].label, 'Legacy');
  });

  it('clears a draft', () => {
    writeFormDraft('agents', 'edit', 'AGT-002', { name: 'Partner' }, 'Partner');
    clearFormDraft('agents', 'edit', 'AGT-002');
    assert.equal(readFormDraft('agents', 'edit', 'AGT-002'), null);
  });

  it('returns null for corrupt JSON', () => {
    memory.set('crm.formDraft.customers.add.d-x', '{not-json');
    assert.equal(readFormDraft('customers', 'add', 'd-x'), null);
  });
});
