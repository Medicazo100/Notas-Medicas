import React, { useState, useEffect, useRef } from 'react';
import { 
  Moon, Sun, Download, Trash2, CheckCircle, ChevronLeft, ChevronRight, 
  Check, Sparkles, Loader2, AlertTriangle, Plus, X, 
  Archive, FileUp, User, Stethoscope, HeartPulse, History, ClipboardPlus, Share2, QrCode, Wand2, Eye,
  AlertOctagon, BookOpen, Activity, FileText, ArrowRight, UserCheck, Edit3, Coffee, Droplets, Copy, RotateCcw
} from 'lucide-react';

import { AuroraStyles } from './components/AuroraStyles';
import { SectionTitle, Label, Input, Select, TextArea } from './components/UIComponents';
import { AiService } from './services/aiService';
import { StorageService } from './services/storageService';
import { INITIAL_FORM, INITIAL_EVOLUTION_FORM, SIGNOS_ORDER, SIGNOS_LABELS, SIGNOS_UNITS, MONTHS, SEMIOLOGIA_TAGS, EXPLORACION_PLANTILLAS, ANTECEDENTES_OPTS, SUGERENCIAS_DX, DX_PRESETS, PRONOSTICO_OPTS, PENDIENTES_OPTS, STEPS_CONFIG, EVOLUTION_STEPS } from './constants';
import { PatientForm, EvolutionForm, AiAnalysisResult, NoteEntry, AiEvolutionResult } from './types';

const StepHeader = ({ icon: Icon, title, subtitle }: { icon: React.ElementType, title: string, subtitle: string }) => (
  <div className="flex items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      <Icon size={28} />
    </div>
    <div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  </div>
);

