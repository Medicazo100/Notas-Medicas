import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PatientForm, AiAnalysisResult, EvolutionForm, AiEvolutionResult } from "../types";

export const AiService = {
  analyze: async (formData: PatientForm): Promise<AiAnalysisResult | null> => {
    if (!process.env.API_KEY) {
      console.error("API Key not found");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Schema estricto para asegurar estructura
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        observaciones: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Lista de incongruencias clínicas, datos faltantes críticos o mejoras necesarias en la semiología."
        },
        padecimientoMedico: {
          type: Type.STRING,
          description: "Narrativa clínica MEJORADA y REESCRITA. Debe ser cronológica, usar terminología médica técnica, ser congruente con los signos vitales y corregir errores de redacción del original."
        },
        diagnosticosSugeridos: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              codigo: { type: Type.STRING, description: "Código CIE-10 exacto" },
              nombre: { type: Type.STRING, description: "Nombre estándar del diagnóstico CIE-10" },
              justificacion: { type: Type.STRING, description: "Breve justificación clínica basada en los datos presentados." }
            }
          },
          description: "3 a 5 diagnósticos CIE-10 ordenados por prioridad clínica."
        },
        planEstructurado: {
          type: Type.STRING,
          description: "Plan de manejo formateado estrictamente en este orden: 1. Dieta, 2. SV y CGE, 3. Soluciones, 4. Medicamentos, 5. Labs/Gabinete, 6. Otras, 7. Eventualidades."
        }
      },
      required: ["observaciones", "padecimientoMedico", "diagnosticosSugeridos", "planEstructurado"]
    };

    const prompt = `Actúa como un Jefe de Servicio de Medicina Interna revisando una nota de ingreso.
    
    INFORMACIÓN RECABADA DEL PACIENTE:
    ${JSON.stringify(formData)}

    TU OBJETIVO:
    Analizar, corregir y mejorar la información para generar una nota de ingreso de CALIDAD INTERNACIONAL.

    INSTRUCCIONES ESPECÍFICAS PARA CADA SECCIÓN:

    1. **Padecimiento Actual (Reescritura Profesional)**: 
       - Toma el texto original (aunque sea breve o desordenado) y redáctalo de nuevo.
       - Usa terminología médica avanzada (ej. cambiar "dolor de panza" por "dolor abdominal", "vomitó sangre" por "hematemesis").
       - Asegura la congruencia cronológica (inicio, evolución, estado actual).
       - Integra los antecedentes relevantes en la narrativa si explican el cuadro actual.

    2. **Diagnósticos (CIE-10)**:
       - Sugiere diagnósticos precisos basados en la clínica.
       - Si el diagnóstico es obvio pero no está explícito, agrégalo.

    3. **Plan de Manejo (Orden Obligatorio)**:
       - Genera un plan completo y congruente con el diagnóstico.
       - DEBES seguir este orden exacto:
         1. Tipo de dieta.
         2. SV (Signos Vitales) y CGE (Cuidados Generales de Enfermería).
         3. Soluciones parenterales (calculadas si es posible o indicadas según patología).
         4. Medicamentos (Nombre, dosis, vía, horario).
         5. Laboratorios y Gabinete solicitados.
         6. Otras indicaciones (Posición, oxigenoterapia, etc.).
         7. Criterios de alarma y Reportar eventualidades.

    4. **Observaciones (Auditoría)**:
       - Si hay datos vitales incompatibles con la vida o contradicciones (ej. "Paciente inconsciente" con "Glasgow 15"), señálalo aquí.

    Genera un resultado listo para ser aplicado al expediente clínico.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      
      // Limpieza robusta de JSON
      const rawText = response.text || "{}";
      const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      console.error("Service Error:", error);
      return null;
    }
  },

  analyzeEvolution: async (evoData: EvolutionForm): Promise<AiEvolutionResult | null> => {
    if (!process.env.API_KEY) return null;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        observaciones: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Lista crítica de datos faltantes, incongruencias entre signos vitales y narrativa, o riesgos no detectados."
        },
        subjetivoMejorado: { 
          type: Type.STRING,
          description: "Reescritura profesional del apartado Subjetivo. Debe integrar cronología, sintomatología y evolución respecto al ingreso."
        },
        diagnosticosSugeridos: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              codigo: { type: Type.STRING },
              nombre: { type: Type.STRING },
              justificacion: { type: Type.STRING }
            }
          }
        },
        analisisClinico: { 
          type: Type.STRING, 
          description: "Integración clínica (Apartado 'A'). Debe justificar la mejoría o empeoramiento basándose en el subjetivo y objetivo (signos/labs). Mencionar pronóstico."
        },
        planSugerido: { 
          type: Type.STRING,
          description: "Plan de manejo detallado y escalonado (Dieta, Soluciones, Medicamentos, Pendientes)."
        }
      },
      required: ["observaciones", "subjetivoMejorado", "diagnosticosSugeridos", "analisisClinico", "planSugerido"]
    };

    const prompt = `Actúa como un Médico Internista Experto auditando y mejorando una Nota de Evolución (SOAP).
    
    DATOS DEL PACIENTE (Evolución):
    ${JSON.stringify(evoData)}

    TU TAREA:
    1. **Observaciones (Auditoría)**: Detecta qué falta. ¿La frecuencia cardiaca coincide con la fiebre? ¿Falta cuantificar uresis? ¿El plan coincide con el diagnóstico?
    2. **Subjetivo (Mejorado)**: Redacta el padecimiento actual/evolución con lenguaje técnico.
    3. **Diagnósticos**: Actualiza los diagnósticos activos CIE-10 basándote en la evolución.
    4. **Análisis**: Redacta una integración clínica congruente. "Paciente femenino de X años cursando con X día de estancia intrahospitalaria por X patología..."
    5. **Plan**: Estructura el plan de manejo (Dieta, Soluciones, Medicamentos, Labs).

    Genera una respuesta estructurada JSON.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      const rawText = response.text || "{}";
      const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (e) { console.error(e); return null; }
  }
};