import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PatientForm, AiAnalysisResult } from "../types";

export const AiService = {
  analyze: async (formData: PatientForm): Promise<AiAnalysisResult | null> => {
    if (!process.env.API_KEY) {
      console.error("API Key not found");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        critique: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Lista de observaciones sobre datos faltantes o incongruentes."
        },
        improvedMotivo: {
          type: Type.STRING,
          description: "Redacción mejorada y profesional del Padecimiento Actual."
        },
        improvedPlan: {
          type: Type.STRING,
          description: "Plan de manejo estructurado sugerido."
        },
        differentialDx: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Lista de 3 diagnósticos diferenciales con código CIE-10."
        }
      },
      required: ["critique", "improvedMotivo", "improvedPlan", "differentialDx"]
    };

    const prompt = `Actúa como un médico especialista de alto nivel. Analiza esta nota de ingreso hospitalario:
    ${JSON.stringify(formData)}
    
    Tu tarea es generar un análisis clínico automatizado que incluya observaciones de calidad, una redacción médica superior para el padecimiento, un plan de manejo detallado y diagnósticos diferenciales relevantes.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      
      const text = response.text;
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error("Service Error:", error);
      return null;
    }
  },

  parseData: async (textInput: string): Promise<Partial<PatientForm> | null> => {
    if (!process.env.API_KEY || !textInput.trim()) return null;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        nombre: { type: Type.STRING },
        edad: { type: Type.STRING },
        sexo: { type: Type.STRING },
        sintomaPrincipal: { type: Type.STRING },
        padecimientoActual: { type: Type.STRING },
        signos: {
          type: Type.OBJECT,
          properties: {
            ta: { type: Type.STRING },
            fc: { type: Type.STRING },
            fr: { type: Type.STRING },
            temp: { type: Type.STRING },
            sat: { type: Type.STRING },
            gluc: { type: Type.STRING },
            peso: { type: Type.STRING },
            talla: { type: Type.STRING },
          }
        },
        g: {
          type: Type.OBJECT,
          properties: {
            o: { type: Type.INTEGER },
            v: { type: Type.INTEGER },
            m: { type: Type.INTEGER },
          }
        },
        exploracion: { type: Type.STRING },
        antecedentes: { type: Type.ARRAY, items: { type: Type.STRING } },
        diagnostico: { type: Type.ARRAY, items: { type: Type.STRING } },
        plan: { type: Type.STRING }
      }
    };

    const prompt = `Analiza el siguiente texto médico y extrae la información estructurada para el sistema de notas.
    Texto: "${textInput}"`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      
      const text = response.text;
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error("Parsing Error:", error);
      return null;
    }
  }
};