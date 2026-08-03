import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { getAuthCaptchaSiteKey } from '../lib/env';

describe('auth env helpers', () => {
  const originalCaptchaKey = process.env.NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY;

  afterEach(() => {
    if (originalCaptchaKey === undefined) delete process.env.NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY;
    else process.env.NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY = originalCaptchaKey;
  });

  it('getAuthCaptchaSiteKey trims whitespace', () => {
    process.env.NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY = '  site-key  ';
    assert.equal(getAuthCaptchaSiteKey(), 'site-key');
  });

  it('getAuthCaptchaSiteKey returns empty when unset', () => {
    delete process.env.NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY;
    assert.equal(getAuthCaptchaSiteKey(), '');
  });
});
