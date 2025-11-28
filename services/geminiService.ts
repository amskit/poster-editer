import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './storageService';
import { Project, ElementType } from '../types';

const getClient = () => {
  const storedKey = getApiKey();
  const envKey = process.env.API_KEY;
  // Prioritize stored key, trim whitespace
  let apiKey = storedKey ? storedKey.trim() : (envKey ? envKey.trim() : null);
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please setup API Key in Settings.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateBackgroundImage = async (prompt: string): Promise<string> => {
  const ai = getClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
       config: {
        imageConfig: {
          aspectRatio: "1:1", 
        }
       }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
       if (part.inlineData) {
         const base64 = part.inlineData.data;
         return `data:image/png;base64,${base64}`;
       }
    }
    throw new Error("No image generated");
  } catch (error: any) {
    console.error("Gemini Image Gen Error:", error);
    if (error.message?.includes('403') || error.message?.includes('permission')) {
        throw new Error("Permission Denied. Please check your API Key in Settings.");
    }
    throw error;
  }
};

export const generateTextContent = async (prompt: string, language: string): Promise<string> => {
    const ai = getClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a short creative text for a poster about: ${prompt}. Output language: ${language}. Keep it under 15 words.`,
        });
        return response.text || "";
    } catch (error) {
        console.error("Gemini Text Gen Error", error);
        throw error;
    }
}

// Generate a full project JSON structure
export const generateProjectLayout = async (prompt: string, width: number, height: number): Promise<Partial<Project>> => {
    const ai = getClient();
    try {
        const systemPrompt = `
        You are a professional graphic designer. Create a JSON layout for a poster based on the user's request.
        The canvas size is ${width}x${height}.
        Return ONLY a valid JSON object.
        
        Structure:
        {
            "backgroundColor": "#hexcode",
            "elements": [
                {
                    "type": "text",
                    "content": "Headline here",
                    "x": 100, "y": 100, "width": 800, "height": 100,
                    "fontSize": 60, "fontFamily": "Inter, sans-serif", "color": "#hex", "textAlign": "center", "isBold": true
                },
                {
                    "type": "shape",
                    "shapeType": "rectangle",
                    "x": 0, "y": 0, "width": 200, "height": 200,
                    "fillColor": "#hex", "zIndex": 0
                }
            ]
        }
        Do not include images, only text and shapes. Use contrast colors.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt + "\nUser Request: " + prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response");
        
        const data = JSON.parse(text);
        
        // Sanitize and hydrate ID/Types
        const elements = (data.elements || []).map((el: any) => ({
            ...el,
            id: crypto.randomUUID(),
            rotation: el.rotation || 0,
            opacity: el.opacity || 1,
            isLocked: false,
            zIndex: el.zIndex || 1,
            // Defaults
            type: el.type === 'text' ? ElementType.TEXT : ElementType.SHAPE,
            borderWidth: el.borderWidth || 0,
            borderColor: el.borderColor || '#000000',
        }));

        return {
            backgroundColor: data.backgroundColor || '#ffffff',
            elements: elements
        };

    } catch (e) {
        console.error("Layout Gen Error", e);
        throw e;
    }
}