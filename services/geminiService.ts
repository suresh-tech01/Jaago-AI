import { GoogleGenAI, Type } from "@google/genai";
import { Persona } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// gemini-3-flash-preview supports text, images, and audio.
const MODEL_NAME = 'gemini-3-flash-preview';

export const verifyChanting = async (audioBase64: string): Promise<{ passed: boolean; message: string }> => {
  try {
    const prompt = `Listen to this audio. Is the person chanting the name "Radha" or "Radhe" repeatedly? 
    It is a wake-up task. They must be saying it clearly.
    Return JSON: { "passed": true/false, "message": "feedback" }`;
    
    // Extract mime type dynamically
    const mimeMatch = audioBase64.match(/^data:(audio\/[a-zA-Z0-9.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "audio/wav";
    const data = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passed: { type: Type.BOOLEAN },
            message: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      passed: result.passed ?? false,
      message: result.message || "Could not verify chant."
    };
  } catch (error) {
    console.error("Chant Verification Error:", error);
    return { passed: false, message: "Error verifying audio." };
  }
};

export const generateMotivationalQuote = async (persona: Persona): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Give a short, punchy, wake-up call (1 sentence) for a ${persona}. Be strict but encouraging.`
    });
    return response.text || "Wake up! Time to conquer the world.";
  } catch (e) {
    return "Wake up! You got this.";
  }
};

export const verifyAwakeFace = async (imageBase64: string): Promise<{ passed: boolean; message: string }> => {
  try {
    const prompt = "Analyze this selfie. Does the person look awake with their eyes open? If yes, return true. If they look asleep, drowsy, or eyes are closed, return false. Provide a very short reason.";
    
    // Extract mime type dynamically
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const data = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passed: { type: Type.BOOLEAN },
            message: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      passed: result.passed ?? false,
      message: result.message || "Could not verify face."
    };
  } catch (error) {
    console.error("Face Check Error:", error);
    return { passed: false, message: "Error analyzing photo. Try again with better lighting." };
  }
};

export const verifyQRCodeOrObject = async (imageBase64: string): Promise<{ passed: boolean; message: string }> => {
  try {
    const prompt = "Does this image contain a visible QR code or a bathroom object (like a toothbrush, sink, or mirror)? Return true if yes.";
    
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const data = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passed: { type: Type.BOOLEAN },
            message: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      passed: result.passed ?? false,
      message: result.message || "No QR code or bathroom object detected."
    };
  } catch (error) {
    return { passed: false, message: "Scan failed. Please try again." };
  }
};

export const verifySpeech = async (audioBase64: string, targetSentence: string): Promise<{ passed: boolean; message: string }> => {
  try {
    const prompt = `Listen to this audio. Did the user say the phrase: "${targetSentence}" clearly and loudly? Ignore background noise. Return true if it matches reasonably well.`;
    
    // Extract mime type dynamically
    const mimeMatch = audioBase64.match(/^data:(audio\/[a-zA-Z0-9.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "audio/wav";
    const data = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passed: { type: Type.BOOLEAN },
            message: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      passed: result.passed ?? false,
      message: result.message || "Could not understand audio."
    };

  } catch (error) {
    console.error("Speech Check Error:", error);
    return { passed: false, message: "Audio verification failed. Try speaking louder." };
  }
};

export const getReadingChallenge = async (): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: "Give me a powerful, short, and highly motivational quote to read aloud right after waking up. It should be energizing and inspiring. Do not include the author's name or quotation marks, just the quote text itself. Maximum 15 words.",
        });
        return response.text?.trim() || "I am awake and ready to conquer the day.";
    } catch(e) {
        return "I am awake and ready to conquer the day.";
    }
}