import { GoogleGenAI } from "@google/genai";

/**
 * Shared initialization for the Gemini client
 */
const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Translates text into the target language using specialized Urdu logic via Gemini
 */
export const translateText = async (text: string, targetLanguage: string = "Roman Urdu"): Promise<string> => {
  if (!text || !text.trim()) return "";
  
  let instruction = "";
  if (targetLanguage === "Roman Urdu") {
      instruction = `Translate the user's text into Roman Urdu (Urdu written with English alphabet, e.g., "Kya haal hai?"). Return ONLY the translated text.`;
  } else if (targetLanguage === "Urdu (Native)") {
      instruction = `Translate the user's text into Urdu script (Nastaliq characters). Return ONLY the translated text.`;
  } else {
      instruction = `Translate the user's text into "${targetLanguage}". Return ONLY the translated text.`;
  }
  
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: instruction,
        temperature: 0.2
      }
    });
    return response.text?.trim() || "Translation failed.";
  } catch (error) {
    console.error("Gemini Backend Translation Error:", error);
    return "Translation unavailable.";
  }
};

/**
 * Gets a conversational response from the AI assistant via Gemini
 */
export const getBotResponse = async (userMessage: string): Promise<string> => {
  if (!userMessage || !userMessage.trim()) return "I can't read empty messages!";

  const systemInstruction = "You are a helpful AI assistant inside Shadow Messenger. Keep responses concise (under 2 sentences).";

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7
      }
    });
    return response.text?.trim() || "I'm speechless!";
  } catch (e: any) {
    console.error("Gemini Backend Bot Error:", e);
    return "I'm currently offline. Try again later.";
  }
}

export const generateSmartReplies = async () => [];
export const analyzeSentiment = async () => 'neutral';
