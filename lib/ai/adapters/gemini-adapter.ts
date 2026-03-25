import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { AICallParams, AIResponse } from '../types.js';

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

let genAI: GoogleGenerativeAI;
function getClient() {
  if (!genAI) {
    if (!process.env.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY not configured');
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return genAI;
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return {
    data: Buffer.from(buffer).toString('base64'),
    mimeType: 'image/jpeg',
  };
}

export async function callGemini(params: AICallParams): Promise<AIResponse> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: params.model,
    generationConfig: {
      temperature: params.temperature,
      topP: 1,
      topK: 1,
      maxOutputTokens: params.maxTokens,
      responseMimeType: 'application/json',
    },
    safetySettings,
    ...(params.systemPrompt ? { systemInstruction: params.systemPrompt } : {}),
  });

  const parts: any[] = [];

  // Handle image: either from base64 or URL
  let imageBase64 = params.imageBase64;
  let imageMimeType = params.imageMimeType || 'image/jpeg';

  if (!imageBase64 && params.imageUrl) {
    const fetched = await urlToBase64(params.imageUrl);
    imageBase64 = fetched.data;
    imageMimeType = fetched.mimeType;
  }

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: imageMimeType,
        data: imageBase64,
      },
    });
  }

  parts.push({ text: params.prompt });

  const result = await model.generateContent(parts);
  const response = result.response;

  return {
    text: response.text(),
    usage: {
      input_tokens: response.usageMetadata?.promptTokenCount || 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
    },
    model: params.model,
    provider: 'gemini',
  };
}
