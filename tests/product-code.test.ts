import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductCode,
  deriveDestinationOptions,
  filterDestinationSuggestions,
  formatCodeBreakdown,
  isServiceOnlyDestination,
  nextSequence,
  parseProductCode,
  resolveDestCode,
  suggestTypeSegment,
} from '../lib/product-code';

const existingHanHd = ['AA-NV-HAN-HD-01', 'AA-NV-HAN-HD-02', 'AA-NV-HAN-TRF-01'];

test('suggestTypeSegment: half day transfer', () => {
  assert.equal(suggestTypeSegment('north', 'Half Day', 'Transfer'), 'TRF');
});

test('suggestTypeSegment: half day default', () => {
  assert.equal(suggestTypeSegment('north', 'Half Day', 'Cultural'), 'HD');
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
  assert.equal(resolveDestCode('Unknown Place'), null);
});

test('nextSequence increments from existing codes', () => {
  assert.equal(nextSequence('AA-NV-HAN-HD', existingHanHd), '03');
});

test('buildProductCode assigns next sequence for tour', () => {
  const code = buildProductCode(
    { region: 'north', dest: 'Hanoi', dur: 'Half Day', cat: 'Cultural' },
    existingHanHd
  );
  assert.equal(code, 'AA-NV-HAN-HD-03');
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
