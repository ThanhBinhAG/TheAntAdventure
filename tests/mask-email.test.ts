import assert from 'node:assert/strict';
import test from 'node:test';
import { maskEmailForDisplay } from '../lib/auth/mask-email';

const STAR_MIN = 8;
const STAR_MAX = 14;

function starLen(masked: string, prefixLen: number): number {
  return masked.length - prefixLen;
}

test('maskEmailForDisplay keeps first 2 local-part chars and hides domain', () => {
  const a = maskEmailForDisplay('nv01@theantadventures.com');
  const b = maskEmailForDisplay('ab@example.com');
  assert.ok(a?.startsWith('nv'));
  assert.ok(b?.startsWith('ab'));
  assert.ok(!a?.includes('@'));
  assert.ok(!b?.includes('@'));
  assert.match(a!, /^nv\*+$/);
  assert.match(b!, /^ab\*+$/);
});

test('maskEmailForDisplay uses a mid-length star run (not too short / long)', () => {
  const samples = [
    'nv01@theantadventures.com',
    'ab@example.com',
    'sales.lead@company.org',
    'x@y.z',
  ];
  for (const email of samples) {
    const masked = maskEmailForDisplay(email)!;
    const keep = Math.min(2, email.split('@')[0]!.length);
    const n = starLen(masked, keep);
    assert.ok(n >= STAR_MIN && n <= STAR_MAX, `${email} → ${masked} (stars=${n})`);
  }
});

test('maskEmailForDisplay is stable for the same email', () => {
  const email = 'tn813@example.com';
  assert.equal(maskEmailForDisplay(email), maskEmailForDisplay(email));
  assert.equal(maskEmailForDisplay(email), maskEmailForDisplay('  TN813@example.com  '));
});

test('maskEmailForDisplay varies star length across different emails', () => {
  const lengths = new Set(
    [
      'alice@a.com',
      'bob@b.com',
      'carol@c.com',
      'dave@d.com',
      'erin@e.com',
      'frank@f.com',
      'grace@g.com',
      'heidi@h.com',
    ].map((e) => starLen(maskEmailForDisplay(e)!, 2)),
  );
  assert.ok(lengths.size >= 2, 'expected more than one star length across sample emails');
});

test('maskEmailForDisplay handles short local-part', () => {
  const one = maskEmailForDisplay('a@example.com');
  assert.ok(one?.startsWith('a'));
  assert.match(one!, /^a\*+$/);
  const xy = maskEmailForDisplay('xy');
  assert.equal(xy?.slice(0, 2), 'xy');
});

test('maskEmailForDisplay returns null for missing or empty input', () => {
  assert.equal(maskEmailForDisplay(null), null);
  assert.equal(maskEmailForDisplay(undefined), null);
  assert.equal(maskEmailForDisplay(''), null);
  assert.equal(maskEmailForDisplay('   '), null);
  assert.equal(maskEmailForDisplay('@nodomain.com'), null);
});
