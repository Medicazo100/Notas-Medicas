export interface Signos {
  ta: string;
  fc: string;
  fr: string;
  temp: string;
  sat: string;
  gluc: string;
  peso: string;
  talla: string;
  imc: string;
}

export interface Glasgow {
  o: number | string;
  v: number | string;
  m: number | string;
}

export interface Gpac {
  g: number | string;
  p: number | string;
  a: number | string;
  c: number | string;
}

export interface PatientForm {
  folio: string;
  nombre: string;
  fn: string;
  edad: string;
  sexo: string;
  domicilio: string;
  telefono: string;
  escolaridad: string;
  ocupacion: string;
  estadoCivil: string;
  responsable: string;
  medicoTratante: string;
  cedulaProfesional: string;
  sintomaPrincipal: string;
  tiempoEvolucion: string;
  padecimientoActual: string;
  signos: Signos;
  g: Glasgow;
  pupilas: string;
  exploracion: string;
  antecedentes: string[];
  alergias: string;
  tabaquismo: string;
  alcohol: string;
  gpac: Gpac;
  diagnostico: string[];
  pronostico: string;
  plan: string;
  firmaDataURL: string | null;
}

export interface NoteEntry {
  id: number;
  date: string;
  form: PatientForm;
}

export interface DiagnosticoSug {
  codigo: string;
  nombre: string;
  justificacion: string;
}

export interface AiAnalysisResult {
  observaciones: string[];
  padecimientoMedico: string;
  diagnosticosSugeridos: DiagnosticoSug[];
  planEstructurado: string;
}

// Extend Window for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}