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
