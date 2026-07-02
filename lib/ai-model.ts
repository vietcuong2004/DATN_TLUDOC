export const END_POINT = process.env.AI_ENDPOINT || "https://api.openai.com/v1/chat/completions";

function getOpenAIModelName(modelName?: string) {
  const model = (modelName || process.env.CHATBOT_MODEL || "gpt-4o-mini").trim();
  const trimmed = model.toLowerCase();
  if (trimmed === "gpt-5.4-mini") {
    return "gpt-4o-mini";
  }
  if (trimmed.startsWith("gpt-") || trimmed.startsWith("o1-") || trimmed.startsWith("o3-")) {
    return model;
  }
  return "gpt-4o-mini";
}

export async function callAiModel(
  prompt: string,
  options?: {
    systemInstruction?: string;
    temperature?: number;
    model?: string;
    jsonMode?: boolean;
    maxTokens?: number;
  }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment variables. Please check your .env.local file.");
  }

  const model = getOpenAIModelName(options?.model);
  const messages: any[] = [];
  if (options?.systemInstruction) {
    messages.push({ role: "system", content: options.systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const body: any = {
    model,
    messages,
    temperature: options?.temperature ?? 0.2,
    max_tokens: options?.maxTokens,
  };

  if (options?.jsonMode) {
    body.response_format = { type: "json_object" };
    // OpenAI yêu cầu messages phải chứa từ khóa "json" khi dùng response_format: json_object
    const hasJsonWord = messages.some(m => m.content.toLowerCase().includes("json"));
    if (!hasJsonWord && messages.length > 0) {
      messages[messages.length - 1].content += "\nResponse MUST be in JSON format.";
    }
  }

  const response = await fetch(END_POINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody || "Unknown error"}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content?.trim() || "";
  return content;
}

export async function callAiModelStream(
  prompt: string,
  options?: {
    systemInstruction?: string;
    temperature?: number;
    model?: string;
    maxTokens?: number;
  }
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment variables. Please check your .env.local file.");
  }

  const model = getOpenAIModelName(options?.model);
  const messages: any[] = [];
  if (options?.systemInstruction) {
    messages.push({ role: "system", content: options.systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch(END_POINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody || "Unknown error"}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get reader from response body");
  }

  const decoder = new TextDecoder("utf-8");

  // Giả lập AsyncIterable<{ text: () => string }> tương thích với interface của Gemini SDK
  const asyncIterable = {
    async *[Symbol.asyncIterator]() {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanedLine = line.trim();
            if (!cleanedLine) continue;
            if (cleanedLine === "data: [DONE]") continue;

            if (cleanedLine.startsWith("data: ")) {
              try {
                const jsonStr = cleanedLine.slice(6);
                const parsed = JSON.parse(jsonStr);
                const text = parsed.choices?.[0]?.delta?.content || "";
                if (text) {
                  yield {
                    text: () => text
                  };
                }
              } catch (e) {
                // Bỏ qua dòng dở dang
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
  };

  return {
    stream: asyncIterable
  };
}
