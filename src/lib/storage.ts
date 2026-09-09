import { supabase } from './supabase';
import { reportError } from './errorReporting';

const SIGNED_URL_EXPIRY = 3600;

interface ParsedStorageUrl {
  bucket: string;
  path: string;
}

function parseStorageUrl(url: string): ParsedStorageUrl | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/storage/v1/object/');
    if (parts.length < 2) return null;

    const objectPart = parts[1];
    const slashIndex = objectPart.indexOf('/');
    if (slashIndex === -1) return null;

    const bucket = objectPart.substring(0, slashIndex);
    const path = objectPart.substring(slashIndex + 1);

    return { bucket, path: decodeURIComponent(path) };
  } catch {
    return null;
  }
}

export async function getFreshFileUrl(fileUrl: string): Promise<string> {
  if (!fileUrl) return fileUrl;

  const parsed = parseStorageUrl(fileUrl);
  if (!parsed) return fileUrl;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    reportError(error ?? new Error('createSignedUrl returned no signedUrl'), {
      bucket: parsed.bucket,
      path: parsed.path,
      category: 'RELIABILITY',
    });
    throw error ?? new Error('Failed to refresh file URL');
  }

  return data.signedUrl;
}
