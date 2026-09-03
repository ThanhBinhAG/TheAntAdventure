import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapLeaveWithDraftChoice } from '../lib/confirm-leave-draft';

describe('confirmLeaveWithDraft copy', () => {
  it('exports Vietnamese and English leave-with-draft keys', async () => {
    const { COMMON } = await import('../lib/i18n/common');
    assert.match(COMMON.vi.leaveWithDraftMessage, /bản thảo/);
    assert.match(COMMON.en.leaveWithDraftMessage, /draft/i);
    assert.equal(COMMON.vi.leaveWithDraftStay, 'Ở lại');
    assert.equal(COMMON.vi.leaveWithDraftDiscard, 'Bỏ hết');
    assert.equal(COMMON.vi.leaveWithDraftSave, 'Lưu bản thảo rồi thoát');
    assert.match(COMMON.vi.formDraftRestored, /bản thảo/);
  });
});

describe('mapLeaveWithDraftChoice', () => {
  it('maps cancel / tertiary / confirm to stay / discard / saveDraft', () => {
    assert.equal(mapLeaveWithDraftChoice('cancel'), 'stay');
    assert.equal(mapLeaveWithDraftChoice('tertiary'), 'discard');
    assert.equal(mapLeaveWithDraftChoice('confirm'), 'saveDraft');
  });
});
