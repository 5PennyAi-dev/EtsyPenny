import { supabaseAdmin } from '../supabase/server.js';
import { callGemini } from './adapters/gemini-adapter.js';
import { callAnthropic } from './adapters/anthropic-adapter.js';
import { callOpenAI } from './adapters/openai-adapter.js';
import type { AICallParams, AIResponse } from './types.js';

// In-memory cache for task configs
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

const adapters: Record<string, (params: AICallParams) => Promise<AIResponse>> = {
  gemini: callGemini,
  anthropic: callAnthropic,
  openai: callOpenAI,
};

/**
 * Main entry point for all AI calls in PennySEO.
 *
 * @param taskKey - Matches a row in system_ai_config (e.g. 'keyword_generation')
 * @param prompt - The user/task prompt text
 * @param options - Optional: image data, system prompt, parameter overrides
 */
export async function runAI(
  taskKey: string,
  prompt: string,
  options?: {
    imageBase64?: string;
    imageMimeType?: string;
    imageUrl?: string;
    systemPrompt?: string;
    temperatureOverride?: number;
    maxTokensOverride?: number;
  }
): Promise<AIResponse> {
  const config = await getTaskConfig(taskKey);
  const adapter = adapters[config.provider];

  if (!adapter) {
    throw new Error(`[provider-router] Unknown AI provider "${config.provider}" for task "${taskKey}"`);
  }

  const params: AICallParams = {
    model: config.model_id,
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

/**
 * Force-clear the config cache (useful after admin saves a config change).
 */
export function clearAIConfigCache() {
  configCacheTime = 0;
}