export default function App() {
  const [appMode, setAppMode] = useState<'selection' | 'admission' | 'evolution'>('selection');
  
  // State for Admission Note
  const [form, setForm] = useState<PatientForm>(INITIAL_FORM);
  const [useDefaultDoctorAdmission, setUseDefaultDoctorAdmission] = useState(true);
  
  // State for Evolution Note
  const [evoForm, setEvoForm] = useState<EvolutionForm>(INITIAL_EVOLUTION_FORM);
  const [useDefaultDoctor, setUseDefaultDoctor] = useState(true);
  
  const [step, setStep] = useState(1);
  const [dark, setDark] = useState(false);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<AiAnalysisResult | AiEvolutionResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [glasgowTotal, setGlasgowTotal] = useState(15);
  const [dob, setDob] = useState({ d: '', m: '', y: '' });
  
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const [customAntecedente, setCustomAntecedente] = useState('');
  const [customDx, setCustomDx] = useState('');
  
  // Estado local para el diagnóstico de ingreso en evolución
  const [customIngresoDx, setCustomIngresoDx] = useState('');

  // Refs para autosave (acceder al estado actual dentro del intervalo)
  const formRef = useRef(form);
  const evoFormRef = useRef(evoForm);
  const appModeRef = useRef(appMode);

  // Mantener refs sincronizados
  useEffect(() => {
    formRef.current = form;
    evoFormRef.current = evoForm;
    appModeRef.current = appMode;
  }, [form, evoForm, appMode]);

  // Efecto de Inicialización y Autosave
  useEffect(() => {
    setNotes(StorageService.getNotes());
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) setDark(true);
    
    // Configurar fecha/hora inicial para evolución
    const now = new Date();
    setEvoForm(prev => ({
      ...prev,
      fecha: now.toLocaleDateString('es-MX'), 
      hora: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }));

    // Restaurar borradores si existen
    const savedDraft = StorageService.loadDraft();
    let msg = '';
    if (savedDraft) {
        setForm(savedDraft);
        msg = 'Borrador de ingreso restaurado';
    }
    const savedEvoDraft = StorageService.loadEvolutionDraft();
    if (savedEvoDraft) {
        setEvoForm(prev => ({...prev, ...savedEvoDraft})); // Merge para conservar fecha actual si se desea, o sobrescribir todo
        msg = savedDraft ? 'Borradores restaurados' : 'Borrador de evolución restaurado';
    }
    
    if (msg) {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }

    // Configurar intervalo de guardado automático (30 segundos)
    const interval = setInterval(() => {
        if (appModeRef.current === 'admission') {
            StorageService.saveDraft(formRef.current);
        } else if (appModeRef.current === 'evolution') {
            StorageService.saveEvolutionDraft(evoFormRef.current);
        }
    }, 30000);

    return () => clearInterval(interval);
  }, []); // Se ejecuta solo al montar

  useEffect(() => {
    if (dob.d && dob.m && dob.y) {
       const dateStr = `${dob.y}-${dob.m}-${dob.d}`;
       if (dateStr !== form.fn) {
         const diff = Date.now() - new Date(dateStr).getTime();
         const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
         const edadStr = age >= 0 ? `${age} años` : '';
         setForm(p => ({...p, fn: dateStr, edad: edadStr}));
       }
    }
  }, [dob, form.fn]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    const { o, v, m } = appMode === 'admission' ? form.g : evoForm.g;
    setGlasgowTotal((parseInt(String(o))||0) + (parseInt(String(v))||0) + (parseInt(String(m))||0));
  }, [form.g, evoForm.g, appMode]);

  // Manejo de médico predeterminado (Evolución)
  useEffect(() => {
    if (appMode === 'evolution') {
        const defaultDoc = 'Dr. Gabriel Méndez Ortiz - Céd. Prof. 7630204';
        if (useDefaultDoctor) {
            updateEvoForm('medico', defaultDoc);
        } else if (evoForm.medico === defaultDoc) {
            updateEvoForm('medico', ''); 
        }
    }
  }, [useDefaultDoctor, appMode]);

  // Manejo de médico predeterminado (Ingreso)
  useEffect(() => {
    if (appMode === 'admission') {
        const defName = 'Dr. Gabriel Méndez Ortiz';
        const defCedula = '7630204';
        if (useDefaultDoctorAdmission) {
            updateForm('medicoTratante', defName);
            updateForm('cedulaProfesional', defCedula);
        } else if (form.medicoTratante === defName) {
            updateForm('medicoTratante', '');
            updateForm('cedulaProfesional', '');
        }
    }
  }, [useDefaultDoctorAdmission, appMode]);

  const updateForm = (field: keyof PatientForm, val: any) => setForm(prev => ({ ...prev, [field]: val }));
  
  const updateEvoForm = (field: keyof EvolutionForm, val: any) => setEvoForm(prev => ({ ...prev, [field]: val }));

  const calculateStayDuration = () => {
    if (!evoForm.fechaIngreso) return "Pendiente";
    const start = new Date(evoForm.fechaIngreso);
    const end = new Date(); // Usar fecha actual para el cálculo
    // Ajustar fechas para ignorar diferencias horarias si es solo por fecha
    const diff = end.getTime() - start.getTime();
    if (isNaN(diff)) return "Fecha inválida";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days < 0) return "Fecha futura";
    return `${days} días, ${hours} horas`;
  };

  const handleSigno = (key: string, val: string) => {
    if (appMode === 'admission') {
        setForm(prev => {
          const next = { ...prev.signos, [key]: val };
          if (key === 'peso' || key === 'talla') {
            const p = parseFloat(next.peso);
            const t = parseFloat(next.talla) / 100;
            if (p && t) next.imc = (p / (t * t)).toFixed(1);
          }
          return { ...prev, signos: next };
        });
    } else {
        setEvoForm(prev => {
          const next = { ...prev.signos, [key]: val };
          if (key === 'peso' || key === 'talla') {
            const p = parseFloat(next.peso);
            const t = parseFloat(next.talla) / 100;
            if (p && t) next.imc = (p / (t * t)).toFixed(1);
          }
          return { ...prev, signos: next };
        });
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSystemAnalysis = async (data = form) => {
    setIsProcessing(true);
    if (appMode === 'admission') {
        if (form.padecimientoActual.length < 5 && step > 1) {
            setIsProcessing(false);
            return showToast('Escribe más detalles en el padecimiento actual');
        }
        const result = await AiService.analyze(form);
        setIsProcessing(false);
        if (result) setProcessingResult(result);
        else showToast('No se pudo conectar con el sistema');
    } else {
        const result = await AiService.analyzeEvolution(evoForm);
        setIsProcessing(false);
        if(result) {
            setProcessingResult(result);
            showToast('Análisis generado por IA');
        } else {
            showToast('No se pudo generar el análisis');
        }
    }
  };

  const handleSmartFill = async () => {
    if (!importText.trim()) return showToast('Pega un texto primero');
    setIsImporting(true);

    if (appMode === 'admission') {
        const parsedData = await AiService.parseData(importText);
        setIsImporting(false);

        if (parsedData) {
          setForm(prev => ({
            ...prev,
            ...parsedData,
            signos: { ...prev.signos, ...parsedData.signos },
            g: { ...prev.g, ...parsedData.g }
          }));
          setImportText('');
          showToast('Formulario autocompletado e integrado en todas las secciones');
        } else {
          showToast('Error al interpretar los datos');
        }
    } else {
        const parsedData = await AiService.parseEvolutionData(importText);
        setIsImporting(false);

        if (parsedData) {
            setEvoForm(prev => ({
                ...prev,
                ...parsedData,
                signos: { ...prev.signos, ...parsedData.signos },
                g: { ...prev.g, ...parsedData.g }
            }));
            setImportText('');
            showToast('Evolución autocompletada e integrada');
        } else {
            showToast('Error al interpretar los datos de evolución');
        }
    }
  };

  const applySystemSuggestions = () => {
    if (!processingResult) return;
    
    if (appMode === 'admission') {
        const res = processingResult as AiAnalysisResult;
        setForm(prev => {
          const newDiagnoses = res.diagnosticosSugeridos.map(d => `${d.codigo} - ${d.nombre}`);
          const combinedDx = Array.from(new Set([...prev.diagnostico, ...newDiagnoses]));
          
          return {
            ...prev,
            padecimientoActual: res.padecimientoMedico || prev.padecimientoActual,
            plan: res.planEstructurado || prev.plan,
            diagnostico: combinedDx
          };
        });
        
        // Guardar en historial automáticamente
        saveToHistory();
        showToast('Sugerencias aplicadas y guardadas en historial');

    } else {
        // Modo Evolución
        const res = processingResult as AiEvolutionResult;
        setEvoForm(prev => {
            const newDiagnoses = res.diagnosticosSugeridos.map(d => `${d.codigo} - ${d.nombre}`);
            const combinedDx = Array.from(new Set([...prev.diagnosticosActivos, ...newDiagnoses]));

            return {
                ...prev,
                subjetivo: res.subjetivoMejorado || prev.subjetivo,
                analisis: res.analisisClinico || prev.analisis,
                plan: res.planSugerido || prev.plan,
                diagnosticosActivos: combinedDx
            };
        });

        // Guardar en historial automáticamente
        saveToHistory();
        showToast('Evolución actualizada y guardada en historial');
    }
    setProcessingResult(null);
  };
  
  const addAntecedente = (a: string) => { 
    if (a && !form.antecedentes.includes(a)) updateForm('antecedentes', [...form.antecedentes, a]); 
  };
  
  const removeAntecedente = (a: string) => {
    updateForm('antecedentes', form.antecedentes.filter(x => x !== a));
  };
  
  const addDx = (dx: string) => {
    if (appMode === 'admission') {
        if(dx && !form.diagnostico.includes(dx)) {
            updateForm('diagnostico', [...form.diagnostico, dx]);
            setCustomDx('');
            showToast('Diagnóstico agregado');
        }
    } else {
        // En evolución, agrega a "Diagnósticos Activos" (antes Actuales)
        if(dx && !evoForm.diagnosticosActivos.includes(dx)) {
            updateEvoForm('diagnosticosActivos', [...evoForm.diagnosticosActivos, dx]);
            setCustomDx('');
            showToast('Nuevo diagnóstico agregado');
        }
    }
  };

  const addEvoIngresoDx = (dx: string) => {
    if(dx && !evoForm.diagnosticosIngreso.includes(dx)) {
        updateEvoForm('diagnosticosIngreso', [...evoForm.diagnosticosIngreso, dx]);
        setCustomIngresoDx('');
        showToast('Diagnóstico de ingreso agregado');
    }
  };
  
  const removeDx = (dx: string) => {
    if (appMode === 'admission') {
        updateForm('diagnostico', form.diagnostico.filter(x => x !== dx));
    } else {
        updateEvoForm('diagnosticosActivos', evoForm.diagnosticosActivos.filter(x => x !== dx));
    }
  };

  const removeEvoIngresoDx = (dx: string) => {
     updateEvoForm('diagnosticosIngreso', evoForm.diagnosticosIngreso.filter(x => x !== dx));
  };
  
  const saveToHistory = () => {
    const note: NoteEntry = { 
        id: Date.now(), 
        date: new Date().toISOString(), 
        type: appMode === 'admission' ? 'ingreso' : 'evolucion',
        form: appMode === 'admission' ? { ...form } : { ...evoForm } 
    };
    const updatedNotes = StorageService.saveNote(note);
    setNotes(updatedNotes);
    return updatedNotes;
  };

  const handleReset = () => {
    if (window.confirm('¿Deseas reiniciar y limpiar todos los campos para una nueva nota?')) {
        // Helper para copia profunda
        const deepCopy = (obj: any) => JSON.parse(JSON.stringify(obj));

        if (appMode === 'admission') {
            setForm(deepCopy(INITIAL_FORM));
            localStorage.removeItem('ultra_draft');
            setUseDefaultDoctorAdmission(true);
        } else {
            const now = new Date();
            const cleanEvo = deepCopy(INITIAL_EVOLUTION_FORM);
            setEvoForm({
                ...cleanEvo,
                fecha: now.toLocaleDateString('es-MX'),
                hora: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            });
            localStorage.removeItem('ultra_draft_evo');
            setUseDefaultDoctor(true);
        }
        setStep(1);
        
        // Limpiar estados auxiliares
        setCustomDx('');
        setCustomAntecedente('');
        setCustomIngresoDx('');
        setImportText('');
        setProcessingResult(null);
        
        showToast('Formulario reiniciado');
    }
  };

  // --- Generador HTML Nota Ingreso ---
  const generateDocHTML = (data: PatientForm) => {
    const glasgow = (parseInt(String(data.g?.o))||0) + (parseInt(String(data.g?.v))||0) + (parseInt(String(data.g?.m))||0);
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString();
    const renderSignos = () => {
      let html = '';
      Object.entries(data.signos).forEach(([k, v]) => {
        if(v) html += `<div><b>${k.toUpperCase()}:</b> ${v}</div>`;
      });
      return html;
    };
    return `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #000; max-width: 800px; margin: 0 auto">
        <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end">
          <div><h1 style="font-size: 24px; margin: 0; font-weight: bold">NOTA DE INGRESO</h1><p style="margin: 0; font-size: 12px; color: #666">HOSPITAL GENERAL • URGENCIAS</p></div>
          <div style="text-align: right; font-size: 12px"><div><b>Fecha:</b> ${dateStr}</div><div><b>Hora:</b> ${timeStr}</div><div><b>Folio:</b> ${data.folio}</div></div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
            <tr>
                <td style="padding: 4px; border: 1px solid #ddd;"><b>Paciente:</b> ${data.nombre}</td>
                <td style="padding: 4px; border: 1px solid #ddd;"><b>Edad:</b> ${data.edad}</td>
                <td style="padding: 4px; border: 1px solid #ddd;"><b>Sexo:</b> ${data.sexo}</td>
            </tr>
            <tr>
                <td style="padding: 4px; border: 1px solid #ddd;"><b>Fecha Nac:</b> ${data.fn}</td>
                <td style="padding: 4px; border: 1px solid #ddd;"><b>E. Civil:</b> ${data.estadoCivil}</td>
                <td style="padding: 4px; border: 1px solid #ddd;"><b>Tel:</b> ${data.telefono}</td>
            </tr>
            <tr>
                <td style="padding: 4px; border: 1px solid #ddd;"><b>Escolaridad:</b> ${data.escolaridad}</td>
                <td style="padding: 4px; border: 1px solid #ddd;" colspan="2"><b>Ocupación:</b> ${data.ocupacion}</td>
            </tr>
            <tr>
                <td style="padding: 4px; border: 1px solid #ddd;" colspan="3"><b>Domicilio:</b> ${data.domicilio}</td>
            </tr>
            <tr>
                <td style="padding: 4px; border: 1px solid #ddd;" colspan="3"><b>Responsable:</b> ${data.responsable}</td>
            </tr>
        </table>

        <div style="margin-bottom: 15px"><h4 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; font-size: 14px; text-transform: uppercase; color: #444">Motivo</h4><p style="font-size: 14px; line-height: 1.5; white-space: pre-wrap">${data.padecimientoActual}</p></div>
        <div style="margin-bottom: 15px"><h4 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; font-size: 14px; text-transform: uppercase; color: #444">Signos Vitales</h4><div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; font-size: 12px">${renderSignos()}<div><b>Glasgow:</b> ${glasgow}</div></div></div>
        <div style="margin-bottom: 15px"><h4 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; font-size: 14px; text-transform: uppercase; color: #444">Exploración Física</h4><p style="font-size: 13px; line-height: 1.4; white-space: pre-wrap">${data.exploracion}</p></div>
        <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 4px"><h4 style="margin: 0 0 5px 0; font-size: 14px; color: #000">DIAGNÓSTICO</h4><ul style="margin: 0; padding-left: 20px; font-size: 14px; font-weight: bold">${data.diagnostico.map(d => `<li>${d}</li>`).join('')}</ul></div>
        <div style="margin-bottom: 30px"><h4 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; font-size: 14px; text-transform: uppercase; color: #444">Plan</h4><p style="font-size: 14px; line-height: 1.5; white-space: pre-wrap">${data.plan}</p></div>
        <div style="text-align: center; margin-top: 40px"><div style="border-top: 1px solid #000; width: 250px; margin: 0 auto; padding-top: 5px; font-size: 13px; font-weight: bold">Dr(a). ${data.medicoTratante || ''}</div><div style="font-size: 11px;">Céd. Prof. ${data.cedulaProfesional || ''}</div></div>
      </div>
    `;
  };

  // --- Generador HTML Nota Evolución ---
  const generateEvolutionDocHTML = (data: EvolutionForm) => {
    const glasgow = (parseInt(String(data.g?.o))||0) + (parseInt(String(data.g?.v))||0) + (parseInt(String(data.g?.m))||0);
    const renderSignos = () => {
        let html = '';
        Object.entries(data.signos).forEach(([k, v]) => {
          if(v) html += `<span><b>${k.toUpperCase()}:</b> ${v} </span>`;
        });
        return html;
    };
    
    // Calcular estancia para el reporte impreso
    const estanciaCalculada = data.fechaIngreso ? (() => {
        const start = new Date(data.fechaIngreso);
        const end = new Date();
        const diff = end.getTime() - start.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days} días, ${hours} horas`;
    })() : 'No registrada';

    return `
      <div style="font-family: 'Arial', sans-serif; padding: 40px; color: #000; max-width: 800px; margin: 0 auto; line-height: 1.5;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
             <h2 style="margin:0; text-transform: uppercase;">Nota de Evolución Nocturna</h2>
             <p style="margin:0; font-size: 12px; color: #444;">Formato Estándar NOM-004-SSA3-2012</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
            <tr>
                <td style="border: 1px solid #ddd; padding: 5px;"><b>Paciente:</b> ${data.nombre}</td>
                <td style="border: 1px solid #ddd; padding: 5px;"><b>Edad/Sexo:</b> ${data.edad} / ${data.sexo}</td>
                <td style="border: 1px solid #ddd; padding: 5px;"><b>Cama/Exp:</b> ${data.folio} / ${data.cama}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 5px;"><b>Escolaridad:</b> ${data.escolaridad}</td>
                <td style="border: 1px solid #ddd; padding: 5px;" colspan="2"><b>Ocupación:</b> ${data.ocupacion}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 5px;"><b>Fecha:</b> ${data.fecha}</td>
                <td style="border: 1px solid #ddd; padding: 5px;" colspan="2"><b>Hora:</b> ${data.hora}</td>
            </tr>
            <tr>
                 <td style="border: 1px solid #ddd; padding: 5px;" colspan="3"><b>Estancia Hospitalaria:</b> ${estanciaCalculada}</td>
            </tr>
            <tr>
                 <td style="border: 1px solid #ddd; padding: 5px;" colspan="2"><b>Informe proporcionado a:</b> ${data.familiarResponsable || 'No registrado'}</td>
                 <td style="border: 1px solid #ddd; padding: 5px;"><b>Tel:</b> ${data.telefonoFamiliar || '-'}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 5px;" colspan="3"><b>Elaboró:</b> ${data.medico}</td>
            </tr>
        </table>

        <!-- SUBJETIVO -->
        <div style="margin-bottom: 15px;">
            <div style="background: #eee; padding: 4px 8px; font-weight: bold; font-size: 14px; border-left: 4px solid #333;">S - SUBJETIVO</div>
            <p style="margin: 5px 0; text-align: justify; font-size: 13px;">${data.subjetivo || 'Sin datos subjetivos relevantes.'}</p>
        </div>

        <!-- OBJETIVO -->
        <div style="margin-bottom: 15px;">
            <div style="background: #eee; padding: 4px 8px; font-weight: bold; font-size: 14px; border-left: 4px solid #333;">O - OBJETIVO</div>
            <div style="font-size: 12px; margin: 5px 0; background: #f9f9f9; padding: 5px; border: 1px solid #ddd;">
               ${renderSignos()} <span><b>Glasgow:</b> ${glasgow}</span> <span style="margin-left: 10px;"><b>Pupilas:</b> ${data.pupilas}</span>
            </div>
            <p style="margin: 5px 0; font-size: 13px;"><b>Exploración Física:</b> ${data.exploracionFisica}</p>
            ${data.resultadosLaboratorio ? `<p style="margin: 5px 0; font-size: 13px;"><b>Labs/Gabinete:</b> ${data.resultadosLaboratorio}</p>` : ''}
        </div>

        <!-- ANALISIS -->
        <div style="margin-bottom: 15px;">
            <div style="background: #eee; padding: 4px 8px; font-weight: bold; font-size: 14px; border-left: 4px solid #333;">A - ANÁLISIS</div>
            
            ${data.diagnosticosIngreso.length > 0 ? `
            <p style="margin: 5px 0; font-size: 13px; font-weight: bold; text-decoration: underline;">Diagnósticos de Ingreso:</p>
            <ul style="margin: 2px 0 10px 20px; padding: 0; font-size: 13px;">
                ${data.diagnosticosIngreso.map(d => `<li>${d}</li>`).join('')}
            </ul>` : ''}

            <p style="margin: 5px 0; font-size: 13px; font-weight: bold; text-decoration: underline;">Diagnósticos Actuales/Activos:</p>
            <ul style="margin: 2px 0 10px 20px; padding: 0; font-size: 13px;">
                ${data.diagnosticosActivos.length > 0 ? data.diagnosticosActivos.map(d => `<li>${d}</li>`).join('') : '<li>Sin diagnósticos actualizados</li>'}
            </ul>

            <p style="margin: 5px 0; text-align: justify; font-size: 13px;"><b>Análisis:</b> ${data.analisis}</p>
            <p style="margin: 5px 0; font-size: 13px;"><b>Pronóstico:</b> ${data.pronostico}</p>
            ${data.pendientes ? `<p style="margin: 5px 0; font-size: 13px;"><b>Pendientes:</b> ${data.pendientes}</p>` : ''}
        </div>

        <!-- PLAN -->
        <div style="margin-bottom: 25px;">
            <div style="background: #eee; padding: 4px 8px; font-weight: bold; font-size: 14px; border-left: 4px solid #333;">P - PLAN</div>
            <div style="font-size: 13px;">
                <p style="margin: 5px 0; white-space: pre-wrap;">${data.plan}</p>
                <p style="margin: 10px 0; font-weight: bold;">➡ Reportar eventualidades.</p>
            </div>
        </div>

        <div style="text-align: center; margin-top: 60px;">
            <div style="border-top: 1px solid #000; display: inline-block; padding-top: 5px; width: 250px;">
                <div style="font-weight: bold; font-size: 13px;">${data.medico}</div>
                <div style="font-size: 11px;">Firma</div>
            </div>
        </div>
      </div>
    `;
  };

  const downloadFile = (htmlContent: string, fileName: string) => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>";
    const sourceHTML = header + htmlContent + "</body></html>";
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadWord = () => {
    if (appMode === 'admission') {
        if (!form.nombre) return showToast('Falta el nombre del paciente');
        const html = generateDocHTML(form);
        downloadFile(html, `Nota_Ingreso_${form.nombre.replace(/\s+/g, '_')}`);
    } else {
        if (!evoForm.nombre) return showToast('Falta el nombre del paciente');
        const html = generateEvolutionDocHTML(evoForm);
        downloadFile(html, `Nota_Evolucion_${evoForm.nombre.replace(/\s+/g, '_')}`);
    }
    saveToHistory();
    showToast('Nota descargada correctamente');
  };

  // --- NUEVO: Generador de Texto Estructurado para Admisión ---
  const generateStructuredAdmissionText = (data: PatientForm) => {
    const glasgow = (parseInt(String(data.g?.o))||0) + (parseInt(String(data.g?.v))||0) + (parseInt(String(data.g?.m))||0);
    return `**NOTA DE INGRESO**
Folio: ${data.folio}
Paciente: ${data.nombre} (${data.edad}, ${data.sexo})
Fecha Nac: ${data.fn}
E. Civil: ${data.estadoCivil} | Escolaridad: ${data.escolaridad}
Ocupación: ${data.ocupacion}
Domicilio: ${data.domicilio}
Responsable: ${data.responsable} (Tel: ${data.telefono})
Medico Tratante: ${data.medicoTratante} (${data.cedulaProfesional})

[MOTIVO]
Sintoma Principal: ${data.sintomaPrincipal}
T. Evolución: ${data.tiempoEvolucion}
Padecimiento: ${data.padecimientoActual}

[SIGNOS VITALES]
TA:${data.signos.ta} FC:${data.signos.fc} FR:${data.signos.fr} Temp:${data.signos.temp} Sat:${data.signos.sat}
Peso:${data.signos.peso} Talla:${data.signos.talla} Glucosa:${data.signos.gluc}
Glasgow: ${glasgow} (${data.g.o}O, ${data.g.v}V, ${data.g.m}M) Pupilas: ${data.pupilas}

[ANTECEDENTES]
Patológicos: ${data.antecedentes.join(', ')}
Alergias: ${data.alergias}
Tabaquismo: ${data.tabaquismo} Alcohol: ${data.alcohol}

[EXPLORACION]
${data.exploracion}

[DIAGNOSTICO]
${data.diagnostico.join('\n')}
Pronóstico: ${data.pronostico}

[PLAN]
${data.plan}`;
  };

  // --- NUEVO: Generador de Texto Estructurado para Evolución ---
  const generateStructuredEvolutionText = (data: EvolutionForm) => {
    const glasgow = (parseInt(String(data.g?.o))||0) + (parseInt(String(data.g?.v))||0) + (parseInt(String(data.g?.m))||0);
    return `**NOTA DE EVOLUCIÓN**
Fecha: ${data.fecha} Hora: ${data.hora}
Paciente: ${data.nombre}
Edad: ${data.edad} Sexo: ${data.sexo}
Folio: ${data.folio} Cama: ${data.cama}
Ingreso: ${data.fechaIngreso}
Medico: ${data.medico}
Informes a: ${data.familiarResponsable} (Tel: ${data.telefonoFamiliar})

[SUBJETIVO]
${data.subjetivo}

[OBJETIVO]
TA:${data.signos.ta} FC:${data.signos.fc} FR:${data.signos.fr} Temp:${data.signos.temp} Sat:${data.signos.sat} Gluc:${data.signos.gluc}
Glasgow: ${glasgow} (${data.g.o}O, ${data.g.v}V, ${data.g.m}M) Pupilas: ${data.pupilas}
Exploración Física: ${data.exploracionFisica}
Laboratorios: ${data.resultadosLaboratorio}

[ANALISIS]
Diagnósticos Ingreso: ${data.diagnosticosIngreso.join(', ')}
Diagnósticos Activos: ${data.diagnosticosActivos.join(', ')}
Análisis Clínico: ${data.analisis}
Pronóstico: ${data.pronostico}
Pendientes: ${data.pendientes}

[PLAN]
${data.plan}`;
  };

  const handleWhatsApp = () => {
    let text = '';
    const name = appMode === 'admission' ? form.nombre : evoForm.nombre;
    
    if (!name) return showToast('Falta el nombre del paciente');
    
    if (appMode === 'admission') {
        text = generateStructuredAdmissionText(form);
    } else {
        text = generateStructuredEvolutionText(evoForm);
    }

    saveToHistory(); 
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showToast('Abriendo WhatsApp...');
  };

  // --- Renderizado de Pasos de Admisión (Existente) ---
  const renderAdmissionStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader icon={User} title="Ficha de Identificación" subtitle="Datos personales y administrativos del paciente." />
            <div><Label>Folio / Expediente</Label><Input value={form.folio} onChange={e => updateForm('folio', e.target.value)} placeholder="000-000" /></div>
            <div><Label>Fecha Nacimiento</Label>
              <div className="grid grid-cols-3 gap-2">
                 <Select value={dob.d} onChange={e => setDob({...dob, d: e.target.value})}><option value="">Día</option>{Array.from({length: 31}, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>)}</Select>
                 <Select value={dob.m} onChange={e => setDob({...dob, m: e.target.value})}><option value="">Mes</option>{MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}</Select>
                 <Select value={dob.y} onChange={e => setDob({...dob, y: e.target.value})}><option value="">Año</option>{Array.from({length: 100}, (_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}</Select>
              </div>
            </div>
            <div><Label>Nombre Completo</Label><Input value={form.nombre} onChange={e => updateForm('nombre', e.target.value)} placeholder="Apellidos, Nombres" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Edad Calculada</Label><Input value={form.edad} readOnly className="font-bold bg-slate-50 dark:bg-slate-950" /></div>
              <div><Label>Sexo</Label><Select value={form.sexo} onChange={e => updateForm('sexo', e.target.value)}><option value="">-</option><option>Masculino</option><option>Femenino</option></Select></div>
            </div>
            <div><Label>Estado Civil</Label><Select value={form.estadoCivil} onChange={e => updateForm('estadoCivil', e.target.value)}><option value="">-</option><option>Soltero/a</option><option>Casado/a</option><option>Unión Libre</option></Select></div>
            <div><Label>Escolaridad</Label><Select value={form.escolaridad} onChange={e => updateForm('escolaridad', e.target.value)}><option value="">-</option><option>Ninguna</option><option>Primaria</option><option>Secundaria</option><option>Licenciatura</option></Select></div>
            <div><Label>Ocupación</Label><Input value={form.ocupacion} onChange={e => updateForm('ocupacion', e.target.value)} /></div>
            <div><Label>Domicilio</Label><Input value={form.domicilio} onChange={e => updateForm('domicilio', e.target.value)} placeholder="Calle, Número, Colonia, C.P." /></div>
            <div><Label>Responsable (Familiar)</Label><Input value={form.responsable} onChange={e => updateForm('responsable', e.target.value)} placeholder="Nombre del familiar responsable" /></div>
            <div><Label>Teléfono</Label><Input value={form.telefono} onChange={e => updateForm('telefono', e.target.value)} placeholder="10 dígitos" /></div>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <SectionTitle><Stethoscope size={20}/> Datos del Médico</SectionTitle>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="defDocAdm" checked={useDefaultDoctorAdmission} onChange={e => setUseDefaultDoctorAdmission(e.target.checked)} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"/>
                    <label htmlFor="defDocAdm" className="text-sm text-slate-600 dark:text-slate-300">Médico Predeterminado (Dr. Gabriel Méndez)</label>
                </div>
                <div><Label>Médico Tratante</Label><Input value={form.medicoTratante} onChange={e => updateForm('medicoTratante', e.target.value)} disabled={useDefaultDoctorAdmission} /></div>
                <div><Label>Cédula Profesional</Label><Input value={form.cedulaProfesional} onChange={e => updateForm('cedulaProfesional', e.target.value)} disabled={useDefaultDoctorAdmission} /></div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader icon={History} title="Motivo de Consulta" subtitle="Síntoma principal y padecimiento actual." />
            <div><Label>Síntoma Principal</Label><Input value={form.sintomaPrincipal} onChange={e => updateForm('sintomaPrincipal', e.target.value)} placeholder="Ej. Convulsiones..." /></div>
            <div><Label>Tiempo de Evolución</Label><Input value={form.tiempoEvolucion} onChange={e => updateForm('tiempoEvolucion', e.target.value)} placeholder="Ej. 30 minutos..." /></div>
            <div className="relative"><Label>Padecimiento Actual (Breve)</Label><TextArea rows={12} value={form.padecimientoActual} onChange={e => updateForm('padecimientoActual', e.target.value)} />
              <div className="flex flex-wrap gap-2 mt-3">{SEMIOLOGIA_TAGS.map(tag => (<button key={tag} onClick={() => {const text = form.padecimientoActual;const separator = text.length > 0 && !text.endsWith('\n') ? '\n' : '';updateForm('padecimientoActual', text + separator + tag + ' ');}} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm"><Plus size={12}/> {tag.replace(':', '')}</button>))}</div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader icon={HeartPulse} title="Signos Vitales y Glasgow" subtitle="Parámetros fisiológicos, somatometría y estado neurológico." />
            <div className="grid grid-cols-3 gap-3">
              {SIGNOS_ORDER.map(key => (
                <div key={key} className="aspect-square p-2 bg-slate-100 dark:bg-[#1e293b] border-2 border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center shadow-sm relative group focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">{SIGNOS_LABELS[key]}</label>
                  <input value={(form.signos as any)[key]} onChange={e => handleSigno(key, e.target.value)} className="w-full text-center text-xl sm:text-2xl font-bold bg-transparent outline-none text-slate-800 dark:text-white"/>
                  <span className="text-[10px] text-slate-400">{SIGNOS_UNITS[key]}</span>
                </div>
              ))}
            </div>
            {/* Glasgow Logic for Admission */}
            <div className="bg-slate-100 dark:bg-[#1e293b] p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-sm font-bold mb-4 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2">Escala de Glasgow</h4>
                <div className="flex gap-4">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                     <div className="flex flex-col gap-2"><span className="text-[10px] text-center text-slate-400 uppercase font-bold">Ocular</span>{[4,3,2,1].map(v => (<button key={v} onClick={() => setForm(p=>({...p, g:{...p.g, o:v}}))} className={`h-8 text-sm rounded-lg font-bold transition-all border-2 ${Number(form.g.o)===v ? 'bg-indigo-600 text-white shadow-md scale-105 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500'}`}>{v}</button>))}</div>
                     <div className="flex flex-col gap-2"><span className="text-[10px] text-center text-slate-400 uppercase font-bold">Verbal</span>{[5,4,3,2,1].map(v => (<button key={v} onClick={() => setForm(p=>({...p, g:{...p.g, v:v}}))} className={`h-8 text-sm rounded-lg font-bold transition-all border-2 ${Number(form.g.v)===v ? 'bg-indigo-600 text-white shadow-md scale-105 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500'}`}>{v}</button>))}</div>
                     <div className="flex flex-col gap-2"><span className="text-[10px] text-center text-slate-400 uppercase font-bold">Motora</span>{[6,5,4,3,2,1].map(v => (<button key={v} onClick={() => setForm(p=>({...p, g:{...p.g, m:v}}))} className={`h-8 text-sm rounded-lg font-bold transition-all border-2 ${Number(form.g.m)===v ? 'bg-indigo-600 text-white shadow-md scale-105 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500'}`}>{v}</button>))}</div>
                  </div>
                  <div className="flex flex-col items-center justify-center min-w-[90px] border-l-2 border-slate-200 dark:border-slate-600 pl-4 gap-4"><div className="text-center"><span className="text-[10px] uppercase text-slate-400 block mb-1">Total</span><span className="text-5xl font-bold text-emerald-500">{glasgowTotal}</span></div><div className="w-full relative group"><select value={form.pupilas} onChange={(e) => updateForm('pupilas', e.target.value)} className="w-full py-2 px-1 text-[10px] bg-slate-200 dark:bg-slate-800 rounded border-2 border-slate-300 dark:border-slate-600 text-center outline-none font-bold text-slate-700 dark:text-slate-300 appearance-none" style={{textAlignLast: 'center'}}><option value="Isocóricas">Isocóricas</option><option value="Miosis">Miosis</option><option value="Midriasis">Midriasis</option><option value="Anisocoria">Anisocoria</option></select></div></div>
                </div>
            </div>
            <div><Label>Exploración Física Breve</Label>
              <div className="flex flex-wrap gap-2 mb-3">{Object.keys(EXPLORACION_PLANTILLAS).map(key => (<button key={key} onClick={() => {const text = form.exploracion;const separator = text.length > 0 && !text.endsWith('\n') ? '\n\n' : '';updateForm('exploracion', text + separator + key + ':\n' + EXPLORACION_PLANTILLAS[key]);}} className="px-3 py-1.5 bg-slate-700/80 text-white rounded-full text-xs font-bold hover:bg-slate-600 transition-colors flex items-center gap-1 shadow-sm"><Plus size={12}/> {key}</button>))}</div>
              <TextArea rows={8} value={form.exploracion} onChange={e => updateForm('exploracion', e.target.value)} placeholder="Describe aqui..." />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader icon={History} title="Antecedentes" subtitle="Historial patológico, no patológico y alergias." />
            <div><Label>Patológicos</Label><div className="min-h-[60px] p-3 bg-slate-100 dark:bg-[#1e293b] rounded-xl mb-3 flex flex-wrap gap-2 items-center border-2 border-slate-200 dark:border-slate-700 shadow-inner">{form.antecedentes.length === 0 && <span className="text-slate-400 text-sm italic">Ninguno</span>}{form.antecedentes.map(a => (<span key={a} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-300 dark:border-slate-600">{a} <button onClick={() => removeAntecedente(a)} className="hover:text-red-500"><X size={14}/></button></span>))}</div><div className="grid grid-cols-3 gap-2">{ANTECEDENTES_OPTS.map(o => (<button key={o} onClick={() => addAntecedente(o)} className="px-2 py-2 bg-slate-200 dark:bg-[#1e293b] hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1 border-2 border-slate-300 dark:border-slate-700"><Plus size={12}/> {o}</button>))}</div></div>
            <div><Label>Añadir Otro</Label><div className="flex gap-2"><Input value={customAntecedente} onChange={e => setCustomAntecedente(e.target.value)} placeholder="Ej: Hipotiroidismo" onKeyDown={e => e.key === 'Enter' && (addAntecedente(customAntecedente), setCustomAntecedente(''))} className="dark:bg-[#1e293b] dark:border-slate-700"/><button onClick={() => { addAntecedente(customAntecedente); setCustomAntecedente(''); }} className="aspect-square bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg flex items-center justify-center w-14"><Plus size={24}/></button></div></div>
            <div><Label>Alergias</Label><Input value={form.alergias} onChange={e => updateForm('alergias', e.target.value)} className="dark:bg-[#1e293b] dark:border-slate-700"/></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Tabaquismo</Label><Select value={form.tabaquismo} onChange={e => updateForm('tabaquismo', e.target.value)} className="dark:bg-[#1e293b] dark:border-slate-700"><option value="Negado">Niega</option><option value="Positivo">Positivo</option></Select></div><div><Label>Alcoholismo</Label><Select value={form.alcohol} onChange={e => updateForm('alcohol', e.target.value)} className="dark:bg-[#1e293b] dark:border-slate-700"><option value="Negado">Niega</option><option value="Ocasional">Ocasional</option><option value="Frecuente">Frecuente</option></Select></div></div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader icon={CheckCircle} title="Diagnóstico y Plan" subtitle="Integración diagnóstica, pronóstico y tratamiento." />
            <div><Label>Diagnósticos</Label><div className="min-h-[50px] p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-3 flex flex-col gap-2 border-2 border-slate-200 dark:border-slate-700">{form.diagnostico.length === 0 ? (<span className="text-slate-400 dark:text-slate-500 text-sm italic py-2 px-1">Vacío</span>) : (<div className="flex flex-wrap gap-2">{form.diagnostico.map(dx => (<div key={dx} className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm shadow-sm"><span>{dx}</span><button onClick={() => removeDx(dx)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400"><X size={14}/></button></div>))}</div>)}</div><div className="flex gap-2 mb-4"><div className="relative flex-1"><Input value={customDx} onChange={e => setCustomDx(e.target.value)} placeholder="[CIE-10] Diagnóstico" onKeyDown={e => e.key==='Enter' && addDx(customDx)} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"/></div><button onClick={() => addDx(customDx)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl w-14 flex items-center justify-center shadow-lg"><Plus size={24}/></button></div><div className="grid grid-cols-4 gap-2">{DX_PRESETS.map(preset => (<button key={preset.code} onClick={() => addDx(`${preset.code} - ${preset.label}`)} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"><Plus size={10}/> {preset.code}</button>))}</div></div>
            <div><Label>Pronóstico</Label><div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border-2 border-slate-200 dark:border-slate-800">{PRONOSTICO_OPTS.map(opt => (<button key={opt} onClick={() => updateForm('pronostico', opt)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${form.pronostico === opt ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}>{opt}</button>))}</div></div>
            <div><Label>Plan de Tratamiento</Label><TextArea rows={8} value={form.plan} onChange={e => updateForm('plan', e.target.value)} placeholder="1. Dieta... 2. Soluciones..." className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 font-mono text-sm"/></div>
            {/* Smart Fill for Admission (original) */}
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm mt-4"><h4 className="text-emerald-600 dark:text-emerald-400 font-bold mb-2 flex items-center gap-2"><Wand2 size={18}/> Autocompletar</h4><TextArea rows={4} value={importText} onChange={e => setImportText(e.target.value)} placeholder="Texto libre..." className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 text-sm shadow-sm"/><button onClick={handleSmartFill} disabled={isImporting} className="w-full bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-4 transition-all shadow-md">{isImporting ? <Loader2 className="animate-spin" size={20}/> : <Wand2 size={20}/>} Rellenar</button></div>
          </div>
        );
      default: return null;
    }
  };

  const renderEvolutionStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader icon={User} title="Datos Generales" subtitle="Identificación del paciente y tiempos de la nota." />
            <div className="grid grid-cols-2 gap-4">
                <div><Label>Folio / Expediente</Label><Input value={evoForm.folio} onChange={e => updateEvoForm('folio', e.target.value)} /></div>
                <div><Label>Cama</Label><Input value={evoForm.cama} onChange={e => updateEvoForm('cama', e.target.value)} /></div>
            </div>
            <div><Label>Nombre Paciente</Label><Input value={evoForm.nombre} onChange={e => updateEvoForm('nombre', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Edad</Label><Input value={evoForm.edad} onChange={e => updateEvoForm('edad', e.target.value)} /></div>
              <div><Label>Sexo</Label><Select value={evoForm.sexo} onChange={e => updateEvoForm('sexo', e.target.value)}><option value="">-</option><option>Masculino</option><option>Femenino</option></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Escolaridad</Label>
                    <Select value={evoForm.escolaridad} onChange={e => updateEvoForm('escolaridad', e.target.value)}>
                        <option value="">-</option>
                        <option>Ninguna</option>
                        <option>Primaria</option>
                        <option>Secundaria</option>
                        <option>Bachillerato</option>
                        <option>Licenciatura</option>
                    </Select>
                </div>
                <div>
                    <Label>Ocupación</Label>
                    <Input value={evoForm.ocupacion} onChange={e => updateEvoForm('ocupacion', e.target.value)} />
                </div>
            </div>
            
            <SectionTitle><History size={20}/> Tiempos</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
               <div><Label>Fecha Ingreso</Label><Input type="date" value={evoForm.fechaIngreso} onChange={e => updateEvoForm('fechaIngreso', e.target.value)} /></div>
               <div><Label>Estancia Aprox.</Label><div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700">{calculateStayDuration()}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div><Label>Fecha Nota</Label><Input value={evoForm.fecha} onChange={e => updateEvoForm('fecha', e.target.value)} /></div>
               <div><Label>Hora Nota</Label><Input type="time" value={evoForm.hora} onChange={e => updateEvoForm('hora', e.target.value)} /></div>
            </div>
            
            <div className="mt-2">
                <Label>Familiar Responsable (Informe)</Label>
                <Input value={evoForm.familiarResponsable} onChange={e => updateEvoForm('familiarResponsable', e.target.value)} placeholder="Nombre del familiar a quien se brinda informes" />
            </div>
            <div className="mt-2">
                <Label>Teléfono Familiar</Label>
                <Input value={evoForm.telefonoFamiliar} onChange={e => updateEvoForm('telefonoFamiliar', e.target.value)} placeholder="10 dígitos" />
            </div>

            <SectionTitle><UserCheck size={20}/> Médico</SectionTitle>
             <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="defDoc" checked={useDefaultDoctor} onChange={e => setUseDefaultDoctor(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"/>
                <label htmlFor="defDoc" className="text-sm text-slate-600 dark:text-slate-300">Médico Predeterminado (Dr. Gabriel Méndez)</label>
            </div>
            <Input value={evoForm.medico} onChange={e => updateEvoForm('medico', e.target.value)} placeholder="Nombre del médico que elabora" disabled={useDefaultDoctor}/>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader icon={FileText} title="Subjetivo" subtitle="Evolución reportada por el paciente o familiar." />
            <div className="relative">
                <Label>Evolución reportada por el paciente/familiar</Label>
                <TextArea rows={15} value={evoForm.subjetivo} onChange={e => updateEvoForm('subjetivo', e.target.value)} placeholder="El paciente refiere..." />
                <div className="flex flex-wrap gap-2 mt-3">
                    {['Refiere mejoría', 'Sin nuevos síntomas', 'Acepta dieta', 'Niega cefalea', 'Diuresis presente', 'Evacuaciones presentes'].map(tag => (
                        <button key={tag} onClick={() => {
                            const text = evoForm.subjetivo;
                            const separator = text.length > 0 && !text.endsWith('\n') ? ' ' : '';
                            updateEvoForm('subjetivo', text + separator + tag + '. ');
                        }} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-colors">
                           {tag}
                        </button>
                    ))}
                </div>
            </div>
          </div>
        );
      case 3:
         return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader icon={HeartPulse} title="Objetivo" subtitle="Signos vitales, exploración física y resultados." />
            
            <div className="grid grid-cols-3 gap-3">
              {SIGNOS_ORDER.map(key => (
                <div key={key} className="aspect-square p-2 bg-slate-50 dark:bg-[#1e293b] border-2 border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center shadow-sm relative focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">{SIGNOS_LABELS[key]}</label>
                  <input value={(evoForm.signos as any)[key]} onChange={e => handleSigno(key, e.target.value)} className="w-full text-center text-xl sm:text-2xl font-bold bg-transparent outline-none text-slate-800 dark:text-white"/>
                  <span className="text-[10px] text-slate-400">{SIGNOS_UNITS[key]}</span>
                </div>
              ))}
            </div>

             {/* Glasgow Logic for Evolution */}
            <div className="bg-slate-50 dark:bg-[#1e293b] p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-sm font-bold mb-4 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2">Neurológico</h4>
                <div className="flex gap-4">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                     <div className="flex flex-col gap-2"><span className="text-[10px] text-center text-slate-400 uppercase font-bold">Ocular</span>{[4,3,2,1].map(v => (<button key={v} onClick={() => setEvoForm(p=>({...p, g:{...p.g, o:v}}))} className={`h-8 text-sm rounded-lg font-bold transition-all border-2 ${Number(evoForm.g.o)===v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500'}`}>{v}</button>))}</div>
                     <div className="flex flex-col gap-2"><span className="text-[10px] text-center text-slate-400 uppercase font-bold">Verbal</span>{[5,4,3,2,1].map(v => (<button key={v} onClick={() => setEvoForm(p=>({...p, g:{...p.g, v:v}}))} className={`h-8 text-sm rounded-lg font-bold transition-all border-2 ${Number(evoForm.g.v)===v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500'}`}>{v}</button>))}</div>
                     <div className="flex flex-col gap-2"><span className="text-[10px] text-center text-slate-400 uppercase font-bold">Motora</span>{[6,5,4,3,2,1].map(v => (<button key={v} onClick={() => setEvoForm(p=>({...p, g:{...p.g, m:v}}))} className={`h-8 text-sm rounded-lg font-bold transition-all border-2 ${Number(evoForm.g.m)===v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500'}`}>{v}</button>))}</div>
                  </div>
                  <div className="flex flex-col items-center justify-center min-w-[90px] border-l-2 border-slate-200 dark:border-slate-600 pl-4 gap-4"><div className="text-center"><span className="text-[10px] uppercase text-slate-400 block mb-1">Total</span><span className="text-5xl font-bold text-indigo-500">{glasgowTotal}</span></div><div className="w-full relative group"><select value={evoForm.pupilas} onChange={(e) => updateEvoForm('pupilas', e.target.value)} className="w-full py-2 px-1 text-[10px] bg-slate-200 dark:bg-slate-800 rounded border-2 border-slate-300 dark:border-slate-600 text-center outline-none font-bold text-slate-700 dark:text-slate-300 appearance-none" style={{textAlignLast: 'center'}}><option value="Isocóricas">Isocóricas</option><option value="Miosis">Miosis</option><option value="Midriasis">Midriasis</option><option value="Anisocoria">Anisocoria</option></select></div></div>
                </div>
            </div>

            <div>
                <Label>Exploración Física Actual</Label>
                <div className="flex flex-wrap gap-2 mb-3">{Object.keys(EXPLORACION_PLANTILLAS).map(key => (<button key={key} onClick={() => {const text = evoForm.exploracionFisica;const separator = text.length > 0 && !text.endsWith('\n') ? '\n\n' : '';updateEvoForm('exploracionFisica', text + separator + key + ':\n' + EXPLORACION_PLANTILLAS[key]);}} className="px-3 py-1.5 bg-slate-700/80 text-white rounded-full text-xs font-bold hover:bg-slate-600 transition-colors flex items-center gap-1 shadow-sm"><Plus size={12}/> {key}</button>))}</div>
                <TextArea rows={6} value={evoForm.exploracionFisica} onChange={e => updateEvoForm('exploracionFisica', e.target.value)} placeholder="Cambios relevantes en la exploración..." />
            </div>

             <div>
                <Label>Resultados de Laboratorio / Gabinete</Label>
                <TextArea rows={4} value={evoForm.resultadosLaboratorio} onChange={e => updateEvoForm('resultadosLaboratorio', e.target.value)} placeholder="Hb: 12, Leuc: 8.5, Plaq: 250..." />
            </div>
          </div>
         );
      case 4:
          return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <StepHeader icon={Activity} title="Análisis Clínico" subtitle="Interpretación de la evolución y diagnósticos." />
                
                {/* Diagnósticos de Ingreso */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Label>Diagnósticos de Ingreso</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {evoForm.diagnosticosIngreso.length === 0 && <span className="text-xs text-slate-400 italic">Ninguno</span>}
                        {evoForm.diagnosticosIngreso.map(dx => (
                            <span key={dx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs flex items-center gap-1">
                                {dx} <button onClick={() => removeEvoIngresoDx(dx)}><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input value={customIngresoDx} onChange={e => setCustomIngresoDx(e.target.value)} placeholder="Añadir Dx Ingreso" onKeyDown={e => e.key === 'Enter' && addEvoIngresoDx(customIngresoDx)} className="text-xs py-2"/>
                        <button onClick={() => addEvoIngresoDx(customIngresoDx)} className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-3 hover:bg-slate-300"><Plus size={16}/></button>
                    </div>
                </div>

                {/* Diagnósticos Activos */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <Label>Diagnósticos Activos</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {evoForm.diagnosticosActivos.length === 0 && <span className="text-xs text-slate-400 italic">Ninguno</span>}
                        {evoForm.diagnosticosActivos.map(dx => (
                            <span key={dx} className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs flex items-center gap-1 font-bold">
                                {dx} <button onClick={() => removeDx(dx)}><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2 mb-2">
                        <Input value={customDx} onChange={e => setCustomDx(e.target.value)} placeholder="Añadir Dx Activo" onKeyDown={e => e.key === 'Enter' && addDx(customDx)} className="text-xs py-2"/>
                        <button onClick={() => addDx(customDx)} className="bg-indigo-600 text-white rounded px-3 hover:bg-indigo-700"><Plus size={16}/></button>
                    </div>
                    <div className="flex flex-wrap gap-1">{DX_PRESETS.slice(0, 6).map(p => <button key={p.code} onClick={() => addDx(`${p.code} - ${p.label}`)} className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-slate-700">{p.label}</button>)}</div>
                </div>

                <div>
                    <Label>Análisis de Evolución</Label>
                    <TextArea rows={8} value={evoForm.analisis} onChange={e => updateEvoForm('analisis', e.target.value)} placeholder="Integración de evolución clínica, respuesta al tratamiento..." />
                </div>

                <div>
                    <Label>Pronóstico</Label>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border-2 border-slate-200 dark:border-slate-800">
                        {PRONOSTICO_OPTS.map(opt => (
                            <button key={opt} onClick={() => updateEvoForm('pronostico', opt)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${evoForm.pronostico === opt ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}>
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                 <div>
                    <Label>Pendientes</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {PENDIENTES_OPTS.map(opt => (
                           <button key={opt} onClick={() => {
                               const current = evoForm.pendientes || '';
                               const sep = current ? ', ' : '';
                               if (!current.includes(opt)) updateEvoForm('pendientes', current + sep + opt);
                           }} className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded text-xs hover:bg-amber-100 transition-colors">
                               {opt}
                           </button>
                        ))}
                    </div>
                    <TextArea rows={2} value={evoForm.pendientes} onChange={e => updateEvoForm('pendientes', e.target.value)} placeholder="Pendientes específicos..." />
                </div>
            </div>
          );
      case 5:
          return (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <StepHeader icon={ClipboardPlus} title="Plan de Manejo" subtitle="Indicaciones terapéuticas y seguimiento." />
                
                <div>
                   <Label>Plan de Tratamiento</Label>
                   <TextArea rows={12} value={evoForm.plan} onChange={e => updateEvoForm('plan', e.target.value)} placeholder="1. Dieta... 2. Soluciones... 3. Medicamentos..." className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 font-mono text-sm"/>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm mt-4">
                  <h4 className="text-emerald-600 dark:text-emerald-400 font-bold mb-2 flex items-center gap-2"><Wand2 size={18}/> Autocompletar</h4>
                  <TextArea rows={4} value={importText} onChange={e => setImportText(e.target.value)} placeholder="Texto libre..." className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 text-sm shadow-sm"/>
                  <button onClick={handleSmartFill} disabled={isImporting} className="w-full bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-4 transition-all shadow-md">
                    {isImporting ? <Loader2 className="animate-spin" size={20}/> : <Wand2 size={20}/>} Rellenar
                  </button>
                </div>
            </div>
          );
      default: return null;
    }
  };

  const getBackgroundClass = () => {
    if (appMode === 'selection') {
      return dark 
        ? 'bg-[radial-gradient(ellipse_at_bottom,_#1B2735_0%,_#090A0F_100%)]' 
        : 'bg-gradient-to-b from-blue-950 via-blue-700 to-teal-400';
    }
    if (appMode === 'admission') {
      return dark
        ? 'bg-[radial-gradient(circle_at_top,_#047857_0%,_#022c22_100%)]' 
        : 'bg-gradient-to-br from-teal-500 via-emerald-400 to-green-300';
    }
    // Evolution
    return dark
      ? 'bg-[radial-gradient(circle_at_top,_#4338ca_0%,_#1e1b4b_100%)]'
      : 'bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-400';
  };

  const currentConfig = appMode === 'admission' ? STEPS_CONFIG : EVOLUTION_STEPS;
  const isLastStep = step === currentConfig.length;

  return (
    <div className={`min-h-screen text-slate-800 dark:text-slate-200 pb-20 font-sans transition-all duration-500 ${getBackgroundClass()}`}>
      <AuroraStyles />

      {/* NEW: Standalone Toggle for Selection Mode - Top Left */}
      {appMode === 'selection' && (
        <button 
            onClick={() => setDark(!dark)} 
            className="fixed top-4 left-4 z-50 p-2 rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm border border-white/5"
        >
            {dark ? <Sun size={20}/> : <Moon size={20}/>}
        </button>
      )}

      {/* EXISTING NAVBAR - Only show if NOT in selection mode */}
      {appMode !== 'selection' && (
        <div className={`sticky top-0 z-50 px-3 py-1.5 flex justify-between items-center shadow-lg border-b border-white/10 backdrop-blur-md transition-all duration-300 ${
            appMode === 'admission' 
                ? 'bg-emerald-600/90 dark:bg-emerald-950/80 text-white' 
                : 'bg-indigo-600/90 dark:bg-indigo-950/80 text-white'
        }`}>
            <div className="flex items-center gap-2">
                <button onClick={() => setAppMode('selection')} className="bg-white/20 text-white p-2 rounded-xl hover:bg-white/30 mr-1"><ChevronLeft/></button>
                
                <div className="flex flex-col cursor-pointer" onClick={() => setShowDisclaimer(true)}>
                    <h1 className="font-bold text-base leading-4 text-white hover:opacity-80 transition-opacity">
                        {appMode === 'admission' ? 'Nota de Ingreso' : appMode === 'evolution' ? 'Nota de Evolución' : 'AINOTAS'}
                    </h1>
                    <p className="text-[10px] text-white/80 opacity-90 font-medium">By Dr. Gabriel Méndez</p>
                </div>
            </div>
            <div className="flex gap-0.5">
                <button onClick={() => setShowQr(true)} className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-colors"><QrCode size={22}/></button>
                <button onClick={() => handleSystemAnalysis()} disabled={isProcessing} className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-colors">{isProcessing ? <Loader2 className="animate-spin" size={22} /> : <Sparkles size={22}/>}</button>
                <button onClick={() => setDark(!dark)} className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-colors">{dark ? <Sun size={22}/> : <Moon size={22}/>}</button>
                <button onClick={() => setShowHistory(true)} className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-colors"><Archive size={22}/></button>
            </div>
        </div>
      )}
      
      {/* Steps Bar - Only show if not in selection */}
      {appMode !== 'selection' && (
          <div className={`px-4 pt-6 pb-12 shadow-inner relative z-20 transition-colors duration-300 ${
              appMode === 'admission' 
                ? 'bg-emerald-700/50 dark:bg-emerald-900/50 backdrop-blur-sm' 
                : 'bg-indigo-700/50 dark:bg-indigo-900/50 backdrop-blur-sm'
          }`}>
              <div className="flex justify-between max-w-lg mx-auto">
                  {currentConfig.map(s => (
                      <div key={s.id} onClick={() => setStep(s.id)} className="flex flex-col items-center gap-1 cursor-pointer">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-[3px] transition-all ${step===s.id ? 'bg-white text-slate-800 border-white scale-110 shadow-lg' : 'border-white/40 text-white'}`}>
                              <s.icon size={22} className={step===s.id ? (appMode === 'admission' ? 'text-emerald-600' : 'text-indigo-600') : ''}/>
                          </div>
                          <span className={`text-[10px] font-bold ${step===s.id ? 'text-white' : 'text-white/60'}`}>{s.label}</span>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {appMode !== 'selection' && (
        <main className="px-4 -mt-6 relative z-30">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-700 rounded-t-3xl p-6 shadow-2xl max-w-3xl mx-auto min-h-[60vh] flex flex-col justify-between">
            {appMode === 'admission' ? renderAdmissionStep() : renderEvolutionStep()}
            
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 items-center">
                <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="flex items-center gap-2 text-slate-400 disabled:opacity-30 hover:text-emerald-600 font-medium transition-colors"><ChevronLeft size={20}/> Atrás</button>
                {!isLastStep ? (
                    <button onClick={() => setStep(step + 1)} className={`${appMode==='admission'?'bg-emerald-600 hover:bg-emerald-700':'bg-indigo-600 hover:bg-indigo-700'} text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transform hover:scale-105 transition-all shadow-lg`}>
                        Siguiente <ChevronRight size={18}/>
                    </button>
                ) : (
                <div className="flex gap-4">
                    <button 
                        onClick={handleReset} 
                        className={`w-14 h-14 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border-2 text-rose-500 border-rose-100 hover:border-rose-200 dark:border-slate-700 shadow-lg transition-all duration-300 hover:-translate-y-1 active:scale-95`}
                        title="Nueva Nota (Limpiar)"
                    >
                        <RotateCcw size={24} strokeWidth={2.5} />
                    </button>
                    <button 
                    onClick={downloadWord} 
                    className={`w-14 h-14 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border-2 ${appMode==='admission'?'text-emerald-600 border-emerald-100':'text-indigo-600 border-indigo-100'} hover:border-current shadow-lg transition-all duration-300 hover:-translate-y-1 active:scale-95`}
                    title="Descargar documento Word"
                    >
                    <Download size={24} strokeWidth={2.5} />
                    </button>
                    <button 
                    onClick={handleWhatsApp} 
                    className={`w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-r ${appMode==='admission'?'from-emerald-500 to-emerald-600':'from-indigo-500 to-indigo-600'} text-white shadow-lg transition-all duration-300 hover:-translate-y-1 active:scale-95`}
                    title="Compartir por WhatsApp"
                    >
                    <Share2 size={24} strokeWidth={2.5} />
                    </button>
                </div>
                )}
            </div>
            </div>
        </main>
      )}

      {/* --- SELECTION SCREEN CONTENT --- */}
      {appMode === 'selection' && (
         <>
         <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="stars-small"></div>
            <div className="stars-medium"></div>
            <div className="stars-large"></div>
         </div>
         <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-60px)]">
             {/* Header */}
            <div className="max-w-3xl text-center mb-16 animate-in fade-in slide-in-from-top-10 duration-700">
                <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-6 cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowDisclaimer(true)}>
                <span className={`text-transparent bg-clip-text drop-shadow-sm ${dark ? 'bg-gradient-to-t from-sky-400 to-white' : 'bg-gradient-to-r from-teal-200 via-cyan-100 to-white'}`}>
                    AINOTAS
                </span>
                </h1>
                <p className="text-lg text-slate-200/90 font-medium leading-relaxed max-w-3xl mx-auto drop-shadow-md px-4">
                Aplicación médica desarrollada por el <span className="font-bold text-white">Dr. Gabriel Méndez</span> para facilitar, optimizar y potenciar el aprendizaje de Médicos Internos de Pregrado en la elaboración de notas médicas claras, completas y apegadas a la Norma Oficial del Expediente Clínico, en el Hospital General de Apatzingán.
                </p>
            </div>

            {/* Cards Grid */}
            <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8 px-4">
                {/* Card 1: Ingreso */}
                <div 
                onClick={() => { setAppMode('admission'); setStep(1); }}
                className="group relative bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(52,211,153,0.3)] transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(52,211,153,0.3)] border border-emerald-400/30 group-hover:scale-110 transition-transform duration-300">
                            <FileText size={32} className="text-emerald-300" />
                        </div>
                        
                        <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-md">Nota de Ingreso</h2>
                        <p className="text-slate-200 text-sm leading-relaxed mb-8 flex-grow">
                        Historia clínica detallada, antecedentes, exploración física y plan de manejo inicial.
                        </p>

                        <div className="flex items-center justify-end mt-auto">
                            <button className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-colors">
                            Comenzar <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Card 2: Evolucion */}
                <div 
                onClick={() => { 
                    setAppMode('evolution'); 
                    setStep(1); 
                    // Auto-update time when starting evolution note
                    const now = new Date();
                    setEvoForm(prev => ({
                        ...prev,
                        fecha: now.toLocaleDateString('es-MX'),
                        hora: now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0')
                    }));
                }}
                className="group relative bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(99,102,241,0.3)] transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400/30 group-hover:scale-110 transition-transform duration-300">
                            <Activity size={32} className="text-indigo-300" />
                        </div>
                        
                        <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-md">Nota de Evolución</h2>
                        <p className="text-slate-200 text-sm leading-relaxed mb-8 flex-grow">
                        Formato SOAP para seguimiento diario. Subjetivo, Objetivo, Análisis y Plan actualizado.
                        </p>

                        <div className="flex items-center justify-end mt-auto">
                            <button className="px-6 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-colors">
                            Comenzar <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
         </div>
         </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce flex items-center gap-2 text-sm"><CheckCircle size={16} className="text-emerald-400"/> {toast}</div>}
      
      {/* AI Modal Logic reused for both but could be customized */}
      {processingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-[#0f172a] w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl border border-slate-700 animate-in zoom-in-95">
              <div className="bg-[#1e293b] p-4 flex justify-between items-center border-b border-slate-700">
                <h3 className="font-bold text-lg text-indigo-400 flex items-center gap-2"><Sparkles className="text-indigo-500" size={20} /> Análisis Clínico Automatizado</h3>
                <button onClick={() => setProcessingResult(null)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
              </div>
              <div className="overflow-y-auto p-6 space-y-6 text-slate-300 custom-scrollbar">
                
                {/* Observaciones (General) */}
                {processingResult.observaciones?.length > 0 && (<div className="border border-amber-900/50 bg-amber-950/20 rounded-xl overflow-hidden"><div className="bg-amber-900/30 px-4 py-2 border-b border-amber-900/50 flex items-center gap-2"><AlertOctagon size={16} className="text-amber-500"/><span className="font-bold text-amber-500 text-sm uppercase tracking-wide">Observaciones</span></div><ul className="p-4 space-y-2">{processingResult.observaciones.map((obs, i) => (<li key={i} className="flex gap-2 text-sm text-amber-100/80"><span className="text-amber-500 mt-1.5">•</span><span>{obs}</span></li>))}</ul></div>)}
                
                {/* Redacción Sugerida (Azul) */}
                <div className="border border-blue-900/50 bg-blue-950/20 rounded-xl overflow-hidden">
                    <div className="bg-blue-900/30 px-4 py-2 border-b border-blue-900/50 flex items-center gap-2">
                        <BookOpen size={16} className="text-blue-400"/>
                        <span className="font-bold text-blue-400 text-sm uppercase tracking-wide">
                            {appMode === 'admission' ? 'Padecimiento Sugerido' : 'Subjetivo Sugerido'}
                        </span>
                    </div>
                    <div className="p-4 text-sm text-blue-100/90 leading-relaxed italic">
                        "{appMode === 'admission' ? (processingResult as AiAnalysisResult).padecimientoMedico : (processingResult as AiEvolutionResult).subjetivoMejorado}"
                    </div>
                </div>

                {/* Diagnósticos */}
                <div><h4 className="text-indigo-400 text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2"><Activity size={16}/> Posibles Diagnósticos</h4><div className="space-y-3">{processingResult.diagnosticosSugeridos.map((dx, i) => (<div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"><div className="flex items-center gap-2 mb-1"><span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold font-mono">{dx.codigo}</span><span className="font-bold text-slate-200 text-sm">{dx.nombre}</span></div><p className="text-xs text-slate-400 pl-1">{dx.justificacion}</p></div>))}</div></div>

                {/* Análisis Clínico (Solo Evolución) */}
                {appMode === 'evolution' && (
                    <div className="border border-indigo-900/50 bg-indigo-950/20 rounded-xl overflow-hidden">
                        <div className="bg-indigo-900/30 px-4 py-2 border-b border-indigo-900/50 flex items-center gap-2">
                            <Activity size={16} className="text-indigo-400"/>
                            <span className="font-bold text-indigo-400 text-sm uppercase tracking-wide">Integración / Análisis</span>
                        </div>
                        <div className="p-4 text-sm text-indigo-100/90 leading-relaxed">
                            {(processingResult as AiEvolutionResult).analisisClinico}
                        </div>
                    </div>
                )}
                
                {/* Plan Sugerido (Verde) */}
                <div className="border border-slate-700 bg-slate-800/30 rounded-xl overflow-hidden"><div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700 flex items-center gap-2"><ClipboardPlus size={16} className="text-emerald-400"/><span className="font-bold text-emerald-400 text-sm uppercase tracking-wide">{appMode === 'admission' ? 'Plan Sugerido' : 'Plan de Manejo'}</span></div><div className="p-4 text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{appMode === 'admission' ? (processingResult as AiAnalysisResult).planEstructurado : (processingResult as AiEvolutionResult).planSugerido}</div></div>
              
              </div>
              <div className="p-4 bg-[#1e293b] border-t border-slate-700 flex justify-end gap-3"><button onClick={() => setProcessingResult(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">Cerrar</button><button onClick={applySystemSuggestions} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20 transition-all hover:scale-105"><Check size={16}/> Aplicar</button></div>
           </div>
        </div>
      )}

      {showHistory && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-4 max-h-[70vh] flex flex-col"><div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold">Historial</h3><button onClick={() => setShowHistory(false)}><X size={20}/></button></div><div className="flex-1 overflow-y-auto space-y-2">{notes.length===0 ? <p className="text-center text-slate-400 py-8">Vacio</p> : notes.map(n => <div key={n.id} className="p-3 border rounded-lg flex justify-between items-center"><div className="text-sm font-bold">{(n.form as any).nombre || 'Sin nombre'} <span className="text-xs text-slate-400 font-normal">({n.type})</span></div><div className="flex gap-2"><button onClick={() => { if(n.type === 'ingreso') { setForm(n.form as PatientForm); setAppMode('admission'); } else { setEvoForm(n.form as EvolutionForm); setAppMode('evolution'); } setShowHistory(false); showToast('Cargado'); }} className="p-1 text-blue-500"><FileUp size={16}/></button><button onClick={() => setNotes(StorageService.deleteNote(n.id))} className="p-1 text-red-500"><Trash2 size={16}/></button></div></div>)}</div></div></div>}
      
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 flex flex-col items-center animate-in zoom-in-95 max-w-sm w-full border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between w-full mb-4">
                 <h3 className="font-bold text-lg dark:text-white">Compartir App</h3>
                 <button onClick={() => setShowQr(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://notas-medicas.vercel.app/" alt="QR Code" className="w-48 h-48"/>
              </div>
              <p className="mt-4 text-sm text-center text-slate-500 dark:text-slate-400">Escanea este código para abrir la aplicación.</p>
           </div>
        </div>
      )}

      {showDisclaimer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <div className="bg-[#0f172a] text-slate-200 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 max-w-md w-full border border-slate-700">
                <div className="flex justify-between w-full mb-6">
                    <h3 className="font-bold text-xl text-white flex items-center gap-3">
                        <AlertTriangle size={24} className="text-amber-500" strokeWidth={2.5}/> Aviso Legal
                    </h3>
                    <button onClick={() => setShowDisclaimer(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24}/>
                    </button>
                </div>
                <div className="space-y-4 text-[15px] leading-relaxed text-slate-300">
                    <p>Esta aplicación fue creada como herramienta de <strong>enseñanza y entrenamiento clínico</strong>, diseñada para reforzar la correcta elaboración de notas de ingreso hospitalario.</p>
                    <p>Se apega a estándares internacionales y normativos del expediente clínico, pero <strong>no reemplaza la evaluación médica integral ni el criterio profesional</strong>.</p>
                    
                    <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl mt-4">
                        <p className="text-emerald-100/90 text-sm">
                            <strong>El usuario es responsable del uso adecuado de la información generada.</strong><br/>
                            Utilízala para aprender, mejorar y brindar una atención médica de calidad.
                        </p>
                    </div>
                </div>
                <button onClick={() => setShowDisclaimer(false)} className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 text-base">
                    Entendido
                </button>
             </div>
          </div>
      )}
    </div>
  );
}