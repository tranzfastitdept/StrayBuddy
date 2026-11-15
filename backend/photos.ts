// backend/photos.ts
/**
 * Photo storage for animals and campaigns.
 *
 * Files live in public/uploads/<strays|campaigns>/<owner id>/<photo id>.jpg
 * so they are served straight by the web server, and a row in stray_photos.csv
 * or campaign_photos.csv carries the photo id plus the owner id. That row is
 * the identifier that links a picture to its animal or its campaign.
 *
 * Images arrive as data URLs from the browser (already shrunk to <250KB by
 * lib/media/compressImage), so no extra dependency is needed on the server.
 */
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, appendRow, newId, nowIso, readTable } from './csvStore';

export type OwnerType = 'stray' | 'campaign';

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_BYTES = 4 * 1024 * 1024; // a single photo may not exceed 4MB
const MAX_PHOTOS = 4; // 1 identifier + 3 gallery

function folderFor(ownerType: OwnerType) {
  return path.join(UPLOAD_DIR, ownerType === 'stray' ? 'strays' : 'campaigns');
}

/** Turn a data URL into a file on disk plus a row that links it to its owner. */
export function saveDataUrl(ownerType: OwnerType, ownerId: string, dataUrl: string, sortOrder = 0) {
  const match = /^data:([^;]+);base64,(.*)$/i.exec(String(dataUrl || ''));
  if (!match) throw new Error('Photo must be sent as a base64 data URL');

  const mime = match[1].toLowerCase();
  const ext = EXT[mime] || 'jpg';
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_BYTES) throw new Error('That photo is larger than 4MB');

  const photoId = newId('pho');
  const fileName = `${photoId}.${ext}`;
  const dir = path.join(folderFor(ownerType), ownerId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), buffer);

  const publicUrl = `/uploads/${ownerType === 'stray' ? 'strays' : 'campaigns'}/${ownerId}/${fileName}`;

  appendRow(ownerType === 'stray' ? 'stray_photos' : 'campaign_photos', {
    id: photoId,
    [`${ownerType}_id`]: ownerId,
    file_name: fileName,
    photo_url: publicUrl,
    sort_order: sortOrder,
    created_at: nowIso(),
  });

  return { id: photoId, file_name: fileName, photo_url: publicUrl, sort_order: sortOrder };
}

/** Store several photos for one owner, in order. */
export function savePhotos(ownerType: OwnerType, ownerId: string, images: string[]) {
  const list = (Array.isArray(images) ? images : [])
    .filter((img) => typeof img === 'string' && img.startsWith('data:'))
    .slice(0, MAX_PHOTOS);
  return list.map((img, index) => saveDataUrl(ownerType, ownerId, img, index));
}

/** Photos already on record for an owner, in display order. */
export function photosFor(ownerType: OwnerType, ownerId: string) {
  const rows = readTable<any>(ownerType === 'stray' ? 'stray_photos' : 'campaign_photos')
    .filter((r) => String(r[`${ownerType}_id`]) === String(ownerId))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  return rows.map((r) => ({ id: r.id, url: r.photo_url, name: r.file_name }));
}

/**
 * Older rows stored the picture itself. Keep them working: a data URL stays as
 * it is, while a stored path is passed through unchanged.
 */
export function resolvePhoto(value: string | null | undefined): string {
  const text = String(value || '');
  return text;
}
