import { guideAvatarApiUrl } from './guide-avatar-url';

/** Upload an avatar through the CRM BFF; no browser Supabase client is involved. */
export async function uploadGuideAvatarClient(guideId: string, file: File): Promise<string> {
  const form = new FormData();
  form.set('guideId', guideId);
  form.set('file', file);

  const response = await fetch('/api/guides/avatar', {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
  });
  const body = await response.json().catch(() => null) as { ok?: boolean; photo?: string; error?: string } | null;
  if (!response.ok || !body?.ok || !body.photo) {
    throw new Error(body?.error ?? 'Avatar upload failed.');
  }
  return body.photo || guideAvatarApiUrl(guideId);
}
