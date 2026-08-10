import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  estimateCookieHeaderBytes,
  isSupabaseAuthCookieName,
} from '../lib/auth/cookie-hygiene';

describe('cookie hygiene', () => {
  it('detects supabase auth cookie names including chunks', () => {
    assert.equal(isSupabaseAuthCookieName('sb-abc-auth-token'), true);
    assert.equal(isSupabaseAuthCookieName('sb-abc-auth-token.0'), true);
    assert.equal(isSupabaseAuthCookieName('sb-abc-auth-token.1'), true);
    assert.equal(isSupabaseAuthCookieName('bg_session'), false);
    assert.equal(isSupabaseAuthCookieName('other'), false);
  });

  it('estimates Cookie header size and auth chunk count', () => {
    const header =
      'bg_session=v1.x.y; sb-ref-auth-token.0=aaa; sb-ref-auth-token.1=bbb; crm.sidebarPinned=1';
    const est = estimateCookieHeaderBytes(header);
    assert.equal(est.cookieCount, 4);
    assert.equal(est.authChunkCount, 2);
    assert.equal(est.hasBreakGlass, true);
    assert.ok(est.bytes >= header.length);
  });
});
