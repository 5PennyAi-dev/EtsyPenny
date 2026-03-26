import { supabaseAdmin } from '../supabase/server.js';

export const TOKEN_COSTS = {
  analyze_image: 1,
  generate_keywords: 8,
  rerun_keywords: 4,
  generate_draft: 1,
} as const;

export type TokenAction = keyof typeof TOKEN_COSTS;

/**
 * Check if user has enough tokens for an action.
 * Returns { allowed: true } or { allowed: false, reason, balance, required }
 */
export async function checkTokenBalance(userId: string, action: TokenAction, listingId?: string) {
  let cost = TOKEN_COSTS[action];

  // For generate_keywords: check if this is a rerun (cheaper)
  if (action === 'generate_keywords' && listingId) {
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('seo_generation_count')
      .eq('id', listingId)
      .single();
    if (listing && listing.seo_generation_count > 0) {
      cost = TOKEN_COSTS.rerun_keywords;
    }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tokens_monthly_balance, tokens_bonus_balance')
    .eq('id', userId)
    .single();

  if (!profile) return { allowed: false as const, reason: 'Profile not found', balance: 0, required: cost };

  const totalBalance = (profile.tokens_monthly_balance ?? 0) + (profile.tokens_bonus_balance ?? 0);
  if (totalBalance < cost) {
    return { allowed: false as const, reason: 'Insufficient tokens', balance: totalBalance, required: cost };
  }

  return { allowed: true as const, balance: totalBalance, required: cost };
}

/**
 * Deduct tokens from user balance. Consumes monthly tokens first, then bonus.
 * Logs the transaction in token_transactions table.
 */
export async function deductTokens(
  userId: string,
  action: TokenAction,
  cost: number,
  listingId?: string
) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tokens_monthly_balance, tokens_bonus_balance')
    .eq('id', userId)
    .single();

  if (!profile) throw new Error('Profile not found');

  let monthlyBalance = profile.tokens_monthly_balance ?? 0;
  let bonusBalance = profile.tokens_bonus_balance ?? 0;

  // Deduct from monthly first, then bonus
  let remaining = cost;
  if (monthlyBalance >= remaining) {
    monthlyBalance -= remaining;
    remaining = 0;
  } else {
    remaining -= monthlyBalance;
    monthlyBalance = 0;
    bonusBalance -= remaining;
  }

  const balanceAfter = monthlyBalance + bonusBalance;

  // Update profile balances
  await supabaseAdmin
    .from('profiles')
    .update({
      tokens_monthly_balance: monthlyBalance,
      tokens_bonus_balance: bonusBalance,
    })
    .eq('id', userId);

  // Log transaction
  await supabaseAdmin.from('token_transactions').insert({
    user_id: userId,
    type: 'deduction',
    amount: -cost,
    action,
    listing_id: listingId ?? null,
    balance_after: balanceAfter,
    description: `${action} (cost: ${cost} tokens)`,
  });

  // If generate_keywords or rerun, increment seo_generation_count
  if ((action === 'generate_keywords' || action === 'rerun_keywords') && listingId) {
    await supabaseAdmin.rpc('increment_seo_generation_count', { listing_id: listingId });
  }
}

/**
 * Check quota for add-custom and add-from-favorite actions.
 */
export async function checkQuota(userId: string, quotaType: 'add_custom' | 'add_favorite') {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('subscription_plan, add_custom_used, add_favorite_used')
    .eq('id', userId)
    .single();

  const { data: plan } = await supabaseAdmin
    .from('plans')
    .select('add_custom_limit, add_favorite_limit')
    .eq('id', profile?.subscription_plan ?? 'free')
    .single();

  if (!profile || !plan) return { allowed: false as const, reason: 'Profile not found' };

  if (quotaType === 'add_custom') {
    const limit = plan.add_custom_limit;
    const used = profile.add_custom_used ?? 0;
    if (used >= limit) return { allowed: false as const, reason: 'Monthly custom keyword quota reached', used, limit };
    return { allowed: true as const, used, limit };
  } else {
    const limit = plan.add_favorite_limit; // null = unlimited
    const used = profile.add_favorite_used ?? 0;
    if (limit !== null && used >= limit) return { allowed: false as const, reason: 'Monthly favorites quota reached', used, limit };
    return { allowed: true as const, used, limit };
  }
}

/**
 * Increment quota counter after successful action.
 */
export async function incrementQuota(userId: string, quotaType: 'add_custom' | 'add_favorite') {
  const field = quotaType === 'add_custom' ? 'add_custom_used' : 'add_favorite_used';
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select(field)
    .eq('id', userId)
    .single();

  await supabaseAdmin
    .from('profiles')
    .update({ [field]: ((profile as any)?.[field] ?? 0) + 1 })
    .eq('id', userId);
}
