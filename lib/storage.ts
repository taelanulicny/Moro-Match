import { supabase } from '@/lib/supabase';

const BUCKET = 'Avatars';
const SIGNED_URL_EXPIRY_SEC = 60 * 60 * 24 * 7; // 7 days

export function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  const match = publicUrl.match(/\/object\/public\/[Aa]vatars\/(.+)$/);
  return match ? match[1] : null;
}

export function isSupabaseStorageUrl(url: string): boolean {
  return !!getStoragePathFromPublicUrl(url);
}

export async function getSignedUrl(publicUrl: string): Promise<string> {
  const path = getStoragePathFromPublicUrl(publicUrl);
  if (!path) return publicUrl;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY_SEC);
  return data?.signedUrl ?? publicUrl;
}

/** Get a signed URL directly from storage path (e.g. after upload). */
export async function getSignedUrlFromPath(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY_SEC);
  return data?.signedUrl ?? null;
}

/** Get public URL from storage path. Requires bucket to be PUBLIC in Supabase Dashboard. */
export function getPublicUrlFromPath(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
}
