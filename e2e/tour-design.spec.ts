import { expect, test } from '@playwright/test';
import { assertRow, browserJson, login, newId, readE2eState } from './support';

test.describe.serial('Tour Design transaction acceptance', () => {
  test('versioned saves keep the newest draft and roll back a failed outline replacement', async ({ page }) => {
    const state = await readE2eState();
    const draftId = `${state.prefix}-DRAFT`;
    await login(page, state.admin);
    // Content saves intentionally reject outline workflow/status fields. Those
    // are owned by the dedicated outline-workflow endpoint.
    const draft = { id: draftId, leadId: state.leadId, custId: state.customerId, briefJson: { source: 'e2e' }, outlineNotes: 'committed outline', selectedCodes: [], markupPct: 30, clientType: 'b2c', currentStep: 1 };
    const outlineDays = [
      { id: newId(), draftId, dayNumber: 1, date: '2026-09-01', location: 'Hanoi', activities: 'Arrival', hotels: '', sortOrder: 1 },
      { id: newId(), draftId, dayNumber: 2, date: '2026-09-02', location: 'Ha Long', activities: 'Cruise', hotels: '', sortOrder: 2 },
    ];

    const concurrentFirstSaves = await Promise.all([
      browserJson(page, '/api/tour-design/save', {
        method: 'POST',
        body: { draft, outlineDays, expectedSaveRevision: 0 },
      }),
      browserJson(page, '/api/tour-design/save', {
        method: 'POST',
        body: { draft, outlineDays, expectedSaveRevision: 0 },
      }),
    ]);
    expect(concurrentFirstSaves.map((result) => result.status).sort()).toEqual([200, 409]);
    expect((await assertRow('tour_drafts', 'id', draftId))?.outline_notes).toBe('committed outline');

    const newestDraft = { ...draft, outlineNotes: 'newest outline' };
    const newestOutlineDays = outlineDays.map((day, index) => ({
      ...day,
      id: newId(),
      activities: index === 0 ? 'Newest arrival' : 'Newest cruise',
    }));
    const newestSave = await browserJson(page, '/api/tour-design/save', {
      method: 'POST',
      body: { draft: newestDraft, outlineDays: newestOutlineDays, expectedSaveRevision: 1 },
    });
    expect(newestSave.status).toBe(200);
    expect((newestSave.body as { data: { saveRevision: number } }).data.saveRevision).toBe(2);

    const lateOlderSave = await browserJson(page, '/api/tour-design/save', {
      method: 'POST',
      body: { draft: { ...draft, outlineNotes: 'late older outline' }, outlineDays, expectedSaveRevision: 1 },
    });
    expect(lateOlderSave.status).toBe(409);
    expect((await assertRow('tour_drafts', 'id', draftId))?.outline_notes).toBe('newest outline');

    const failedDraft = { ...newestDraft, outlineNotes: 'must-not-commit' };
    const duplicateDays = [
      { ...newestOutlineDays[0], id: newId(), activities: 'must-not-commit' },
      { ...newestOutlineDays[1], id: newId(), dayNumber: 1, activities: 'duplicate' },
    ];
    expect((await browserJson(page, '/api/tour-design/save', {
      method: 'POST',
      body: { draft: failedDraft, outlineDays: duplicateDays, expectedSaveRevision: 2 },
    })).status).toBe(500);
    expect((await assertRow('tour_drafts', 'id', draftId))?.outline_notes).toBe('newest outline');
    const rows = await browserJson(page, `/api/tour-design/outlines?draftId=${encodeURIComponent(draftId)}`);
    expect(rows.status).toBe(200);
    expect(JSON.stringify(rows.body)).toContain('Newest arrival');
    expect(JSON.stringify(rows.body)).not.toContain('must-not-commit');
  });
});
