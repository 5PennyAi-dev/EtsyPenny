import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const generationConfig = {
    temperature: 0.7,
    topP: 1,
    topK: 1,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Lazy-initialized — avoids crashing at import time in serverless
let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
    if (!_genAI) {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('Missing environment variable GOOGLE_API_KEY');
        _genAI = new GoogleGenerativeAI(apiKey);
    }
    return _genAI;
}

async function urlToGenerativePart(url: string, mimeType: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return {
        inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType,
        },
    };
}

export async function runVisionModel(prompt: string, imageUrl: string) {
    const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash", generationConfig, safetySettings });
    const imagePart = await urlToGenerativePart(imageUrl, "image/jpeg");
    const result = await model.generateContent([prompt, imagePart]);
    return result.response.text();
}

export async function runTextModel(prompt: string) {
    const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash", generationConfig, safetySettings });
    const result = await model.generateContent(prompt);
    return result.response.text();
}
