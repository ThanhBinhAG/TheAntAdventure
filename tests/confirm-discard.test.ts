import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultFormSerialize } from '../hooks/useConfirmClose';

describe('defaultFormSerialize', () => {
  it('serializes objects deterministically', () => {
    assert.equal(defaultFormSerialize({ a: 1, b: 'x' }), '{"a":1,"b":"x"}');
  });

  it('detects value changes via string compare', () => {
    const before = defaultFormSerialize({ name: 'A' });
    const after = defaultFormSerialize({ name: 'B' });
    assert.notEqual(before, after);
  });
});

describe('confirmDiscardChanges copy', () => {
  it('exports Vietnamese message keys in common i18n', async () => {
    const { COMMON } = await import('../lib/i18n/common');
    assert.match(COMMON.vi.unsavedChangesMessage, /chưa được lưu/);
    assert.match(COMMON.en.unsavedChangesMessage, /unsaved changes/i);
    assert.equal(COMMON.vi.unsavedChangesStay, 'Ở lại');
    assert.equal(COMMON.vi.unsavedChangesLeave, 'Thoát');
  });
});
