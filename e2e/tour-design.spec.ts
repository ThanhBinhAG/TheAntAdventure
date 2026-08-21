import { expect, test } from '@playwright/test';
import { assertRow, browserJson, login, newId, readE2eState } from './support';

test.describe.serial('Tour Design transaction acceptance', () => {
  test('successful save commits a draft and full outline; failed replacement rolls back both', async ({ page }) => {
    const state = await readE2eState();
    const draftId = `${state.prefix}-DRAFT`;
    await login(page, state.admin);
    const draft = { id: draftId, leadId: state.leadId, custId: state.customerId, briefJson: { source: 'e2e' }, outlineStatus: 'draft', outlineNotes: 'committed outline', outlineRevision: 1, selectedCodes: [], markupPct: 30, clientType: 'b2c', currentStep: 1 };
    const outlineDays = [
      { id: newId(), draftId, dayNumber: 1, date: '2026-09-01', location: 'Hanoi', activities: 'Arrival', hotels: '', sortOrder: 1 },
      { id: newId(), draftId, dayNumber: 2, date: '2026-09-02', location: 'Ha Long', activities: 'Cruise', hotels: '', sortOrder: 2 },
    ];
    expect((await browserJson(page, '/api/tour-design/save', { method: 'POST', body: { draft, outlineDays } })).status).toBe(200);
    expect((await assertRow('tour_drafts', 'id', draftId))?.outline_notes).toBe('committed outline');

    const failedDraft = { ...draft, outlineNotes: 'must-not-commit', outlineRevision: 2 };
    const duplicateDays = [
      { ...outlineDays[0], id: newId(), activities: 'must-not-commit' },
      { ...outlineDays[1], id: newId(), dayNumber: 1, activities: 'duplicate' },
    ];
    expect((await browserJson(page, '/api/tour-design/save', { method: 'POST', body: { draft: failedDraft, outlineDays: duplicateDays } })).status).toBe(500);
    expect((await assertRow('tour_drafts', 'id', draftId))?.outline_notes).toBe('committed outline');
    const rows = await browserJson(page, '/api/tour-design/outlines/all');
    expect(rows.status).toBe(200);
    expect(JSON.stringify(rows.body)).toContain('Arrival');
    expect(JSON.stringify(rows.body)).not.toContain('must-not-commit');
  });
});
