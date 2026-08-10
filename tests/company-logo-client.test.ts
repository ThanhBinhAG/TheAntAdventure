import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import {
  fetchCompanyLogoUrlClient,
  getCachedCompanyLogoUrl,
  invalidateCompanyLogoCache,
  readPersistedCompanyLogoUrl,
  resetCompanyLogoClientForTests,
  setCompanyLogoUrlCache,
} from '../lib/storage/company-logo-client';

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  const store = {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: store },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: store,
    configurable: true,
    writable: true,
  });
  return store;
}

describe('company-logo-client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    installMemoryLocalStorage();
    resetCompanyLogoClientForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetCompanyLogoClientForTests();
  });

  it('dedupes concurrent GETs into a single fetch', async () => {
    let calls = 0;
    globalThis.fetch = mock.fn(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify({ ok: true, logoUrl: 'https://cdn.example/logo.webp' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const [a, b] = await Promise.all([
      fetchCompanyLogoUrlClient(),
      fetchCompanyLogoUrlClient(),
    ]);

    assert.equal(a, 'https://cdn.example/logo.webp');
    assert.equal(b, 'https://cdn.example/logo.webp');
    assert.equal(calls, 1);
  });

  it('reuses cache on later calls without refetch', async () => {
    let calls = 0;
    globalThis.fetch = mock.fn(async () => {
      calls += 1;
      return new Response(JSON.stringify({ ok: true, logoUrl: 'https://cdn.example/a.webp' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    await fetchCompanyLogoUrlClient();
    await fetchCompanyLogoUrlClient();
    assert.equal(calls, 1);
  });

  it('setCompanyLogoUrlCache skips network on next fetch', async () => {
    let calls = 0;
    globalThis.fetch = mock.fn(async () => {
      calls += 1;
      return new Response(JSON.stringify({ ok: true, logoUrl: 'https://cdn.example/x.webp' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    setCompanyLogoUrlCache('https://cdn.example/cached.webp');
    const url = await fetchCompanyLogoUrlClient();
    assert.equal(url, 'https://cdn.example/cached.webp');
    assert.equal(calls, 0);
  });

  it('invalidateCompanyLogoCache forces a new fetch', async () => {
    let calls = 0;
    globalThis.fetch = mock.fn(async () => {
      calls += 1;
      return new Response(
        JSON.stringify({ ok: true, logoUrl: `https://cdn.example/v${calls}.webp` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    await fetchCompanyLogoUrlClient();
    invalidateCompanyLogoCache();
    const second = await fetchCompanyLogoUrlClient();
    assert.equal(second, 'https://cdn.example/v2.webp');
    assert.equal(calls, 2);
  });

  it('persists known URL and known-null; missing key stays undefined', () => {
    assert.equal(readPersistedCompanyLogoUrl(), undefined);
    assert.equal(getCachedCompanyLogoUrl(), undefined);

    setCompanyLogoUrlCache('https://cdn.example/logo.webp');
    assert.equal(readPersistedCompanyLogoUrl(), 'https://cdn.example/logo.webp');

    setCompanyLogoUrlCache(null);
    assert.equal(readPersistedCompanyLogoUrl(), null);

    resetCompanyLogoClientForTests();
    assert.equal(readPersistedCompanyLogoUrl(), undefined);
  });

  it('hydrates memory from localStorage before fetch', async () => {
    window.localStorage.setItem(
      'taa.companyLogoUrl',
      JSON.stringify({ logoUrl: 'https://cdn.example/persisted.webp' })
    );

    assert.equal(getCachedCompanyLogoUrl(), 'https://cdn.example/persisted.webp');

    let calls = 0;
    globalThis.fetch = mock.fn(async () => {
      calls += 1;
      return new Response(
        JSON.stringify({ ok: true, logoUrl: 'https://cdn.example/fresh.webp' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    // Hydrated storage must still revalidate once.
    const url = await fetchCompanyLogoUrlClient();
    assert.equal(url, 'https://cdn.example/fresh.webp');
    assert.equal(calls, 1);
    assert.equal(readPersistedCompanyLogoUrl(), 'https://cdn.example/fresh.webp');
  });

  it('keeps persisted URL when network fails', async () => {
    setCompanyLogoUrlCache('https://cdn.example/keep.webp');
    invalidateCompanyLogoCache();
    // Persistence survives invalidate; memory is cold until hydrate.
    assert.equal(getCachedCompanyLogoUrl(), 'https://cdn.example/keep.webp');

    globalThis.fetch = mock.fn(async () => {
      throw new Error('offline');
    }) as typeof fetch;

    // Force revalidate path (network not confirmed after invalidate + hydrate).
    invalidateCompanyLogoCache();
    const hydrated = getCachedCompanyLogoUrl();
    assert.equal(hydrated, 'https://cdn.example/keep.webp');

    const url = await fetchCompanyLogoUrlClient();
    assert.equal(url, 'https://cdn.example/keep.webp');
  });
});
