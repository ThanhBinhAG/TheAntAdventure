import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activityCodeToken,
  buildProductCode,
  deriveDestinationOptions,
  durationCodeToken,
  filterDestinationSuggestions,
  formatCodeBreakdown,
  isServiceOnlyDestination,
  nextSequence,
  parseProductCode,
  resolveDestCode,
  suggestTypeSegment,
} from '../lib/products/product-code';

const existingHanHd = ['AA-NV-HAN-HD-01', 'AA-NV-HAN-HD-02', 'AA-NV-HAN-TRF-01'];

test('durationCodeToken maps portfolio durations', () => {
  assert.equal(durationCodeToken('Half Day'), 'HD');
  assert.equal(durationCodeToken('Full Day'), 'FD');
  assert.equal(durationCodeToken('Evening (3–4 hours)'), 'EVE');
  assert.equal(durationCodeToken('2 Days 1 Night'), '2D1N');
});

test('activityCodeToken maps Excel activity prefixes', () => {
  assert.equal(activityCodeToken('Culinary'), 'CULI');
  assert.equal(activityCodeToken('Cultural'), 'CT');
  assert.equal(activityCodeToken('Boat / River'), 'BOA');
  assert.equal(activityCodeToken('Transfer'), 'TRF');
  assert.equal(activityCodeToken('Experience'), null);
});

test('suggestTypeSegment: Excel culinary evening', () => {
  assert.equal(suggestTypeSegment('south', 'Evening (3–4 hours)', 'Culinary'), 'CULI-EVE');
});

test('suggestTypeSegment: Excel boat evening', () => {
  assert.equal(suggestTypeSegment('south', 'Evening (2–3 hours)', 'Boat'), 'BOA-EVE');
});

test('suggestTypeSegment: Excel city tour full day', () => {
  assert.equal(suggestTypeSegment('south', 'Full Day', 'Cultural'), 'CT-FD');
});

test('suggestTypeSegment: duration-only half day (Experience)', () => {
  assert.equal(suggestTypeSegment('south', 'Half Day', 'Experience'), 'HD');
});

test('suggestTypeSegment: half day transfer', () => {
  assert.equal(suggestTypeSegment('north', 'Half Day', 'Transfer'), 'TRF');
});

test('suggestTypeSegment: services visa', () => {
  assert.equal(suggestTypeSegment('services', 'Service', 'Visa'), 'SVC-VOA');
});

test('suggestTypeSegment: services transfer', () => {
  assert.equal(suggestTypeSegment('services', 'Service', 'Transfer'), 'SGN-HD');
});

test('suggestTypeSegment: cruise 2D1N', () => {
  assert.equal(suggestTypeSegment('north', '2 Days 1 Night', 'Nature & Cruise'), 'CRU-2D1N');
});

test('resolveDestCode maps catalog labels', () => {
  assert.equal(resolveDestCode('Hanoi'), 'HAN');
  assert.equal(resolveDestCode('Halong Bay'), 'HAL');
  assert.equal(resolveDestCode('Ho Chi Minh City'), 'SGN');
  assert.equal(resolveDestCode('Unknown Place'), null);
});

test('nextSequence increments from existing codes', () => {
  assert.equal(nextSequence('AA-NV-HAN-HD', existingHanHd), '03');
});

test('buildProductCode assigns next sequence for tour', () => {
  const code = buildProductCode(
    { region: 'north', dest: 'Hanoi', dur: 'Half Day', cat: 'Experience' },
    existingHanHd
  );
  assert.equal(code, 'AA-NV-HAN-HD-03');
});

test('buildProductCode Excel south culinary evening', () => {
  const code = buildProductCode(
    {
      region: 'south',
      dest: 'Ho Chi Minh City',
      dur: 'Evening (3–4 hours)',
      cat: 'Culinary',
    },
    []
  );
  assert.equal(code, 'AA-SV-SGN-CULI-EVE-01');
});

test('buildProductCode Excel south city full day', () => {
  const code = buildProductCode(
    { region: 'south', dest: 'Ho Chi Minh City', dur: 'Full Day', cat: 'Cultural' },
    ['AA-SV-SGN-CT-FD-01']
  );
  assert.equal(code, 'AA-SV-SGN-CT-FD-02');
});

