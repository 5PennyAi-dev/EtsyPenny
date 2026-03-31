/**
 * Matches an Etsy category path to a PennySEO product type.
 * 3-step: exact match → fuzzy match → auto-create as custom product type.
 */
import { supabaseAdmin } from '../supabase/server.js';

const KEEP_PLURAL = new Set([
  'pants', 'scissors', 'glasses', 'shorts', 'leggings', 'jeans',
  'tights', 'overalls', 'suspenders', 'pliers',
]);

function singularize(name: string): string {
  if (KEEP_PLURAL.has(name.toLowerCase())) return name;
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1);
  return name;
}

export async function matchProductType(
  etsyCategory: string | null | undefined,
  userId: string,
): Promise<string | null> {
  if (!etsyCategory) return null;

  const segments = etsyCategory.split(' > ');
  const specific = segments[segments.length - 1]?.trim();
  if (!specific) return null;

  // ── Step 1: Exact match (case-insensitive) ────────────
  const { data: exact } = await supabaseAdmin
    .from('v_combined_product_types')
    .select('id')
    .ilike('name', specific);

  if (exact?.length) return exact[0].id;

  // ── Step 2: Fuzzy — strip plural, partial contains ────
  const { data: allTypes } = await supabaseAdmin
    .from('v_combined_product_types')
    .select('id, name');

  if (allTypes) {
    const norm = singularize(specific).toLowerCase();
    for (const pt of allTypes) {
      const ptNorm = singularize(pt.name).toLowerCase();
      if (ptNorm.includes(norm) || norm.includes(ptNorm)) return pt.id;
    }
  }

  // ── Step 3: Auto-create (only if depth >= 2) ──────────
  if (segments.length < 2) return null; // too vague (e.g. just "Clothing")

  const normalizedName = singularize(specific);

  // Check normalized name doesn't already exist
  const { data: normCheck } = await supabaseAdmin
    .from('v_combined_product_types')
    .select('id')
    .ilike('name', normalizedName);

  if (normCheck?.length) return normCheck[0].id;

  // Insert into user_custom_product_types
  const { data: newType, error: insertErr } = await supabaseAdmin
    .from('user_custom_product_types')
    .insert({ user_id: userId, name: normalizedName })
    .select('id')
    .single();

  if (insertErr) {
    // Unique constraint violation = race condition
    if (insertErr.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('user_custom_product_types')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', normalizedName)
        .single();
      return existing?.id || null;
    }
    console.error('[matchProductType] Auto-create failed:', insertErr.message);
    return null;
  }

  console.info(`[matchProductType] Auto-created: "${normalizedName}" for user ${userId}`);
  return newType.id;
}
