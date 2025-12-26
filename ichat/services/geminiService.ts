import { GoogleGenAI } from "@google/genai";

/**
 * Initialize Gemini AI with the API Key from environment variables.
 * The key is managed externally and injected via process.env.API_KEY.
 */
const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Translates text into target language with specialized logic for Urdu variations.
 * Uses gemini-3-flash-preview for efficient and accurate translation.
 */
export const translateText = async (text: string, targetLanguage: string = "Roman Urdu"): Promise<string> => {
  if (!text || !text.trim()) return "";
  
  let instruction = "";
  if (targetLanguage === "Roman Urdu") {
    instruction = `Translate the provided text to Roman Urdu (Urdu written in Latin/English characters). e.g., "How are you?" -> "Aap kaise hain?". Return ONLY the translation.`;
  } else if (targetLanguage === "Urdu (Native)") {
    instruction = `Translate the provided text to Urdu script (Arabic/Nastaliq characters). Return ONLY the translated Urdu text.`;
  } else {
    instruction = `Translate the user's text into "${targetLanguage}". Return ONLY the translated text, nothing else.`;
  }
  
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: instruction,
        temperature: 0.1, // Low temperature for high accuracy in translation
      },
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return "Translation unavailable.";
  }
};

/**
 * Gets a conversational response from the AI assistant ("Shadow").
 * Optimized for short, stylish messenger interactions.
 */
export const getBotResponse = async (userMessage: string): Promise<string> => {
  if (!userMessage || !userMessage.trim()) return "";

  const systemInstruction = "You are Shadow, a helpful and stylish AI messenger assistant. You are integrated into a high-end social messaging app. Keep responses short (1-2 sentences) and use emojis naturally.";

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text?.trim() || "I'm here to help!";
  } catch (e) {
    console.error("Gemini Bot Error:", e);
    return "I'm having a bit of trouble thinking right now. Try again soon!";
  }
};

export const generateSmartReplies = async () => [];
export const analyzeSentiment = async () => 'neutral';
