/**
 * Retrieves a user's active Etsy shop connection, refreshing the access
 * token when it's about to expire. This is the only code path that should
 * touch etsy_shop_connections.access_token / refresh_token going forward.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { refreshAccessToken } from './oauth.js';

const REFRESH_BUFFER_SECONDS = 60;

export interface EtsyConnection {
  id: string;
  userId: string;
  etsyShopId: number;
  shopName: string | null;
  shopUrl: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}

export type EtsyConnectionErrorCode =
  | 'NO_CONNECTION'
  | 'CONNECTION_INACTIVE'
  | 'REFRESH_FAILED'
  | 'DB_ERROR';

export class EtsyConnectionError extends Error {
  constructor(message: string, public readonly code: EtsyConnectionErrorCode) {
    super(message);
    this.name = 'EtsyConnectionError';
  }
}

interface ConnectionRow {
  id: string;
  user_id: string;
  etsy_shop_id: number | string;
  shop_name: string | null;
  shop_url: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

function rowToConnection(row: ConnectionRow): EtsyConnection {
  return {
    id: row.id,
    userId: row.user_id,
    etsyShopId: typeof row.etsy_shop_id === 'string' ? Number(row.etsy_shop_id) : row.etsy_shop_id,
    shopName: row.shop_name,
    shopUrl: row.shop_url,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: new Date(row.token_expires_at),
  };
}

export async function getActiveConnection(
  userId: string,
  supabaseAdmin: SupabaseClient,
): Promise<EtsyConnection> {
  const { data, error } = await supabaseAdmin
    .from('etsy_shop_connections')
    .select('id, user_id, etsy_shop_id, shop_name, shop_url, access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new EtsyConnectionError(
      `Failed to load Etsy connection: ${error.message}`,
      'DB_ERROR',
    );
  }
  if (!data) {
    throw new EtsyConnectionError('No active Etsy connection for this user', 'NO_CONNECTION');
  }

  const connection = rowToConnection(data as ConnectionRow);
  const msUntilExpiry = connection.tokenExpiresAt.getTime() - Date.now();
  if (msUntilExpiry > REFRESH_BUFFER_SECONDS * 1000) {
    return connection;
  }

  const clientId = process.env.ETSY_API_KEY;
  if (!clientId) {
    throw new EtsyConnectionError(
      'Token refresh failed: ETSY_API_KEY is not configured',
      'REFRESH_FAILED',
    );
  }

  let refreshed;
  try {
    refreshed = await refreshAccessToken({
      refreshToken: connection.refreshToken,
      clientId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    throw new EtsyConnectionError(`Token refresh failed: ${msg}`, 'REFRESH_FAILED');
  }

  const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);

  const { error: updateError } = await supabaseAdmin
    .from('etsy_shop_connections')
    .update({
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken,
      token_expires_at: newExpiresAt.toISOString(),
    })
    .eq('id', connection.id);

  if (updateError) {
    throw new EtsyConnectionError(
      `Failed to persist refreshed Etsy tokens: ${updateError.message}`,
      'DB_ERROR',
    );
  }

  return {
    ...connection,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    tokenExpiresAt: newExpiresAt,
  };
}
