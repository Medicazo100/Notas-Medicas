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

// Nueva interfaz para Nota de Evolución SOAP
export interface EvolutionForm {
  folio: string;
  nombre: string;
  edad: string;
  sexo: string;
  cama: string;
  escolaridad: string; 
  ocupacion: string;   
  fechaIngreso: string; 
  fecha: string;
  hora: string;
  medico: string;
  familiarResponsable: string;
  telefonoFamiliar: string; // Nuevo campo
  
  // S - Subjetivo
  subjetivo: string;
  
  // O - Objetivo
  signos: Signos;
  g: Glasgow;
  pupilas: string; 
  resultadosLaboratorio: string;
  exploracionFisica: string;
  
  // A - Análisis
  diagnosticosIngreso: string[]; 
  diagnosticosActivos: string[]; 
  analisis: string;
  pronostico: string;
  pendientes: string; 
  
  // P - Plan
  plan: string;
}

export interface NoteEntry {
  id: number;
  date: string;
  type: 'ingreso' | 'evolucion';
  form: PatientForm | EvolutionForm;
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

export interface AiEvolutionResult {
  observaciones: string[];
  subjetivoMejorado: string;
  diagnosticosSugeridos: DiagnosticoSug[];
  analisisClinico: string;
  planSugerido: string;
}