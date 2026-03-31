/**
 * Shared helper: download image from Etsy CDN and upload to Supabase storage.
 * Used by both score-etsy-listing (full scoring) and prepare-listing (lightweight).
 */
import { supabaseAdmin } from '../supabase/server.js';

const DOWNLOAD_TIMEOUT = 15_000;

export async function downloadAndUploadEtsyImage(
  imageUrl: string,
  userId: string,
): Promise<string> {
  const imgRes = await fetch(imageUrl, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT),
  });
  if (!imgRes.ok) throw new Error(`Failed to download Etsy image: ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const filename = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error: uploadErr } = await supabaseAdmin.storage
    .from('mockups_bucket')
    .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false });
  if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('mockups_bucket')
    .getPublicUrl(filename);

  return publicUrl;
}
