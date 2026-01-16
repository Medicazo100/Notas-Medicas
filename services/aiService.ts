import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PatientForm, AiAnalysisResult } from "../types";

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
    
    // Schema completo para mapear TODOS los campos del formulario para restauración completa
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        // Datos de Identificación
        folio: { type: Type.STRING },
        nombre: { type: Type.STRING },
        fn: { type: Type.STRING, description: "Fecha de nacimiento en formato YYYY-MM-DD" },
        edad: { type: Type.STRING },
        sexo: { type: Type.STRING },
        domicilio: { type: Type.STRING },
        telefono: { type: Type.STRING },
        escolaridad: { type: Type.STRING },
        ocupacion: { type: Type.STRING },
        estadoCivil: { type: Type.STRING },
        responsable: { type: Type.STRING },
        
        // Datos del Médico
        medicoTratante: { type: Type.STRING },
        cedulaProfesional: { type: Type.STRING },
        
        // Motivo
        sintomaPrincipal: { type: Type.STRING },
        tiempoEvolucion: { type: Type.STRING },
        padecimientoActual: { type: Type.STRING },
        
        // Signos Vitales
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
            imc: { type: Type.STRING },
          }
        },
        
        // Glasgow y Pupilas
        g: {
          type: Type.OBJECT,
          properties: {
            o: { type: Type.INTEGER },
            v: { type: Type.INTEGER },
            m: { type: Type.INTEGER },
          }
        },
        pupilas: { type: Type.STRING },
        
        // Exploración
        exploracion: { type: Type.STRING },
        
        // Antecedentes
        antecedentes: { type: Type.ARRAY, items: { type: Type.STRING } },
        alergias: { type: Type.STRING },
        tabaquismo: { type: Type.STRING },
        alcohol: { type: Type.STRING },
        
        // Diagnostico y Plan
        diagnostico: { type: Type.ARRAY, items: { type: Type.STRING } },
        pronostico: { type: Type.STRING },
        plan: { type: Type.STRING }
      }
    };

    const prompt = `Analiza el siguiente texto (que puede ser un reporte de WhatsApp o notas sueltas) y extrae TODA la información posible para llenar la nota médica.
    
    INSTRUCCIONES CRÍTICAS:
    1. Busca datos administrativos específicos: Folio, Domicilio, Teléfono, Responsable, Cédula Profesional, Médico, Escolaridad, Ocupación.
    2. Busca datos clínicos detallados.
    3. Si el texto contiene etiquetas explicitas (ej: "Folio: 123"), úsalas con prioridad.
    
    Texto a analizar: "${textInput}"`;

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