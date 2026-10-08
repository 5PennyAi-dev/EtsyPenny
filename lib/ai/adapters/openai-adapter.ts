import OpenAI from 'openai';
import type { AICallParams, AIResponse } from '../types.js';

const OPENAI_STRUCTURED_OUTPUT_MODELS = new Set([
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4o-2024-08-06',
  'gpt-4o-mini-2024-07-18',
]);
const MAX_OUTPUT_TOKENS = 16_384;

let client: OpenAI;
function getClient() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured — add it to .env and Vercel env vars');
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAI vision image (${response.status})`);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0].trim();
  const mimeType = contentType && contentType.startsWith('image/') ? contentType : 'image/jpeg';
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error('OpenAI vision image is empty');
  }

  return { data: Buffer.from(buffer).toString('base64'), mimeType };
}

function validateStructuredOutputParameters(params: AICallParams) {
  if (!params.structuredOutput) return;

  if (!OPENAI_STRUCTURED_OUTPUT_MODELS.has(params.model)) {
    throw new Error(
      `OpenAI model "${params.model}" is not verified for visual-analysis Structured Outputs`,
    );
  }
  if (!Number.isFinite(params.temperature) || params.temperature < 0 || params.temperature > 2) {
    throw new Error('OpenAI temperature must be between 0 and 2');
  }
  if (!Number.isInteger(params.maxTokens) || params.maxTokens < 1 || params.maxTokens > MAX_OUTPUT_TOKENS) {
    throw new Error(`OpenAI max_tokens must be an integer between 1 and ${MAX_OUTPUT_TOKENS}`);
  }
}

export async function callOpenAI(params: AICallParams): Promise<AIResponse> {
  const openai = getClient();
  validateStructuredOutputParameters(params);

  const messages: any[] = [];
  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }

  const userContent: any[] = [];
  let imageBase64 = params.imageBase64;
  let imageMimeType = params.imageMimeType || 'image/jpeg';
  if (!imageBase64 && params.imageUrl) {
    const image = await urlToBase64(params.imageUrl);
    imageBase64 = image.data;
    imageMimeType = image.mimeType;
  }

  if (imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${imageMimeType};base64,${imageBase64}`,
      },
    });
  }
  userContent.push({ type: 'text', text: params.prompt });
  messages.push({ role: 'user', content: userContent });

  const response = await openai.chat.completions.create({
    model: params.model,
    messages,
    temperature: params.temperature,
    // max_tokens is deprecated for current Chat Completions models.
    max_completion_tokens: params.maxTokens,
    ...(params.structuredOutput ? {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: params.structuredOutput.name,
          strict: true,
          schema: params.structuredOutput.schema,
        },
      },
    } : {}),
  } as any);

  const choice = response.choices[0];
  if (!choice) {
    throw new Error('OpenAI returned no completion choice');
  }
  if (choice.message.refusal) {
    throw new Error(`OpenAI refused visual analysis: ${choice.message.refusal}`);
  }
  if (choice.finish_reason !== 'stop') {
    throw new Error(`OpenAI visual analysis was incomplete (finish_reason: ${choice.finish_reason ?? 'unknown'})`);
  }
  if (!choice.message.content?.trim()) {
    throw new Error('OpenAI returned an empty visual analysis response');
  }

  return {
    text: choice.message.content,
    usage: {
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
    },
    model: params.model,
    provider: 'openai',
  };
}
