import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { PHOTOS_BUCKET, galleryDisplayPath, galleryThumbPath } from '../lib/storage/photo-paths';

type PhotoRow = {
  id: string;
  product_code: string | null;
  url: string | null;
  thumb_url: string | null;
  storage_path: string | null;
};

type AttractionPhotoRow = {
  photo_id: string;
  attraction_id: string;
  sort_order: number | null;
};

type OwnerContext =
  | { kind: 'tour'; tourCode: string }
  | { kind: 'attraction'; attractionId: string }
  | { kind: 'loose' };

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    apply: args.has('--apply'),
    deleteLegacy: args.has('--delete-legacy'),
  };
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function ensureWebSocketSupport() {
  // Supabase realtime client on Node <22 needs a WebSocket transport.
  if (!globalThis.WebSocket) {
    globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
  }
}

function pathFromPublicUrl(url?: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${PHOTOS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return url.slice(idx + marker.length);
}

function thumbFromDisplayPath(displayPath?: string | null): string | null {
  if (!displayPath?.endsWith('/display.webp')) return null;
  return `${displayPath.slice(0, -'display.webp'.length)}thumb.webp`;
}

function ownerForPhoto(photo: PhotoRow, firstAttractionId?: string): OwnerContext {
  if (photo.product_code) return { kind: 'tour', tourCode: photo.product_code };
  if (firstAttractionId) return { kind: 'attraction', attractionId: firstAttractionId };
  return { kind: 'loose' };
}

function samePath(a?: string | null, b?: string | null): boolean {
  return (a ?? '').trim() === (b ?? '').trim();
}

async function tryCopyObject(
  supabase: SupabaseClient,
  fromPath: string | null,
  toPath: string,
  apply: boolean
): Promise<{ copied: boolean; skipped: boolean; error?: string }> {
  if (!fromPath || !fromPath.trim()) {
    return { copied: false, skipped: true };
  }
  if (samePath(fromPath, toPath)) {
    return { copied: false, skipped: true };
  }
  if (!apply) {
    return { copied: false, skipped: true };
  }
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).copy(fromPath, toPath);
  if (!error) return { copied: true, skipped: false };
  const msg = error.message.toLowerCase();
  if (msg.includes('already exists')) {
    return { copied: false, skipped: true };
  }
  return { copied: false, skipped: false, error: error.message };
}

async function main() {
  const { apply, deleteLegacy } = parseArgs();
  ensureWebSocketSupport();
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRole = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRole);

  const [{ data: photos, error: photosErr }, { data: links, error: linksErr }] = await Promise.all([
    supabase.from('photos').select('id, product_code, url, thumb_url, storage_path').order('id', { ascending: true }),
    supabase
      .from('attraction_photos')
      .select('photo_id, attraction_id, sort_order')
      .order('photo_id', { ascending: true })
      .order('sort_order', { ascending: true, nullsFirst: true })
      .order('attraction_id', { ascending: true }),
  ]);
  if (photosErr) throw photosErr;
  if (linksErr) throw linksErr;

  const byPhoto = new Map<string, string>();
  for (const row of (links ?? []) as AttractionPhotoRow[]) {
    if (!byPhoto.has(row.photo_id)) byPhoto.set(row.photo_id, row.attraction_id);
  }

  const rows = (photos ?? []) as PhotoRow[];
  let copiedDisplay = 0;
  let copiedThumb = 0;
  let updatedRows = 0;
  let skippedRows = 0;
  const failed: string[] = [];

  for (const photo of rows) {
    const owner = ownerForPhoto(photo, byPhoto.get(photo.id));
    const targetDisplayPath = galleryDisplayPath(photo.id, owner);
    const targetThumbPath = galleryThumbPath(photo.id, owner);
    const sourceDisplayPath = photo.storage_path || pathFromPublicUrl(photo.url);
    const sourceThumbPath = photo.thumb_url ? pathFromPublicUrl(photo.thumb_url) : thumbFromDisplayPath(sourceDisplayPath);

    const copiedDisp = await tryCopyObject(supabase, sourceDisplayPath, targetDisplayPath, apply);
    if (copiedDisp.error) {
      failed.push(`${photo.id}: display copy failed (${copiedDisp.error})`);
      continue;
    }
    if (copiedDisp.copied) copiedDisplay += 1;

    const copiedTh = await tryCopyObject(supabase, sourceThumbPath, targetThumbPath, apply);
    if (copiedTh.error) {
      failed.push(`${photo.id}: thumb copy failed (${copiedTh.error})`);
      continue;
    }
    if (copiedTh.copied) copiedThumb += 1;

    const targetUrl = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(targetDisplayPath).data.publicUrl;
    const targetThumbUrl = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(targetThumbPath).data.publicUrl;
    const needsUpdate =
      !samePath(photo.storage_path, targetDisplayPath) ||
      (photo.url ?? '') !== targetUrl ||
      (photo.thumb_url ?? '') !== targetThumbUrl;

    if (!needsUpdate) {
      skippedRows += 1;
      continue;
    }

    if (apply) {
      const { error: updateErr } = await supabase
        .from('photos')
        .update({
          storage_path: targetDisplayPath,
          url: targetUrl,
          thumb_url: targetThumbUrl,
        })
        .eq('id', photo.id);
      if (updateErr) {
        failed.push(`${photo.id}: DB update failed (${updateErr.message})`);
        continue;
      }
    }
    updatedRows += 1;

    if (apply && deleteLegacy && sourceDisplayPath && !samePath(sourceDisplayPath, targetDisplayPath)) {
      const legacyPaths = [sourceDisplayPath];
      if (sourceThumbPath && !samePath(sourceThumbPath, targetThumbPath)) legacyPaths.push(sourceThumbPath);
      const { error: removeErr } = await supabase.storage.from(PHOTOS_BUCKET).remove(legacyPaths);
      if (removeErr) {
        failed.push(`${photo.id}: legacy remove failed (${removeErr.message})`);
      }
    }
  }

  const mode = apply ? 'APPLY' : 'DRY_RUN';
  console.log(`[photo-migrate] mode=${mode} rows=${rows.length} updated=${updatedRows} skipped=${skippedRows}`);
  console.log(`[photo-migrate] copied display=${copiedDisplay} thumb=${copiedThumb}`);
  if (failed.length) {
    console.log(`[photo-migrate] failures=${failed.length}`);
    for (const line of failed) console.log(` - ${line}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[photo-migrate] fatal', err);
  process.exit(1);
});
