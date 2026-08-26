import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('components/tour-design/TourDesignPage.tsx', 'utf8');
const referenceHook = readFileSync('hooks/useTourDesignReferenceData.ts', 'utf8');

test('Outline workflow always sends a fresh form snapshot', () => {
  const snapshot = page.slice(
    page.indexOf('function currentDraftSnapshot()'),
    page.indexOf('async function runOutlineWorkflow'),
  );

  assert.doesNotMatch(snapshot, /getTourDraftForLead\(/);
  assert.match(snapshot, /saveRevision:\s*saveQueueRef\.current\.getSaveRevision\(tourDraftIdForLead\(leadId\)\)/);
});

test('Hotel reference data is loaded only at Export step', () => {
  assert.match(page, /useTourDesignReferenceData\(step === 4\)/);
  assert.match(referenceHook, /if \(!enabled\) return;/);
});
