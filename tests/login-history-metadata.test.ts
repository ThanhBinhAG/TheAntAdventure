import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { getLoginClientMetadata } from '../lib/auth/login-history-metadata';

const originalTrustProxyHeaders = process.env.TRUST_PROXY_HEADERS;

afterEach(() => {
  // Mỗi test tự trả lại env để không ảnh hưởng test đăng nhập khác.
  if (originalTrustProxyHeaders === undefined) {
    delete process.env.TRUST_PROXY_HEADERS;
  } else {
    process.env.TRUST_PROXY_HEADERS = originalTrustProxyHeaders;
  }
});

describe('login history client metadata', () => {
  it('does not trust a client-supplied IP header without a trusted proxy', () => {
    process.env.TRUST_PROXY_HEADERS = 'false';

    const metadata = getLoginClientMetadata(new Request('http://localhost', {
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
        'x-real-ip': '203.0.113.10',
      },
    }));

    assert.equal(metadata.ipAddress, null);
    assert.equal(metadata.browserName, 'Google Chrome');
    assert.equal(metadata.operatingSystem, 'Linux');
    assert.equal(metadata.deviceType, 'desktop');
  });

  it('uses the proxy-provided IP only after the trust flag is enabled', () => {
    process.env.TRUST_PROXY_HEADERS = 'true';

    const metadata = getLoginClientMetadata(new Request('http://localhost', {
      headers: {
        // Cloudflare has priority because it represents the original source IP.
        'cf-connecting-ip': '2001:db8::42',
        'x-real-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.9, 10.0.0.1',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      },
    }));

    assert.equal(metadata.ipAddress, '2001:db8::42');
    assert.equal(metadata.browserName, 'Safari');
    assert.equal(metadata.operatingSystem, 'iOS');
    assert.equal(metadata.deviceType, 'mobile');
  });

  it('rejects malformed proxy IP values instead of persisting them', () => {
    process.env.TRUST_PROXY_HEADERS = 'true';

    const metadata = getLoginClientMetadata(new Request('http://localhost', {
      headers: {
        'x-real-ip': 'not-an-ip',
        'x-forwarded-for': 'also-not-an-ip',
      },
    }));

    assert.equal(metadata.ipAddress, null);
    assert.equal(metadata.browserName, 'Không xác định');
    assert.equal(metadata.deviceType, 'unknown');
  });
});
