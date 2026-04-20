export interface AICallParams {
  model: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  imageBase64?: string;
  imageMimeType?: string;
  imageUrl?: string;
  systemPrompt?: string;
}

export interface AIResponse {
  text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
  provider: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIStreamParams {
  model: string;
  messages: AIMessage[];
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  signal?: AbortSignal;
}

export type StreamChunk =
  | { type: 'delta'; text: string }
  | {
      type: 'done';
      tokensInput?: number;
      tokensOutput?: number;
    }
  | { type: 'error'; message: string };
