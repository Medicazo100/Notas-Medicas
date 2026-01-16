import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Moon, Sun, Download, Trash2, CheckCircle, ChevronLeft, ChevronRight, 
  Check, Sparkles, Loader2, AlertTriangle, Plus, X, 
  Archive, FileUp, User, Stethoscope, HeartPulse, History, ClipboardPlus, Share2, QrCode, Wand2, Eye,
  AlertOctagon, BookOpen, Activity, Camera, ScanLine
} from 'lucide-react';
import QRCode from "react-qr-code";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

import { AuroraStyles } from './components/AuroraStyles';
import { SectionTitle, Label, Input, Select, TextArea } from './components/UIComponents';
import { AiService } from './services/aiService';
import { StorageService } from './services/storageService';
import { INITIAL_FORM, SIGNOS_ORDER, SIGNOS_LABELS, SIGNOS_UNITS, MONTHS, SEMIOLOGIA_TAGS, EXPLORACION_PLANTILLAS, ANTECEDENTES_OPTS, SUGERENCIAS_DX, DX_PRESETS, PRONOSTICO_OPTS, STEPS_CONFIG } from './constants';
import { PatientForm, AiAnalysisResult, NoteEntry } from './types';

export default function App() {
  const [form, setForm] = useState<PatientForm>(INITIAL_FORM);
  const [step, setStep] = useState(1);
  const [dark, setDark] = useState(false);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showQr, setShowQr] = useState(false); // App Share QR
  const [showDataQr, setShowDataQr] = useState(false); // Data Transfer QR
  const [isScanning, setIsScanning] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<AiAnalysisResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [glasgowTotal, setGlasgowTotal] = useState(15);
  const [dob, setDob] = useState({ d: '', m: '', y: '' });
  const [isRecording, setIsRecording] = useState(false);
  const [showPupilas, setShowPupilas] = useState(false);
  
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const [customAntecedente, setCustomAntecedente] = useState('');
  const [customDx, setCustomDx] = useState('');
  
  // Scanner Ref
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    StorageService.clearDraft();
    setNotes(StorageService.getNotes());
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) setDark(true);
  }, []);

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
    const timer = setTimeout(() => StorageService.saveDraft(form), 2000);
    return () => clearTimeout(timer);
  }, [form]);

  useEffect(() => {
    const { o, v, m } = form.g;
    setGlasgowTotal((parseInt(String(o))||0) + (parseInt(String(v))||0) + (parseInt(String(m))||0));
  }, [form.g]);

  // Scanner Effect
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isScanning && showDataQr) {
      // Small delay to ensure DOM element 'reader' is rendered
      timer = setTimeout(() => {
        const element = document.getElementById("reader");
        if (!element || scannerRef.current) return;

        try {
          // Initialize scanner
          const scanner = new Html5QrcodeScanner(
            "reader",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              showTorchButtonIfSupported: true,
              rememberLastUsedCamera: true
            },
            false // verbose
          );
          
          scannerRef.current = scanner;

          scanner.render(
            (decodedText) => {
               try {
                 const data = JSON.parse(decodedText);
                 // Validation: check if it looks like patient data
                 if (data && typeof data === 'object') {
                   setForm(prev => ({...prev, ...data}));
                   showToast('Datos importados correctamente');
                   
                   // Close scanner immediately upon success
                   setIsScanning(false);
                   setShowDataQr(false);
                 } else {
                   // Silent fail for non-json or non-matching data, or show specific error
                 }
               } catch (e) {
                 // Not valid JSON, ignore
               }
            }, 
            (error) => {
               // Scanning error (e.g. no QR code found in frame), ignore
            }
          );
        } catch (err) {
          console.error("Failed to initialize scanner", err);
          showToast("No se pudo iniciar la cámara");
        }
      }, 300);
    } 

    // Cleanup function
    return () => {
       clearTimeout(timer);
       if (scannerRef.current) {
         try {
           scannerRef.current.clear().catch(err => console.warn("Scanner cleanup warning:", err));
         } catch (e) {
           console.error("Scanner cleanup error:", e);
         }
         scannerRef.current = null;
       }
    };
  }, [isScanning, showDataQr]);

  const updateForm = (field: keyof PatientForm, val: any) => setForm(prev => ({ ...prev, [field]: val }));
  
  const handleSigno = (key: string, val: string) => {
    setForm(prev => {
      const next = { ...prev.signos, [key]: val };
      if (key === 'peso' || key === 'talla') {
        const p = parseFloat(next.peso);
        const t = parseFloat(next.talla) / 100;
        if (p && t) next.imc = (p / (t * t)).toFixed(1);
      }
      return { ...prev, signos: next };
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleVoice = (field = 'padecimientoActual') => {
      const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Speech) return showToast('Navegador no soporta voz');
      if (isRecording) { setIsRecording(false); return; }
      const rec = new Speech();
      rec.lang = 'es-MX'; rec.interimResults = false;
      rec.onstart = () => setIsRecording(true);
      rec.onend = () => setIsRecording(false);
      rec.onerror = () => { setIsRecording(false); showToast('Error en dictado'); };
      rec.onresult = (e: any) => {
          const t = e.results[0][0].transcript;
          if (field === 'padecimientoActual') {
             updateForm('padecimientoActual', (form.padecimientoActual ? form.padecimientoActual + ' ' : '') + t);
          } else if (field === 'dx') {
             setCustomDx(t);
          } else if (field === 'import') {
             setImportText(prev => (prev ? prev + ' ' : '') + t);
          }
          showToast('Texto añadido');
      };
      rec.start();
  };

  const handleSystemAnalysis = async (data = form) => {
    if (data.padecimientoActual.length < 5 && step > 1) return showToast('Escribe más detalles en el padecimiento actual');
    setIsProcessing(true);
    const result = await AiService.analyze(data);
    setIsProcessing(false);
    if (result) setProcessingResult(result);
    else showToast('No se pudo conectar con el sistema');
  };

  const handleSmartFill = async () => {
    if (!importText.trim()) return showToast('Pega un texto primero');
    setIsImporting(true);
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
  };

  const applySystemSuggestions = () => {
    if (!processingResult) return;
    setForm(prev => {
      const newDiagnoses = processingResult.diagnosticosSugeridos.map(d => `${d.codigo} - ${d.nombre}`);
      const combinedDx = Array.from(new Set([...prev.diagnostico, ...newDiagnoses]));
      
      return {
        ...prev,
        padecimientoActual: processingResult.padecimientoMedico || prev.padecimientoActual,
        plan: processingResult.planEstructurado || prev.plan,
        diagnostico: combinedDx
      };
    });
    setProcessingResult(null);
    showToast('Sugerencias integradas correctamente');
  };
  
  const addAntecedente = (a: string) => { 
    if (a && !form.antecedentes.includes(a)) updateForm('antecedentes', [...form.antecedentes, a]); 
  };
  
  const removeAntecedente = (a: string) => {
    updateForm('antecedentes', form.antecedentes.filter(x => x !== a));
  };
  
  const addDx = (dx: string) => {
    if(dx && !form.diagnostico.includes(dx)) {
        updateForm('diagnostico', [...form.diagnostico, dx]);
        setCustomDx('');
        showToast('Diagnóstico agregado');
    }
  };
  
  const removeDx = (dx: string) => {
    updateForm('diagnostico', form.diagnostico.filter(x => x !== dx));
  };
  
  const saveToHistory = () => {
    const note: NoteEntry = { id: Date.now(), date: new Date().toISOString(), form: { ...form } };
    const updatedNotes = StorageService.saveNote(note);
    setNotes(updatedNotes);
    return updatedNotes;
  };

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
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; background: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 20px; font-size: 14px">
          <div><b>Paciente:</b> ${data.nombre}</div><div><b>Edad:</b> ${data.edad}</div><div><b>Sexo:</b> ${data.sexo}</div>
        </div>
        <div style="margin-bottom: 15px"><h4 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; font-size: 14px; text-transform: uppercase; color: #444">Motivo</h4><p style="font-size: 14px; line-height: 1.5; white-space: pre-wrap">${data.padecimientoActual}</p></div>
        <div style="margin-bottom: 15px"><h4 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; font-size: 14px; text-transform: uppercase; color: #444">Signos Vitales</h4><div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; font-size: 12px">${renderSignos()}<div><b>Glasgow:</b> ${glasgow}</div></div></div>
        <div style="margin-bottom: 15px"><h4 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; font-size: 14px; text-transform: uppercase; color: #444">Exploración Física</h4><p style="font-size: 13px; line-height: 1.4; white-space: pre-wrap">${data.exploracion}</p></div>
        <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 4px"><h4 style="margin: 0 0 5px 0; font-size: 14px; color: #000">DIAGNÓSTICO</h4><ul style="margin: 0; padding-left: 20px; font-size: 14px; font-weight: bold">${data.diagnostico.map(d => `<li>${d}</li>`).join('')}</ul></div>
        <div style="margin-bottom: 30px"><h4 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; font-size: 14px; text-transform: uppercase; color: #444">Plan</h4><p style="font-size: 14px; line-height: 1.5; white-space: pre-wrap">${data.plan}</p></div>
        <div style="text-align: center; margin-top: 40px"><div style="border-top: 1px solid #000; width: 250px; margin: 0 auto; padding-top: 5px; font-size: 13px; font-weight: bold">Dr(a). ${data.medicoTratante || ''}</div><div style="font-size: 11px;">Céd. Prof. ${data.cedulaProfesional || ''}</div></div>
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
    if (!form.nombre) return showToast('Falta el nombre del paciente');
    const html = generateDocHTML(form);
    downloadFile(html, `Nota_${form.nombre.replace(/\s+/g, '_')}`);
    saveToHistory();
    showToast('Nota descargada correctamente');
  };

  const generateWhatsAppText = (data: PatientForm) => {
    const glasgow = (parseInt(String(data.g?.o))||0) + (parseInt(String(data.g?.v))||0) + (parseInt(String(data.g?.m))||0);
    
    let text = `*REGISTRO MÉDICO COMPLETO*\n----------------------\n`;
    
    // 1. Identificación
    text += `*FICHA DE IDENTIFICACIÓN*\n`;
    if(data.folio) text += `Folio: ${data.folio}\n`;
    text += `Paciente: ${data.nombre}\n`;
    if(data.edad) text += `Edad: ${data.edad}\n`;
    if(data.sexo) text += `Sexo: ${data.sexo}\n`;
    if(data.fn) text += `Fecha Nac: ${data.fn}\n`;
    if(data.estadoCivil) text += `E. Civil: ${data.estadoCivil}\n`;
    if(data.escolaridad) text += `Escolaridad: ${data.escolaridad}\n`;
    if(data.ocupacion) text += `Ocupación: ${data.ocupacion}\n`;
    if(data.domicilio) text += `Domicilio: ${data.domicilio}\n`;
    if(data.telefono) text += `Teléfono: ${data.telefono}\n`;
    if(data.responsable) text += `Responsable: ${data.responsable}\n`;
    
    text += `\n*DATOS MÉDICO*\n`;
    if(data.medicoTratante) text += `Dr(a): ${data.medicoTratante}\n`;
    if(data.cedulaProfesional) text += `Cédula: ${data.cedulaProfesional}\n`;

    // 2. Motivo
    text += `\n*MOTIVO DE CONSULTA*\n`;
    if(data.sintomaPrincipal) text += `Síntoma: ${data.sintomaPrincipal}\n`;
    if(data.tiempoEvolucion) text += `Evolución: ${data.tiempoEvolucion}\n`;
    text += `\n*PADECIMIENTO ACTUAL*\n${data.padecimientoActual}\n`;

    // 3. Signos Vitales
    text += `\n*SIGNOS VITALES*\n`;
    text += `TA: ${data.signos.ta} | FC: ${data.signos.fc} | FR: ${data.signos.fr}\n`;
    text += `Temp: ${data.signos.temp} | Sat: ${data.signos.sat} | Gluc: ${data.signos.gluc}\n`;
    text += `Peso: ${data.signos.peso} | Talla: ${data.signos.talla} | IMC: ${data.signos.imc}\n`;
    text += `Glasgow: ${glasgow} (O${data.g.o} V${data.g.v} M${data.g.m})\n`;
    if(data.pupilas) text += `Pupilas: ${data.pupilas}\n`;

    // 4. Antecedentes y Exploración
    text += `\n*EXPLORACIÓN FÍSICA*\n${data.exploracion}\n`;

    text += `\n*ANTECEDENTES*\n`;
    if(data.antecedentes.length > 0) text += `Patológicos: ${data.antecedentes.join(', ')}\n`;
    if(data.alergias) text += `Alergias: ${data.alergias}\n`;
    text += `Tabaquismo: ${data.tabaquismo} | Alcohol: ${data.alcohol}\n`;

    // 5. Diagnóstico y Plan
    text += `\n*DIAGNÓSTICO*\n`;
    data.diagnostico.forEach(d => text += `• ${d}\n`);
    
    if(data.pronostico) text += `Pronóstico: ${data.pronostico}\n`;
    
    text += `\n*PLAN DE TRATAMIENTO*\n${data.plan}`;
    
    return text;
  };

  const handleWhatsApp = () => {
    if (!form.nombre) return showToast('Falta el nombre del paciente');
    saveToHistory(); 
    const text = generateWhatsAppText(form);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    showToast('Abriendo WhatsApp...');
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionTitle><User size={20}/> Ficha de Identificación</SectionTitle>
            
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
                <div><Label>Médico Tratante</Label><Input value={form.medicoTratante} onChange={e => updateForm('medicoTratante', e.target.value)} /></div>
                <div><Label>Cédula Profesional</Label><Input value={form.cedulaProfesional} onChange={e => updateForm('cedulaProfesional', e.target.value)} /></div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionTitle><History size={20}/> Motivo de Consulta</SectionTitle>
            
            <div>
              <Label>Síntoma Principal</Label>
              <Input 
                value={form.sintomaPrincipal} 
                onChange={e => updateForm('sintomaPrincipal', e.target.value)} 
                placeholder="Ej. Convulsiones, Dolor torácico..." 
              />
            </div>

            <div>
              <Label>Tiempo de Evolución</Label>
              <Input 
                value={form.tiempoEvolucion} 
                onChange={e => updateForm('tiempoEvolucion', e.target.value)} 
                placeholder="Ej. 30 minutos, 2 días..." 
              />
            </div>

            <div className="relative">
              <Label>Padecimiento Actual (Breve)</Label>
              <div className="relative">
                <TextArea 
                  rows={12} 
                  value={form.padecimientoActual} 
                  onChange={e => updateForm('padecimientoActual', e.target.value)} 
                  className="pb-10" 
                />
                <button 
                  onClick={() => toggleVoice('padecimientoActual')} 
                  className={`absolute bottom-3 right-3 p-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-emerald-600'} text-white shadow-lg transition-transform hover:scale-110 active:scale-95`}
                >
                  <Mic size={20} />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                 {SEMIOLOGIA_TAGS.map(tag => (
                   <button 
                     key={tag}
                     onClick={() => {
                       const text = form.padecimientoActual;
                       const separator = text.length > 0 && !text.endsWith('\n') ? '\n' : '';
                       updateForm('padecimientoActual', text + separator + tag + ' ');
                     }}
                     className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm"
                   >
                     <Plus size={12}/> {tag.replace(':', '')}
                   </button>
                 ))}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionTitle><HeartPulse size={20}/> Signos Vitales & Glasgow</SectionTitle>
            
            {/* Vital Signs Grid */}
            <div className="grid grid-cols-3 gap-3">
              {SIGNOS_ORDER.map(key => (
                <div key={key} className="aspect-square p-2 bg-slate-100 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 relative group">
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">{SIGNOS_LABELS[key]}</label>
                  <input 
                    value={(form.signos as any)[key]} 
                    onChange={e => handleSigno(key, e.target.value)} 
                    className="w-full text-center text-xl sm:text-2xl font-bold bg-transparent outline-none text-slate-800 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400">{SIGNOS_UNITS[key]}</span>
                </div>
              ))}
            </div>

            {/* Glasgow Scale */}
            <div className="bg-slate-100 dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="text-sm font-bold mb-4 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2">Escala de Glasgow</h4>
              <div className="flex gap-4">
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {/* Ocular */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-center text-slate-400 uppercase font-bold">Ocular</span>
                    {[4,3,2,1].map(v => (
                      <button 
                        key={v} 
                        onClick={() => setForm(p=>({...p, g:{...p.g, o:v}}))} 
                        className={`h-8 text-sm rounded-lg font-bold transition-all ${Number(form.g.o)===v ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {/* Verbal */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-center text-slate-400 uppercase font-bold">Verbal</span>
                    {[5,4,3,2,1].map(v => (
                      <button 
                        key={v} 
                        onClick={() => setForm(p=>({...p, g:{...p.g, v:v}}))} 
                        className={`h-8 text-sm rounded-lg font-bold transition-all ${Number(form.g.v)===v ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {/* Motora */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-center text-slate-400 uppercase font-bold">Motora</span>
                    {[6,5,4,3,2,1].map(v => (
                      <button 
                        key={v} 
                        onClick={() => setForm(p=>({...p, g:{...p.g, m:v}}))} 
                        className={`h-8 text-sm rounded-lg font-bold transition-all ${Number(form.g.m)===v ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Total & Pupilas Right Panel */}
                <div className="flex flex-col items-center justify-center min-w-[90px] border-l border-slate-200 dark:border-slate-600 pl-4 gap-4">
                   <div className="text-center">
                     <span className="text-[10px] uppercase text-slate-400 block mb-1">Total</span>
                     <span className="text-5xl font-bold text-emerald-500">{glasgowTotal}</span>
                   </div>
                   <div className="w-full relative group">
                      <select
                        value={form.pupilas}
                        onChange={(e) => updateForm('pupilas', e.target.value)}
                        className="w-full py-2 px-1 text-[10px] bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-center outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700 dark:text-slate-300 cursor-pointer appearance-none"
                        style={{textAlignLast: 'center'}}
                      >
                        <option value="Isocóricas">Isocóricas</option>
                        <option value="Miosis">Miosis</option>
                        <option value="Midriasis">Midriasis</option>
                        <option value="Anisocoria">Anisocoria</option>
                      </select>
                   </div>
                </div>
              </div>
            </div>

            {/* Exploración Física */}
            <div>
              <Label>Exploración Física Breve</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                 {Object.keys(EXPLORACION_PLANTILLAS).map(key => (
                    <button 
                      key={key}
                      onClick={() => {
                        const text = form.exploracion;
                        const separator = text.length > 0 && !text.endsWith('\n') ? '\n\n' : '';
                        // Just append the text
                        updateForm('exploracion', text + separator + key + ':\n' + EXPLORACION_PLANTILLAS[key]);
                      }}
                      className="px-3 py-1.5 bg-slate-700/80 text-white rounded-full text-xs font-bold hover:bg-slate-600 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={12}/> {key}
                    </button>
                 ))}
              </div>
              <TextArea 
                rows={8} 
                value={form.exploracion} 
                onChange={e => updateForm('exploracion', e.target.value)} 
                placeholder="Describe aqui una exploracion fisica completa, sistematica y detallada del paciente"
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionTitle><ClipboardPlus size={20}/> Antecedentes</SectionTitle>
            
            {/* Patológicos */}
            <div>
               <Label>Patológicos</Label>
               {/* Container for tags */}
               <div className="min-h-[60px] p-3 bg-slate-100 dark:bg-[#1e293b] rounded-xl mb-3 flex flex-wrap gap-2 items-center border border-slate-200 dark:border-slate-700 shadow-inner">
                  {form.antecedentes.length === 0 && <span className="text-slate-400 text-sm italic">Ninguno seleccionado</span>}
                  {form.antecedentes.map(a => (
                    <span key={a} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 animate-in zoom-in border border-slate-300 dark:border-slate-600">
                       {a} <button onClick={() => removeAntecedente(a)} className="hover:text-red-500"><X size={14}/></button>
                    </span>
                  ))}
               </div>
               
               {/* Quick Buttons Grid */}
               <div className="grid grid-cols-3 gap-2">
                 {ANTECEDENTES_OPTS.map(o => (
                    <button 
                      key={o} 
                      onClick={() => addAntecedente(o)} 
                      className="px-2 py-2 bg-slate-200 dark:bg-[#1e293b] hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1 border border-slate-300 dark:border-slate-700"
                    >
                      <Plus size={12}/> {o}
                    </button>
                 ))}
               </div>
            </div>

            {/* Custom Add */}
            <div>
               <Label>Añadir Otro Antecedente</Label>
               <div className="flex gap-2">
                  <Input 
                    value={customAntecedente}
                    onChange={e => setCustomAntecedente(e.target.value)}
                    placeholder="Ej: Hipotiroidismo"
                    onKeyDown={e => e.key === 'Enter' && (addAntecedente(customAntecedente), setCustomAntecedente(''))}
                    className="dark:bg-[#1e293b] dark:border-slate-700"
                  />
                  <button 
                    onClick={() => { addAntecedente(customAntecedente); setCustomAntecedente(''); }}
                    className="aspect-square bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 w-14"
                  >
                    <Plus size={24}/>
                  </button>
               </div>
            </div>

            {/* Alergias */}
            <div>
               <Label>Alergias</Label>
               <Input 
                 value={form.alergias} 
                 onChange={e => updateForm('alergias', e.target.value)}
                 placeholder="Niega o especifica..."
                 className="dark:bg-[#1e293b] dark:border-slate-700"
               />
            </div>

            {/* Habits */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <Label>Tabaquismo</Label>
                  <Select 
                     value={form.tabaquismo} 
                     onChange={e => updateForm('tabaquismo', e.target.value)}
                     className="dark:bg-[#1e293b] dark:border-slate-700"
                  >
                     <option value="Negado">Niega</option>
                     <option value="Positivo">Positivo</option>
                  </Select>
               </div>
               <div>
                  <Label>Alcoholismo</Label>
                  <Select 
                     value={form.alcohol} 
                     onChange={e => updateForm('alcohol', e.target.value)}
                     className="dark:bg-[#1e293b] dark:border-slate-700"
                  >
                     <option value="Negado">Niega</option>
                     <option value="Ocasional">Ocasional</option>
                     <option value="Frecuente">Frecuente</option>
                  </Select>
               </div>
            </div>

            <p className="text-center text-[10px] text-slate-400 italic pt-2">
              Los campos no modificados se asumen negados.
            </p>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionTitle><CheckCircle size={20}/> Diagnóstico y Plan</SectionTitle>
            
            {/* Diagnosticos Presuntivos Section */}
            <div>
              <Label>Diagnósticos Presuntivos</Label>
              {/* Container: Light mode: bg-slate-50 border-slate-200. Dark mode: bg-slate-900/50 border-slate-700 */}
              <div className="min-h-[50px] p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-3 flex flex-col gap-2 border border-slate-200 dark:border-slate-700 transition-colors">
                  {form.diagnostico.length === 0 ? (
                    <span className="text-slate-400 dark:text-slate-500 text-sm italic py-2 px-1">No hay diagnósticos agregados.</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {form.diagnostico.map(dx => (
                        /* Tag: Light: bg-white text-slate-700 border-slate-200. Dark: bg-slate-800 text-slate-200 border-slate-600 */
                        <div key={dx} className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm shadow-sm transition-colors">
                           <span>{dx}</span>
                           <button onClick={() => removeDx(dx)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400"><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              <div className="flex gap-2 mb-4">
                 <div className="relative flex-1">
                    {/* Input: Light: bg-white border-slate-200 text-slate-900. Dark: bg-slate-800 border-slate-700 text-slate-200 */}
                    <Input 
                      value={customDx} 
                      onChange={e => setCustomDx(e.target.value)} 
                      placeholder="[CIE-10] – Nombre del diagnóstico..." 
                      onKeyDown={e => e.key==='Enter' && addDx(customDx)} 
                      className="pr-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <button 
                      onClick={() => toggleVoice('dx')} 
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-white ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                    >
                      <Mic size={18}/>
                    </button>
                 </div>
                 <button 
                   onClick={() => addDx(customDx)} 
                   className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl w-14 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                 >
                   <Plus size={24}/>
                 </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                 {DX_PRESETS.map(preset => (
                    /* Preset Button: Light: bg-white border-slate-200 text-slate-600. Dark: bg-slate-800 border-slate-700 text-slate-300 */
                    <button 
                      key={preset.code} 
                      onClick={() => addDx(`${preset.code} - ${preset.label}`)}
                      className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Plus size={10}/> {preset.code}
                    </button>
                 ))}
              </div>
            </div>

            {/* Pronostico */}
            <div>
               <Label>Pronóstico</Label>
               {/* Container: Light: bg-slate-100 border-slate-200. Dark: bg-slate-900 border-slate-800 */}
               <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  {PRONOSTICO_OPTS.map(opt => (
                     <button
                       key={opt}
                       onClick={() => updateForm('pronostico', opt)}
                       className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        form.pronostico === opt 
                        ? 'bg-emerald-600 text-white shadow-md transform scale-[1.02]' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                       }`}
                     >
                       {opt}
                     </button>
                  ))}
               </div>
            </div>

            {/* Plan de Tratamiento */}
            <div>
              <Label>Plan de Tratamiento</Label>
              {/* Textarea: Light: bg-white border-slate-200. Dark: bg-slate-800 border-slate-700 */}
              <TextArea 
                rows={8} 
                value={form.plan} 
                onChange={e => updateForm('plan', e.target.value)} 
                placeholder="1. Dieta... 2. Soluciones... 3. Meds..."
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 font-mono text-sm"
              />
            </div>
            
            {/* Smart Fill Card */}
            {/* Card: Light: bg-slate-50 border-slate-200. Dark: bg-slate-950 border-slate-800 */}
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-4 transition-colors">
              <h4 className="text-emerald-600 dark:text-emerald-400 font-bold mb-2 flex items-center gap-2">
                <Wand2 size={18}/> Autocompletar Automático
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 leading-relaxed">
                Pega aquí una nota de texto desordenada o información del paciente. El sistema extraerá los datos y rellenará los campos del formulario automáticamente.
              </p>
              
              <div className="relative mb-4">
                {/* Textarea: Light: bg-white border-slate-200. Dark: bg-slate-900 border-slate-700 */}
                <TextArea 
                  rows={4} 
                  value={importText} 
                  onChange={e => setImportText(e.target.value)} 
                  placeholder="Ej: Paciente masculino de 45 años, acude por dolor abdominal de 3 días..." 
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 text-sm pr-10 shadow-sm"
                />
                 <button 
                  onClick={() => toggleVoice('import')} 
                  className={`absolute right-3 top-3 text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                >
                  <Mic size={18}/>
                </button>
              </div>

              <button 
                onClick={handleSmartFill} 
                disabled={isImporting} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? <Loader2 className="animate-spin" size={20}/> : <Wand2 size={20}/>} 
                Rellenar Formulario
              </button>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="app-bg min-h-screen text-slate-800 dark:text-slate-200 pb-20 font-sans">
      <AuroraStyles />
      <div className="bg-emerald-600 dark:bg-[#00d2ff] sticky top-0 z-50 px-3 py-1.5 flex justify-between items-center shadow-md border-b border-white/10 dark:border-black/10 transition-all duration-300">
          <div className="flex items-center gap-2">
              <button onClick={() => setShowDisclaimer(true)} className="bg-white/20 dark:bg-black/10 text-white dark:text-slate-950 p-2 rounded-xl hover:bg-white/30 dark:hover:bg-black/20 transition-colors shadow-sm">
                  <Stethoscope size={24}/>
              </button>
              <div className="flex flex-col">
                   <h1 className="font-bold text-base leading-4 text-white dark:text-slate-900">Nota de Ingreso</h1>
                   <h1 className="font-bold text-base leading-4 text-white dark:text-slate-900">Hospitalario</h1>
                   <p className="text-[10px] text-emerald-50 dark:text-slate-900 opacity-90 font-medium">By Dr. Gabriel Mendez</p>
              </div>
          </div>
          <div className="flex gap-0.5">
              <button onClick={() => setShowQr(true)} className="p-1.5 text-white dark:text-slate-900 hover:bg-white/20 dark:hover:bg-black/10 rounded-lg transition-colors"><QrCode size={22}/></button>
              <button onClick={() => handleSystemAnalysis()} disabled={isProcessing} className="p-1.5 text-white dark:text-slate-900 hover:bg-white/20 dark:hover:bg-black/10 rounded-lg transition-colors">{isProcessing ? <Loader2 className="animate-spin" size={22} /> : <Sparkles size={22}/>}</button>
              <button onClick={() => setDark(!dark)} className="p-1.5 text-white dark:text-slate-900 hover:bg-white/20 dark:hover:bg-black/10 rounded-lg transition-colors">{dark ? <Sun size={22}/> : <Moon size={22}/>}</button>
              <button onClick={() => setShowHistory(true)} className="p-1.5 text-white dark:text-slate-900 hover:bg-white/20 dark:hover:bg-black/10 rounded-lg transition-colors"><Archive size={22}/></button>
          </div>
      </div>
      <div className="bg-blue-500 dark:bg-[#064e3b] px-4 pt-6 pb-12 shadow-sm relative z-20"><div className="flex justify-between max-w-lg mx-auto">{STEPS_CONFIG.map(s => <div key={s.id} onClick={() => setStep(s.id)} className="flex flex-col items-center gap-1 cursor-pointer"><div className={`w-12 h-12 rounded-full flex items-center justify-center border-[3px] transition-all ${step===s.id ? 'bg-white text-emerald-600 border-white scale-110 shadow-lg' : 'border-white/40 text-white'}`}><s.icon size={22}/></div><span className={`text-[10px] font-bold ${step===s.id ? 'text-white' : 'text-emerald-100/60'}`}>{s.label}</span></div>)}</div></div>
      <main className="px-4 -mt-6 relative z-30"><div className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl max-w-3xl mx-auto min-h-[60vh] flex flex-col justify-between">
          {renderStep()}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 items-center">
             <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="flex items-center gap-2 text-slate-400 disabled:opacity-30 hover:text-emerald-600 font-medium transition-colors"><ChevronLeft size={20}/> Atrás</button>
             {step < 5 ? (<button onClick={() => setStep(step + 1)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transform hover:scale-105 transition-all">Siguiente <ChevronRight size={18}/></button>) : (
               <div className="flex gap-3 w-full sm:w-auto justify-end">
                 {/* Word */}
                 <button onClick={downloadWord} title="Descargar Word" className="p-3 border-2 border-emerald-600 text-emerald-600 rounded-xl font-bold transition-transform hover:scale-105 shadow-sm">
                    <Download size={20}/>
                 </button>
                 {/* WhatsApp */}
                 <button onClick={handleWhatsApp} title="Compartir WhatsApp" className="p-3 bg-emerald-600 text-white rounded-xl font-bold transition-transform hover:scale-105 shadow-md">
                    <Share2 size={20}/>
                 </button>
                 {/* Generate QR */}
                 <button onClick={() => { setShowDataQr(true); setIsScanning(false); }} title="Generar QR de Paciente" className="p-3 bg-slate-700 text-white rounded-xl font-bold transition-transform hover:scale-105 shadow-md border border-slate-600">
                    <QrCode size={20}/>
                 </button>
                 {/* Scan QR */}
                 <button onClick={() => { setShowDataQr(true); setIsScanning(true); }} title="Escanear QR" className="p-3 bg-indigo-600 text-white rounded-xl font-bold transition-transform hover:scale-105 shadow-md border border-indigo-500">
                     <ScanLine size={20}/>
                 </button>
               </div>
             )}
          </div>
      </div></main>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce flex items-center gap-2 text-sm"><CheckCircle size={16} className="text-emerald-400"/> {toast}</div>}
      
      {/* IMPROVED AI RESULTS MODAL - Matching Screenshot Design */}
      {processingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-[#0f172a] w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl border border-slate-700 animate-in zoom-in-95">
              
              {/* Header */}
              <div className="bg-[#1e293b] p-4 flex justify-between items-center border-b border-slate-700">
                <h3 className="font-bold text-lg text-indigo-400 flex items-center gap-2">
                  <Sparkles className="text-indigo-500" size={20} /> Análisis Clínico Automatizado
                </h3>
                <button onClick={() => setProcessingResult(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20}/>
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-6 text-slate-300 custom-scrollbar">
                
                {/* 1. OBSERVACIONES - Amber Alert Style */}
                {processingResult.observaciones && processingResult.observaciones.length > 0 && (
                  <div className="border border-amber-900/50 bg-amber-950/20 rounded-xl overflow-hidden">
                     <div className="bg-amber-900/30 px-4 py-2 border-b border-amber-900/50 flex items-center gap-2">
                        <AlertOctagon size={16} className="text-amber-500"/>
                        <span className="font-bold text-amber-500 text-sm uppercase tracking-wide">Observaciones Críticas</span>
                     </div>
                     <ul className="p-4 space-y-2">
                       {processingResult.observaciones.map((obs, i) => (
                         <li key={i} className="flex gap-2 text-sm text-amber-100/80">
                           <span className="text-amber-500 mt-1.5">•</span>
                           <span>{obs}</span>
                         </li>
                       ))}
                     </ul>
                  </div>
                )}

                {/* 2. PADECIMIENTO - Blue Info Style */}
                <div className="border border-blue-900/50 bg-blue-950/20 rounded-xl overflow-hidden">
                   <div className="bg-blue-900/30 px-4 py-2 border-b border-blue-900/50 flex items-center gap-2">
                      <BookOpen size={16} className="text-blue-400"/>
                      <span className="font-bold text-blue-400 text-sm uppercase tracking-wide">Padecimiento Sugerido</span>
                   </div>
                   <div className="p-4 text-sm text-blue-100/90 leading-relaxed italic">
                      "{processingResult.padecimientoMedico}"
                   </div>
                </div>

                {/* 3. DIAGNOSTICOS - Grid of Cards */}
                <div>
                   <h4 className="text-indigo-400 text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
                     <Activity size={16}/> Posibles Diagnósticos
                   </h4>
                   <div className="space-y-3">
                      {processingResult.diagnosticosSugeridos.map((dx, i) => (
                        <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:border-indigo-500/50 transition-colors">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold font-mono">
                                {dx.codigo}
                              </span>
                              <span className="font-bold text-slate-200 text-sm">{dx.nombre}</span>
                           </div>
                           <p className="text-xs text-slate-400 pl-1">{dx.justificacion}</p>
                        </div>
                      ))}
                   </div>
                </div>

                {/* 4. PLAN - Pre-wrap Text */}
                <div className="border border-slate-700 bg-slate-800/30 rounded-xl overflow-hidden">
                   <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700 flex items-center gap-2">
                      <ClipboardPlus size={16} className="text-emerald-400"/>
                      <span className="font-bold text-emerald-400 text-sm uppercase tracking-wide">Plan Sugerido</span>
                   </div>
                   <div className="p-4 text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {processingResult.planEstructurado}
                   </div>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-[#1e293b] border-t border-slate-700 flex justify-end gap-3">
                 <button onClick={() => setProcessingResult(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors">
                   Cerrar
                 </button>
                 <button onClick={applySystemSuggestions} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/20 transition-all hover:scale-105">
                   <Check size={16}/> Aplicar Cambios
                 </button>
              </div>
           </div>
        </div>
      )}

      {showHistory && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-4 max-h-[70vh] flex flex-col"><div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold">Historial</h3><button onClick={() => setShowHistory(false)}><X/></button></div><div className="flex-1 overflow-y-auto space-y-2">{notes.length===0 ? <p className="text-center text-slate-400 py-8">Vacio</p> : notes.map(n => <div key={n.id} className="p-3 border rounded-lg flex justify-between items-center"><div className="text-sm font-bold">{n.form.nombre || 'Sin nombre'}</div><div className="flex gap-2"><button onClick={() => { setForm(n.form); setShowHistory(false); showToast('Cargado'); }} className="p-1 text-blue-500"><FileUp size={16}/></button><button onClick={() => setNotes(StorageService.deleteNote(n.id))} className="p-1 text-red-500"><Trash2 size={16}/></button></div></div>)}</div></div></div>}
      
      {/* App Share QR Modal */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 flex flex-col items-center animate-in zoom-in-95 max-w-sm w-full border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between w-full mb-4">
                 <h3 className="font-bold text-lg dark:text-white">Compartir App</h3>
                 <button onClick={() => setShowQr(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://notas-medicas.vercel.app/" 
                  alt="QR Code" 
                  className="w-48 h-48"
                />
              </div>
              <p className="mt-4 text-sm text-center text-slate-500 dark:text-slate-400">
                Escanea este código para abrir la aplicación en tu dispositivo móvil.
              </p>
           </div>
        </div>
      )}

      {/* NEW: Data Transfer QR Modal (Generate + Scan) */}
      {showDataQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 flex flex-col items-center animate-in zoom-in-95 max-w-md w-full border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between w-full mb-4 items-center">
                 <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                   <ScanLine size={24} className="text-emerald-500"/> Transferir Paciente
                 </h3>
                 <button onClick={() => { setShowDataQr(false); setIsScanning(false); }} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
              </div>
              
              {!isScanning ? (
                <>
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-lg mb-4">
                    <QRCode 
                        value={JSON.stringify(form, (k, v) => {
                            // Removing signature (too big) and empty/null values to fit QR capacity
                            if (k === 'firmaDataURL') return undefined; 
                            if (v === "" || v === null) return undefined;
                            if (Array.isArray(v) && v.length === 0) return undefined;
                            return v;
                        })} 
                        size={256}
                        level="L"
                    />
                  </div>
                  <p className="text-sm text-center text-slate-600 dark:text-slate-300 mb-6 font-medium">
                    Muestra este código a otro dispositivo para transferir la información completa del paciente.
                  </p>
                  
                  <div className="w-full border-t border-slate-200 dark:border-slate-800 pt-6">
                     <p className="text-xs text-center text-slate-400 uppercase font-bold mb-3">O escanear para recibir</p>
                     <button 
                       onClick={() => setIsScanning(true)}
                       className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg border border-slate-700"
                     >
                       <Camera size={20}/> Activar Escáner
                     </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex flex-col items-center">
                   <div id="reader" className="w-full bg-black rounded-xl overflow-hidden border-2 border-emerald-500 mb-4 h-[300px]"></div>
                   <p className="text-xs text-center text-emerald-500 animate-pulse font-bold mb-4">Buscando código QR de paciente...</p>
                   <button 
                     onClick={() => setIsScanning(false)}
                     className="px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm"
                   >
                     Cancelar Escaneo
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {showDisclaimer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 max-w-md w-full border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between w-full mb-4">
                   <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><AlertTriangle size={20} className="text-amber-500"/> Aviso Legal</h3>
                   <button onClick={() => setShowDisclaimer(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                  <p>
                    Esta aplicación fue creada como herramienta de <strong>enseñanza y entrenamiento clínico</strong>, diseñada para reforzar la correcta elaboración de notas de ingreso hospitalario.
                  </p>
                  <p>
                    Se apega a estándares internacionales y normativos del expediente clínico, pero <strong>no reemplaza la evaluación médica integral ni el criterio profesional.</strong>
                  </p>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-medium">
                    El usuario es responsable del uso adecuado de la información generada.
                    <br/>
                    Utilízala para aprender, mejorar y brindar una atención médica de calidad.
                  </div>
                </div>
                <button onClick={() => setShowDisclaimer(false)} className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                  Entendido
                </button>
             </div>
          </div>
      )}
    </div>
  );
}