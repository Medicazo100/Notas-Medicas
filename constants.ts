import { PatientForm, EvolutionForm } from './types';
import { User, Stethoscope, HeartPulse, History, ClipboardPlus, Activity, FileText } from 'lucide-react';

export const INITIAL_FORM: PatientForm = {
  folio: '', nombre: '', fn: '', edad: '', sexo: '', domicilio: '', telefono: '', 
  escolaridad: '', ocupacion: '', estadoCivil: '', responsable: '', medicoTratante: '', cedulaProfesional: '',
  sintomaPrincipal: '', tiempoEvolucion: '', padecimientoActual: '',
  signos: { ta: '', fc: '', fr: '', temp: '', sat: '', gluc: '', peso: '', talla: '', imc: '' },
  g: { o: 4, v: 5, m: 6 }, pupilas: 'Isocóricas',
  exploracion: 'Describe aqui una exploracion fisica completa,sistematica y detallada del paciente', 
  antecedentes: [], alergias: 'Negados', tabaquismo: 'Negado', alcohol: 'Negado', 
  gpac: { g: 0, p: 0, a: 0, c: 0 }, diagnostico: [], pronostico: '', plan: '', firmaDataURL: null,
};

export const INITIAL_EVOLUTION_FORM: EvolutionForm = {
  folio: '', nombre: '', edad: '', sexo: '', cama: '', fechaIngreso: '', fecha: '', hora: '', 
  medico: 'Dr. Gabriel Méndez Ortiz - Céd. Prof. 7630204',
  subjetivo: '',
  signos: { ta: '', fc: '', fr: '', temp: '', sat: '', gluc: '', peso: '', talla: '', imc: '' },
  g: { o: 4, v: 5, m: 6 },
  pupilas: 'Isocóricas', // Valor por defecto
  resultadosLaboratorio: '',
  exploracionFisica: '',
  diagnosticosIngreso: [], // Inicializar vacio
  diagnosticosActivos: [], // Inicializar vacio
  analisis: '',
  pronostico: '',
  pendientes: '', // Nuevo campo
  planDieta: '',
  planHidratacion: '',
  planMedicamentos: '',
  planCuidados: 'Signos vitales por turno y cuidados generales de enfermería.',
  planEstudios: '',
  planIndicaciones: ''
};

export const SIGNOS_LABELS: Record<string, string> = { ta: 'TA', fc: 'FC', fr: 'FR', temp: 'Temp', sat: 'SatO₂', gluc: 'Gluc', peso: 'Peso', talla: 'Talla', imc: 'IMC' };
export const SIGNOS_UNITS: Record<string, string> = { ta: 'mmHg', fc: 'lpm', fr: 'rpm', temp: '°C', sat: '%', gluc: 'mg/dL', peso: 'kg', talla: 'cm', imc: '' };
export const SIGNOS_ORDER = ['ta', 'fc', 'fr', 'temp', 'sat', 'gluc', 'peso', 'talla', 'imc'];
export const ANTECEDENTES_OPTS = ['DM2', 'HAS', 'EPOC/Asma', 'Cáncer', 'Ninguno'];

export const PENDIENTES_OPTS = [
  'Laboratorios Control', 
  'Imagen (Rx/TAC)', 
  'Interconsulta', 
  'Transfusión', 
  'Cirugía', 
  'Traslado', 
  'Recabar Reportes',
  'Valoración Cardio'
];

// Botones rápidos de diagnóstico basados en la imagen
export const DX_PRESETS = [
  { code: 'R10.4', label: 'Dolor abdominal' },
  { code: 'J18.9', label: 'Neumonía' },
  { code: 'I21.9', label: 'IAM' },
  { code: 'A09', label: 'Gastroenteritis' },
  { code: 'I10', label: 'Hipertensión' },
  { code: 'E11.9', label: 'DM2' },
  { code: 'S06.9', label: 'Traumatismo craneal' },
  { code: 'N39.0', label: 'IVU' },
  { code: 'E87.8', label: 'Desequilibrio hidroel.' },
  { code: 'D64.9', label: 'Anemia' },
  { code: 'K92.2', label: 'Hemorragia GI' },
  { code: 'N18.0', label: 'Insuf. Renal' },
  { code: 'I63.x', label: 'EVC Isquémico' },
  { code: 'I61.x', label: 'EVC Hemorrágico' },
  { code: 'I64', label: 'EVC No esp.' }
];

export const PRONOSTICO_OPTS = ['Bueno', 'Regular', 'Malo', 'Reservado'];

export const SUGERENCIAS_DX = [
  'R10.4 – Otros dolores abdominales y los no especificados',
  'J18.9 – Neumonía, no especificada', 
  'I21.9 – Infarto agudo del miocardio, sin otra especificación', 
  'A09 – Diarrea y gastroenteritis de presunto origen infeccioso', 
  'I10 – Hipertensión esencial (primaria)', 
  'E11.9 – Diabetes mellitus tipo 2 sin complicaciones', 
  'S06.9 – Traumatismo intracraneal, no especificado'
];

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const SEMIOLOGIA_TAGS = ['Inicio:', 'Forma de presentación:', 'Evolución:', 'Síntomas acompañantes:'];

export const EXPLORACION_PLANTILLAS: Record<string, string> = {
  'Cabeza y cuello': 'Cráneo normocéfalo, cuero cabelludo sin lesiones. Ojos con conjuntivas normocoloreadas y pupilas isocóricas y reactivas. Cavidad oral y faringe sin alteraciones aparentes. Cuello sin adenomegalias palpables, sin ingurgitación yugular, con adecuada movilidad cervical. Tiroides no palpable/sin datos patológicos aparentes.',
  'Cardio/Pulmonar': 'Ruidos cardíacos rítmicos de buen tono e intensidad, sin soplos. Campos pulmonares con murmullo vesicular presente, sin agregados.',
  'Abdomen': 'Abdomen blando, depresible, no doloroso a la palpación superficial ni profunda, peristalsis normoaudible, sin visceromegalias ni datos de irritación peritoneal.',
  'Neurológico': 'Paciente consciente, orientado en sus tres esferas. Funciones mentales superiores conservadas. Pares craneales íntegros. Fuerza 5/5 y sensibilidad conservada en 4 extremidades.',
  'Extremidades': 'Extremidades íntegras, simétricas, eutróficas. Pulsos distales presentes y sincrónicos. Llenado capilar inmediato. Sin edema.',
  'Piel y tegumentos': 'Piel y tegumentos:\nPiel íntegra, normocoloreada, normohidratada, normotérmica, sin presencia de lesiones, equimosis, exantemas ni úlceras. Llenado capilar conservado.',
};

export const STEPS_CONFIG = [
  { id: 1, label: 'Datos', icon: User },
  { id: 2, label: 'Motivo', icon: Stethoscope },
  { id: 3, label: 'Signos', icon: HeartPulse },
  { id: 4, label: 'Anteced.', icon: History },
  { id: 5, label: 'Plan', icon: ClipboardPlus },
];

export const EVOLUTION_STEPS = [
  { id: 1, label: 'Datos', icon: User },
  { id: 2, label: 'Subjetivo', icon: FileText },
  { id: 3, label: 'Objetivo', icon: HeartPulse },
  { id: 4, label: 'Análisis', icon: Activity },
  { id: 5, label: 'Plan', icon: ClipboardPlus },
];