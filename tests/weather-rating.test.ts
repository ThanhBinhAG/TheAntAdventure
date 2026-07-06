import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toTravelRating } from '../lib/weather/rating';
import { parseOpenMeteoResponse } from '../lib/weather/open-meteo';

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

  it('returns G for mild cloudy day', () => {
    assert.equal(toTravelRating(2, 1, 27, 20), 'G');
  });
});

describe('parseOpenMeteoResponse', () => {
  it('parses single-location daily forecast', () => {
    const json = {
      daily: {
        time: ['2026-07-03', '2026-07-04'],
        temperature_2m_max: [30, 31],
        temperature_2m_min: [24, 25],
        precipitation_sum: [0, 5],
        weathercode: [0, 61],
        windspeed_10m_max: [12, 15],
      },
    };
    const dest = [
      {
        id: 'hanoi',
        name: 'Hanoi',
        region: 'north' as const,
        emoji: '🏛',
        latitude: 21,
        longitude: 105.8,
        sortOrder: 1,
      },
    ];
    const rows = parseOpenMeteoResponse(json, dest, new Date('2026-07-03T00:00:00Z'));
    assert.equal(rows.length, 2);
    assert.equal(rows[0].destination_id, 'hanoi');
    assert.equal(rows[0].forecast_date, '2026-07-03');
    assert.equal(rows[0].travel_rating, 'E');
    assert.equal(rows[1].travel_rating, 'F');
  });
});