test('buildProductCode for transfer half day', () => {
  const code = buildProductCode(
    { region: 'north', dest: 'Hanoi', dur: 'Half Day', cat: 'Transfer', typeSegment: 'TRF' },
    ['AA-NV-HAN-TRF-01']
  );
  assert.equal(code, 'AA-NV-HAN-TRF-02');
});

test('buildProductCode for services visa', () => {
  const code = buildProductCode(
    { region: 'services', dest: 'All Vietnam', dur: 'Service', cat: 'Visa' },
    ['SV-SVC-VOA-01']
  );
  assert.equal(code, 'SV-SVC-VOA-02');
});

test('buildProductCode throws when tour destination unknown', () => {
  assert.throws(
    () =>
      buildProductCode(
        { region: 'north', dest: 'Unknown City', dur: 'Half Day', cat: 'Cultural' },
        []
      ),
    /destination/i
  );
});

test('nextSequence throws when sequence exceeds 99', () => {
  const codes = Array.from({ length: 99 }, (_, i) => `AA-NV-HAN-HD-${String(i + 1).padStart(2, '0')}`);
  assert.throws(() => nextSequence('AA-NV-HAN-HD', codes), /max 99/);
});

test('parseProductCode for AA tour', () => {
  const parts = parseProductCode('AA-NV-HAN-HD-02');
  assert.deepEqual(parts, {
    brand: 'AA',
    regionCode: 'NV',
    destCode: 'HAN',
    typeSegment: 'HD',
    sequence: '02',
    raw: 'AA-NV-HAN-HD-02',
  });
});

test('parseProductCode for Excel CULI-EVE', () => {
  const parts = parseProductCode('AA-SV-SGN-CULI-EVE-01');
  assert.equal(parts?.regionCode, 'SV');
  assert.equal(parts?.destCode, 'SGN');
  assert.equal(parts?.typeSegment, 'CULI-EVE');
  assert.equal(parts?.sequence, '01');
});

test('parseProductCode for multi-segment type', () => {
  const parts = parseProductCode('AA-NV-HAL-CRU-2D1N-01');
  assert.equal(parts?.typeSegment, 'CRU-2D1N');
});

test('parseProductCode for service', () => {
  const parts = parseProductCode('SV-SGN-HD-01');
  assert.deepEqual(parts, {
    brand: 'SV',
    regionCode: 'SV',
    destCode: null,
    typeSegment: 'SGN-HD',
    sequence: '01',
    raw: 'SV-SGN-HD-01',
  });
});

test('formatCodeBreakdown', () => {
  assert.equal(formatCodeBreakdown('AA-NV-HAN-HD-02'), 'AA · NV · HAN · HD · 02');
  assert.equal(formatCodeBreakdown('AA-SV-SGN-CULI-EVE-01'), 'AA · SV · SGN · CULI-EVE · 01');
  assert.equal(formatCodeBreakdown('SV-SGN-HD-01'), 'SV · SGN-HD · 01');
});

test('isServiceOnlyDestination recognizes service tags', () => {
  assert.equal(isServiceOnlyDestination('All Vietnam'), true);
  assert.equal(isServiceOnlyDestination('SGN / HAN / DAD'), true);
  assert.equal(isServiceOnlyDestination('Hanoi'), false);
});

test('deriveDestinationOptions includes service specials', () => {
  const opts = deriveDestinationOptions('services', []);
  assert.ok(opts.includes('All Vietnam'));
  assert.ok(opts.includes('SGN / HAN / DAD'));
});

test('deriveDestinationOptions merges product labels for region', () => {
  const opts = deriveDestinationOptions('north', [{ dest: 'Custom North Spot', region: 'north' }]);
  assert.ok(opts.includes('Hanoi'));
  assert.ok(opts.includes('Custom North Spot'));
});

test('filterDestinationSuggestions matches partial input', () => {
  const options = deriveDestinationOptions('north', []);
  const hits = filterDestinationSuggestions('H', options);
  assert.ok(hits.some((h) => h.includes('Hanoi')));
  assert.ok(hits.some((h) => h.includes('Halong')));
});

test('filterDestinationSuggestions matches airport alias', () => {
  const options = deriveDestinationOptions('south', []);
  const hits = filterDestinationSuggestions('sgn', options);
  assert.ok(hits.includes('Ho Chi Minh City'));
});
