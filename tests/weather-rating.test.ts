import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toTravelRating } from '../lib/weather/rating';
import { mapPool, parseDestinationDetailResponse, parseOpenMeteoResponse } from '../lib/weather/open-meteo';

describe('toTravelRating', () => {
  it('returns P for heavy rain', () => {
    assert.equal(toTravelRating(61, 25, 28), 'P');
  });

  it('returns P for thunderstorm code', () => {
    assert.equal(toTravelRating(95, 2, 28), 'P');
  });

  it('returns E for clear and dry', () => {
    assert.equal(toTravelRating(0, 0, 26, 18), 'E');
  });

  it('returns F for extreme heat', () => {
    assert.equal(toTravelRating(1, 0, 39, 30), 'F');
  });

  it('returns G for foggy dry day outside clear codes', () => {
    // Codes 0–3 with low precip are Excellent; G is the residual (e.g. fog 45).
    assert.equal(toTravelRating(45, 1, 27, 20), 'G');
  });
});

const sampleDaily = {
  time: ['2026-07-03', '2026-07-04'],
  temperature_2m_max: [30, 31],
  temperature_2m_min: [24, 25],
  precipitation_sum: [0, 5],
  weathercode: [0, 61],
  windspeed_10m_max: [12, 15],
};

const hanoi = {
  id: 'hanoi',
  name: 'Hanoi',
  region: 'north' as const,
  emoji: '🏛',
  latitude: 21,
  longitude: 105.8,
  sortOrder: 1,
};

const sapa = {
  id: 'sapa',
  name: 'Sapa',
  region: 'north' as const,
  emoji: '⛰',
  latitude: 22.3,
  longitude: 103.8,
  elevationM: 1500,
  sortOrder: 2,
};

describe('parseOpenMeteoResponse', () => {
  it('parses single-location daily forecast', () => {
    const json = { daily: sampleDaily };
    const rows = parseOpenMeteoResponse(json, [hanoi], new Date('2026-07-03T00:00:00Z'));
    assert.equal(rows.length, 2);
    assert.equal(rows[0].destination_id, 'hanoi');
    assert.equal(rows[0].forecast_date, '2026-07-03');
    assert.equal(rows[0].travel_rating, 'E');
    assert.equal(rows[1].travel_rating, 'F');
  });

  it('parses array multi-location batch', () => {
    const json = [{ daily: sampleDaily }, { daily: sampleDaily }];
    const rows = parseOpenMeteoResponse(json, [hanoi, sapa], new Date('2026-07-03T00:00:00Z'));
    assert.equal(rows.length, 4);
    assert.equal(rows[0].destination_id, 'hanoi');
    assert.equal(rows[2].destination_id, 'sapa');
  });

  it('parses numeric-keyed multi-location object', () => {
    const json = {
      '0': { daily: sampleDaily },
      '1': { daily: sampleDaily },
    };
    const rows = parseOpenMeteoResponse(json, [hanoi, sapa], new Date('2026-07-03T00:00:00Z'));
    assert.equal(rows.length, 4);
    assert.equal(rows.filter((r) => r.destination_id === 'sapa').length, 2);
  });
});

describe('parseDestinationDetailResponse', () => {
  it('parses current + daily with UV', () => {
    const json = {
      current: {
        temperature_2m: 29.4,
        relative_humidity_2m: 72,
        apparent_temperature: 33.1,
        weather_code: 2,
        wind_speed_10m: 11,
      },
      daily: {
        ...sampleDaily,
        uv_index_max: [8, 7],
      },
    };
    const parsed = parseDestinationDetailResponse(json, hanoi, new Date('2026-07-03T00:00:00Z'));
    assert.equal(parsed.current.tempC, 29.4);
    assert.equal(parsed.current.humidity, 72);
    assert.equal(parsed.days.length, 2);
    assert.equal(parsed.days[0].uvIndexMax, 8);
    assert.equal(parsed.rows.length, 2);
  });
});

describe('mapPool', () => {
  it('runs workers with bounded concurrency and preserves order', async () => {
    const started: number[] = [];
    const maxConcurrent = { n: 0, peak: 0 };

    const results = await mapPool([1, 2, 3, 4, 5], 2, async (item) => {
      started.push(item);
      maxConcurrent.n += 1;
      maxConcurrent.peak = Math.max(maxConcurrent.peak, maxConcurrent.n);
      await new Promise((r) => setTimeout(r, 20));
      maxConcurrent.n -= 1;
      return item * 10;
    });

    assert.deepEqual(results, [10, 20, 30, 40, 50]);
    assert.ok(maxConcurrent.peak <= 2);
    assert.deepEqual(started.slice(0, 2).sort(), [1, 2]);
  });
});
