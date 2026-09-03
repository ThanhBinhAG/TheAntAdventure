import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Dev A screens expose loading failures and update local state only after successful API responses', () => {
  const planner = source('components/planner/PlannerPage.tsx');
  const attractions = source('components/pages/Attractions.tsx');
  const tourDesign = source('components/tour-design/TourDesignPage.tsx');

  for (const page of [planner, attractions]) {
    assert.match(page, /const \[loadError, setLoadError\] = useState/);
    assert.match(page, /role="alert"/);
    assert.match(page, /getBffArray/);
  }
  assert.ok(planner.indexOf('addTask(newTask') > planner.indexOf('if (!json.ok)'));
  assert.ok(planner.indexOf('updateTask(id, { status })') > planner.indexOf('if (!json.ok)'));
  assert.ok(planner.indexOf('removeTask(id)') > planner.indexOf("method: 'DELETE'"));
  assert.ok(attractions.indexOf('addAttraction(payload)') > attractions.indexOf('if (!json.ok)'));
  assert.ok(attractions.indexOf('updateAttraction(payload.id, payload)') > attractions.indexOf('if (!json.ok)'));

  const persistStart = tourDesign.indexOf('const persistDraft = useCallback');
  const persistEnd = tourDesign.indexOf('const persistTourDesignAck', persistStart);
  const persistDraft = tourDesign.slice(persistStart, persistEnd);
  assert.match(tourDesign, /setSaveState\(saved \? 'saved' : 'error'\)/);
  assert.match(tourDesign, /TourDraftSaveQueue/);
  assert.match(persistDraft, /onLatestSuccess/);
  assert.ok(persistDraft.indexOf('upsertTourDraft({ ...draft, saveRevision })') > persistDraft.indexOf("await fetch('/api/tour-design/save'"));
});
