import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment variables. Please check your .env.local file.");
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }

  return genAI;
}

export function getGeminiModelName(configuredModel?: string): string {
  const model = (configuredModel || process.env.CHATBOT_MODEL || "gemini-2.5-flash").trim();
  if (model === "openai" || model === "gemini") {
    return "gemini-2.5-flash";
  }
  return model;
}

export async function callGemini(
  prompt: string,
  options?: {
    systemInstruction?: string;
    temperature?: number;
    model?: string;
    jsonMode?: boolean;
    maxTokens?: number;
  }
): Promise<string> {
  const client = getGeminiClient();
  const modelName = getGeminiModelName(options?.model);
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: options?.systemInstruction,
  });

  const responseMimeType = options?.jsonMode ? "application/json" : undefined;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.2,
      maxOutputTokens: options?.maxTokens,
      responseMimeType,
    },
  });

  const response = await result.response;
  return response.text();
}

export async function callGeminiStream(
  prompt: string,
  options?: {
    systemInstruction?: string;
    temperature?: number;
    model?: string;
    maxTokens?: number;
  }
) {
  const client = getGeminiClient();
  const modelName = getGeminiModelName(options?.model);
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: options?.systemInstruction,
  });

  const resultStream = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.2,
      maxOutputTokens: options?.maxTokens,
    },
  });

  return resultStream;
}
