import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isTravelDateNotPast,
  isValidEmail,
  isValidPhone,
  sanitizePhoneInput,
  todayIsoLocal,
} from '../lib/customers/customer-validation';
import { isKnownNationality } from '../lib/customers/nationalities';
import { isKnownCountry } from '../lib/customers/countries';
import { DURATION_PRESETS, formatDurationLabel } from '../lib/tour-design/tour-durations';

describe('customer-validation', () => {
  it('accepts normal emails and rejects junk', () => {
    assert.equal(isValidEmail('a@b.co'), true);
    assert.equal(isValidEmail('james.miller@example.com'), true);
    assert.equal(isValidEmail('not-an-email'), false);
    assert.equal(isValidEmail('a@b'), false);
    assert.equal(isValidEmail('a b@c.com'), false);
  });

  it('validates phone numbers', () => {
    assert.equal(isValidPhone(''), true);
    assert.equal(isValidPhone('+1 415 555 0100'), true);
    assert.equal(isValidPhone('(415) 555-0100'), true);
    assert.equal(isValidPhone('abc'), false);
    assert.equal(isValidPhone('12'), false);
  });

  it('sanitizes phone input', () => {
    assert.equal(sanitizePhoneInput('+1abc415'), '+1415');
    assert.equal(sanitizePhoneInput('++1'), '+1');
  });

  it('blocks past travel dates', () => {
    const now = new Date('2026-07-31T12:00:00');
    assert.equal(isTravelDateNotPast('2026-07-31', now), true);
    assert.equal(isTravelDateNotPast('2026-08-01', now), true);
    assert.equal(isTravelDateNotPast('2026-07-30', now), false);
    assert.equal(isTravelDateNotPast('', now), true);
    assert.equal(todayIsoLocal(now), '2026-07-31');
  });
});

describe('geo lists', () => {
  it('knows nationalities and countries', () => {
    assert.equal(isKnownNationality('French'), true);
    assert.equal(isKnownNationality('french'), true);
    assert.equal(isKnownNationality('Martian'), false);
    assert.equal(isKnownNationality(''), true);
    assert.equal(isKnownCountry('USA'), true);
    assert.equal(isKnownCountry('Australia'), true);
    assert.equal(isKnownCountry('Narnia'), false);
  });
});

describe('tour-durations', () => {
  it('builds 2–30 day presets', () => {
    assert.equal(DURATION_PRESETS[0], '2 Days 1 Night');
    assert.equal(DURATION_PRESETS[DURATION_PRESETS.length - 1], '30 Days 29 Nights');
    assert.equal(DURATION_PRESETS.length, 29);
    assert.equal(formatDurationLabel(7), '7 Days 6 Nights');
  });
});
