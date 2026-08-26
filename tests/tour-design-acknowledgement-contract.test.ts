import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pagePath = new URL('../components/tour-design/TourDesignPage.tsx', import.meta.url);
const repositoryPath = new URL('../lib/tour-design/tour-design-repository.ts', import.meta.url);

test('Tour Design acknowledgement does not use browser auto-sync and is conditional in the repository', () => {
  const page = readFileSync(pagePath, 'utf8');
  const acknowledgementStart = page.indexOf('const persistTourDesignAck = useCallback');
  const acknowledgementEnd = page.indexOf('const openLeadSession = useCallback', acknowledgementStart);
  const acknowledgement = page.slice(acknowledgementStart, acknowledgementEnd);
  const repository = readFileSync(repositoryPath, 'utf8');

  assert.match(acknowledgement, /if \(!canWrite\) return;/);
  assert.match(acknowledgement, /fetch\('\/api\/tour-design\/acknowledgements'/);
  assert.doesNotMatch(acknowledgement, /persistCustomerRowsNow|scheduleAutoSync|ackTourDesignLead\(/);
  assert.ok(acknowledgement.indexOf('updateLead') > acknowledgement.indexOf('await fetch'));

  assert.match(repository, /\.eq\('needs_tour_design', true\)/);
  assert.match(repository, /\.eq\('tour_design_acked', false\)/);
  assert.match(repository, /\.eq\('stage', 'Pending'\)/);
});
