import { supabaseAdmin } from '../supabase/server.js';
import { callGemini } from './adapters/gemini-adapter.js';
import { callAnthropic } from './adapters/anthropic-adapter.js';
import { callOpenAI } from './adapters/openai-adapter.js';
import type { AICallParams, AIResponse } from './types.js';

// ── Retry with exponential backoff ──────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const TRANSIENT_STATUSES = new Set([429, 500, 503, 504]);

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  label: string
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status ?? 0;
      const isTransient = TRANSIENT_STATUSES.has(status) || !status;

      if (!isTransient || attempt === maxRetries) {
        console.error(`[provider-router] ${label} failed after ${attempt} attempt(s):`, err?.message);
        throw err;
      }

      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.warn(`[provider-router] ${label} attempt ${attempt} failed (${status || 'network'}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('withRetry: unreachable');
}

// ── Config cache ────────────────────────────────────────────────────

let configCache: Record<string, any> = {};
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60_000; // 1 minute

async function getTaskConfig(taskKey: string) {
  if (Date.now() - configCacheTime > CONFIG_CACHE_TTL) {
    const { data, error } = await supabaseAdmin
      .from('system_ai_config')
      .select('*');
    if (error) {
      console.error('[provider-router] Failed to load AI config:', error.message);
    }
    configCache = {};
    (data || []).forEach((row: any) => {
      configCache[row.task_key] = row;
    });
    configCacheTime = Date.now();
  }

  return configCache[taskKey] || {
    provider: 'gemini',
    model_id: 'gemini-2.5-flash',
    temperature: 1.0,
    max_tokens: 8192,
  };
}

// ── Adapters & fallback chains ──────────────────────────────────────

const adapters: Record<string, (params: AICallParams) => Promise<AIResponse>> = {
  gemini: callGemini,
  anthropic: callAnthropic,
  openai: callOpenAI,
};

const GEMINI_FALLBACK_CHAINS: Record<string, string[]> = {
  'gemini-2.5-flash':      ['gemini-2.5-pro', 'gemini-2.5-flash-lite'],
  'gemini-2.5-pro':        ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  'gemini-2.5-flash-lite': ['gemini-2.5-flash', 'gemini-2.5-pro'],
};

type RunAIOptions = {
  imageBase64?: string;
  imageMimeType?: string;
  imageUrl?: string;
  systemPrompt?: string;
  temperatureOverride?: number;
  maxTokensOverride?: number;
};

function callWithAdapter(
  adapter: (params: AICallParams) => Promise<AIResponse>,
  config: any,
  modelId: string,
  prompt: string,
  options?: RunAIOptions
): Promise<AIResponse> {
  const params: AICallParams = {
    model: modelId,
    prompt,
    temperature: options?.temperatureOverride ?? config.temperature,
    maxTokens: options?.maxTokensOverride ?? config.max_tokens,
    imageBase64: options?.imageBase64,
    imageMimeType: options?.imageMimeType,
    imageUrl: options?.imageUrl,
    systemPrompt: options?.systemPrompt,
  };
  return adapter(params);
}

// ── Main entry point ────────────────────────────────────────────────

/**
 * Main entry point for all AI calls in PennySEO.
 * Includes exponential-backoff retry (3 attempts) and Gemini model fallback.
 *
 * @param taskKey - Matches a row in system_ai_config (e.g. 'keyword_generation')
 * @param prompt - The user/task prompt text
 * @param options - Optional: image data, system prompt, parameter overrides
 */
export async function runAI(
  taskKey: string,
  prompt: string,
  options?: RunAIOptions
): Promise<AIResponse> {
  const config = await getTaskConfig(taskKey);
  const adapter = adapters[config.provider];

  if (!adapter) {
    throw new Error(`[provider-router] Unknown AI provider "${config.provider}" for task "${taskKey}"`);
  }

  const primaryModel: string = config.model_id;
  const fallbacks = config.provider === 'gemini'
    ? (GEMINI_FALLBACK_CHAINS[primaryModel] ?? [])
    : [];
  const modelChain = [primaryModel, ...fallbacks.filter((m: string) => m !== primaryModel)];

  let lastError: any;

  for (const modelId of modelChain) {
    try {
      const result = await withRetry(
        () => callWithAdapter(adapter, config, modelId, prompt, options),
        3,
        `${taskKey}/${modelId}`
      );

      if (modelId !== primaryModel) {
        console.warn(`[provider-router] ${taskKey} succeeded with fallback: ${modelId}`);
      }

      return result;
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.response?.status ?? 0;

      // Non-recoverable errors — skip fallback
      if ([400, 401, 403].includes(status)) throw err;

      if (modelId !== modelChain[modelChain.length - 1]) {
        console.warn(`[provider-router] ${taskKey} model ${modelId} exhausted retries, trying next fallback...`);
      }
    }
  }

  console.error(`[provider-router] ${taskKey} all models failed. Chain: ${modelChain.join(' → ')}`);
  throw lastError;
}

/**
 * Force-clear the config cache (useful after admin saves a config change).
 */
export function clearAIConfigCache() {
  configCacheTime = 0;
}
