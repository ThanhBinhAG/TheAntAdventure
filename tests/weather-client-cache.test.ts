import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearClientWeatherCache,
  isClientWeatherCacheFresh,
  readClientWeatherCache,
  writeClientWeatherCache,
} from '../lib/weather/client-cache';
import type { DestinationWeatherDetail } from '../lib/weather/types';

const sample: DestinationWeatherDetail = {
  id: 'hanoi',
  name: 'Hanoi',
  region: 'north',
  emoji: '🏛',
  description: null,
  coverPhotoId: null,
  coverUrl: null,
  current: {
    tempC: 30,
    humidity: 70,
    feelsLikeC: 32,
    weatherCode: 1,
    windKmh: 10,
  },
  days: [],
  fetchedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

before(() => {
  if (typeof localStorage !== 'undefined') return;
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
});

describe('client weather cache', () => {
  it('round-trips fresh entries and expires stale ones', () => {
    clearClientWeatherCache('hanoi');
    writeClientWeatherCache(sample);
    assert.equal(isClientWeatherCacheFresh('hanoi'), true);
    const hit = readClientWeatherCache('hanoi');
    assert.equal(hit?.current.tempC, 30);

    writeClientWeatherCache({
      ...sample,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    assert.equal(readClientWeatherCache('hanoi'), null);
    assert.equal(isClientWeatherCacheFresh('hanoi'), false);
  });
});
