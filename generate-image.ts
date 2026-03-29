import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

async function generateImage() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    console.log("Generating image...");
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            text: 'A sleek, modern smartphone displaying a futuristic dark-mode alarm clock app named "Jaago AI", sitting on a wooden nightstand in a dimly lit bedroom with morning sunlight just starting to peek through the blinds. High-tech, minimalist, cinematic lighting, photorealistic.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        const buffer = Buffer.from(base64EncodeString, 'base64');
        const publicDir = path.join(process.cwd(), 'public');
        
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir);
        }
        
        const filePath = path.join(publicDir, 'jaago-ai-linkedin.png');
        fs.writeFileSync(filePath, buffer);
        console.log(`Image saved to ${filePath}`);
        break;
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
}

generateImage();
