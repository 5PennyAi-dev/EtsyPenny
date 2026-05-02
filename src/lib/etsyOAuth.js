import { supabase } from './supabase';

async function authedFetch(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function startEtsyConnect() {
  const { url } = await authedFetch('/api/etsy/oauth/authorize');
  window.location.href = url;
}

export async function exchangeEtsyCode(code, state) {
  return authedFetch('/api/etsy/oauth/exchange', { code, state });
}

export async function disconnectEtsy() {
  return authedFetch('/api/etsy/oauth/disconnect');
}
