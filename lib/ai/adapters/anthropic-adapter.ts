import Anthropic from '@anthropic-ai/sdk';
import type { AICallParams, AIResponse } from '../types.js';

let client: Anthropic;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured — add it to .env and Vercel env vars');
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function callAnthropic(params: AICallParams): Promise<AIResponse> {
  const anthropic = getClient();

  const content: any[] = [];

  if (params.imageBase64) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: params.imageMimeType || 'image/jpeg',
        data: params.imageBase64,
      },
    });
  }
  content.push({ type: 'text', text: params.prompt });

  const response = await anthropic.messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    system: params.systemPrompt || undefined,
    messages: [{ role: 'user', content }],
  });

  const text = response.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');

  return {
    text,
    usage: {
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
    },
    model: params.model,
    provider: 'anthropic',
  };
}
