import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

let authenticated = true;
let galleryReadAllowed = true;
let downloadResult: { data: Blob; contentType: string } | null = {
  data: new Blob(['webp-bytes'], { type: 'image/webp' }),
  contentType: 'image/webp',
};

mock.module(require.resolve('../lib/auth/session'), {
  namedExports: {
    getAuthContext: async () => ({
      authenticated,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: authenticated ? 'user-1' : null,
      email: authenticated ? 'user@example.com' : null,
      authenticationUnavailable: false,
    }),
  },
});

mock.module(require.resolve('../lib/auth/permissions-server'), {
  namedExports: {
    checkPermissionForRequest: async (requiredPermission: string) => {
      if (requiredPermission === 'gallery.read' && galleryReadAllowed) {
        return { allowed: true };
      }
      return { allowed: false, status: 403 };
    },
  },
});

mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: {
    getServerSupabaseClient: async () => ({}) as never,
  },
});

mock.module(require.resolve('../lib/storage/photos-bucket-download'), {
  namedExports: {
    downloadPhotosBucketObject: async () => downloadResult,
  },
});

const photoFileUrl =
  'http://localhost/api/photos/file?path=gallery%2FPH-001%2Fthumb.webp&v=1';

test('GET /api/photos/file returns 401 when unauthenticated', async () => {
  authenticated = false;
  try {
    const { GET } = await import('../app/api/photos/file/route');
    const response = await GET(new Request(photoFileUrl));
    assert.equal(response.status, 401);
    const json = await response.json();
    assert.equal(json.ok, false);
    assert.doesNotMatch(JSON.stringify(json), /supabase\.co/);
  } finally {
    authenticated = true;
  }
});

test('GET /api/photos/file returns 403 without gallery.read', async () => {
  galleryReadAllowed = false;
  try {
    const { GET } = await import('../app/api/photos/file/route');
    const response = await GET(new Request(photoFileUrl));
    assert.equal(response.status, 403);
  } finally {
    galleryReadAllowed = true;
  }
});

test('GET /api/photos/file returns 400 for invalid storage path', async () => {
  const { GET } = await import('../app/api/photos/file/route');
  const response = await GET(
    new Request('http://localhost/api/photos/file?path=..%2Fsecret.webp'),
  );
  assert.equal(response.status, 400);
});

test('GET /api/photos/file returns 404 when object is missing', async () => {
  downloadResult = null;
  try {
    const { GET } = await import('../app/api/photos/file/route');
    const response = await GET(new Request(photoFileUrl));
    assert.equal(response.status, 404);
    const json = await response.json();
    assert.doesNotMatch(JSON.stringify(json), /supabase\.co|storage\/v1/);
  } finally {
    downloadResult = {
      data: new Blob(['webp-bytes'], { type: 'image/webp' }),
      contentType: 'image/webp',
    };
  }
});

test('GET /api/photos/file streams webp with cache headers', async () => {
  const { GET } = await import('../app/api/photos/file/route');
  const response = await GET(new Request(photoFileUrl));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/webp');
  assert.match(response.headers.get('Cache-Control') ?? '', /private/);
  assert.match(response.headers.get('Cache-Control') ?? '', /immutable/);
  const body = await response.text();
  assert.doesNotMatch(body, /supabase\.co|storage\/v1/);
});
