/**
 * Standardized call to Groq API using fetch
 */
const callGroq = async (systemInstruction: string, userMessage: string) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("Groq API Key is missing from process.env.API_KEY");
        return "";
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.2,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (e) {
        console.error("Groq API Error:", e);
        return "";
    }
};

/**
 * Translates text into target language with specialized logic for Urdu variations.
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
        const translated = await callGroq(instruction, text);
        return translated || text;
    } catch (error) {
        console.error("Translation Error:", error);
        return "Translation unavailable.";
    }
};

/**
 * Gets a conversational response from the AI assistant
 */
export const getBotResponse = async (userMessage: string): Promise<string> => {
    if (!userMessage || !userMessage.trim()) return "";

    const systemInstruction = "You are Shadow, a helpful and stylish AI messenger assistant. You are integrated into a high-end social messaging app. Keep responses short (1-2 sentences) and use emojis naturally.";

    try {
        const response = await callGroq(systemInstruction, userMessage);
        return response || "I'm here to help!";
    } catch (e) {
        console.error("Groq Bot Error:", e);
        return "I'm having a bit of trouble thinking right now. Try again soon!";
    }
};

export const generateSmartReplies = async () => [];
export const analyzeSentiment = async () => 'neutral';
