import OpenAI from 'openai';
import type { AICallParams, AIResponse } from '../types';

let client: OpenAI;
function getClient() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured — add it to .env and Vercel env vars');
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function callOpenAI(params: AICallParams): Promise<AIResponse> {
  const openai = getClient();

  const messages: any[] = [];
  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }

  const userContent: any[] = [];
  if (params.imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${params.imageMimeType || 'image/jpeg'};base64,${params.imageBase64}`,
      },
    });
  }
  userContent.push({ type: 'text', text: params.prompt });
  messages.push({ role: 'user', content: userContent });

  const response = await openai.chat.completions.create({
    model: params.model,
    messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
  });

  return {
    text: response.choices[0]?.message?.content || '',
    usage: {
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
    },
    model: params.model,
    provider: 'openai',
  };
}
