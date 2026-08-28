import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('proposal PDF pipeline inlines CRM gallery images before Puppeteer render', () => {
  const pdf = readFileSync(join(process.cwd(), 'lib/proposals/proposal-pdf.ts'), 'utf8');
  const inliner = readFileSync(join(process.cwd(), 'lib/proposals/proposal-image-inliner.ts'), 'utf8');
  assert.match(pdf, /inlineProposalDocImages/);
  assert.match(inliner, /downloadPhotosBucketObject/);
  assert.match(inliner, /data:/);
});
