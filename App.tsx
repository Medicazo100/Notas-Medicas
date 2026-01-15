import React, { useState, useEffect } from 'react';
import { 
  Mic, Moon, Sun, Download, Trash2, CheckCircle, ChevronLeft, ChevronRight, 
  Check, Sparkles, Loader2, AlertTriangle, Plus, X, 
  Archive, FileUp, User, Stethoscope, HeartPulse, History, ClipboardPlus, Share2, QrCode, Wand2
} from 'lucide-react';

import { AuroraStyles } from './components/AuroraStyles';
import { SectionTitle, Label, Input, Select, TextArea } from './components/UIComponents';
import { AiService } from './services/aiService';
import { StorageService } from './services/storageService';
import { INITIAL_FORM, SIGNOS_ORDER, SIGNOS_LABELS, SIGNOS_UNITS, MONTHS, SEMIOLOGIA_TAGS, EXPLORACION_PLANTILLAS, ANTECEDENTES_OPTS, SUGERENCIAS_DX, STEPS_CONFIG } from './constants';
import { PatientForm, AiAnalysisResult, NoteEntry } from './types';

export default function App() {
  const [form, setForm] = useState<PatientForm>(INITIAL_FORM);
  const [step, setStep] = useState(1);
  const [dark, setDark] = useState(false);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showQr, setShowQr] = useState(false);
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
    if (data.padecimientoActual.length < 10) return showToast('Escribe más detalles en el padecimiento actual');
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
      showToast('Formulario autocompletado con éxito');
    } else {
      showToast('Error al interpretar los datos');
    }
  };

  const applySystemSuggestions = () => {
    if (!processingResult) return;
    setForm(prev => {
      const combinedDx = processingResult.differentialDx 
        ? Array.from(new Set([...prev.diagnostico, ...processingResult.differentialDx])) 
        : prev.diagnostico;
      return {
        ...prev,
        padecimientoActual: processingResult.improvedMotivo || prev.padecimientoActual,
        plan: processingResult.improvedPlan || prev.plan,
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
    let text = `*NOTA DE INGRESO*\n\n`;
    text += `*Paciente:* ${data.nombre} | *Edad:* ${data.edad}\n`;
    text += `*Sínoma:* ${data.sintomaPrincipal}\n`;
    text += `*Padecimiento:* ${data.padecimientoActual}\n\n`;
    text += `*SIGNOS VITALES*\n`;
    text += `TA: ${data.signos.ta} | FC: ${data.signos.fc} | Temp: ${data.signos.temp} | Sat: ${data.signos.sat}\n`;
    text += `*Glasgow:* ${glasgow} | *Pupilas:* ${data.pupilas}\n\n`;
    text += `*DIAGNÓSTICO*\n`;
    data.diagnostico.forEach(d => text += `• ${d}\n`);
    text += `\n*PLAN:*\n${data.plan}`;
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div><Label>Folio / Expediente</Label><Input value={form.folio} onChange={e => updateForm('folio', e.target.value)} placeholder="000-000" /></div>
               <div><Label>Fecha Nacimiento</Label><div className="grid grid-cols-3 gap-2">
                 <Select value={dob.d} onChange={e => setDob({...dob, d: e.target.value})}><option value="">Día</option>{Array.from({length: 31}, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>)}</Select>
                 <Select value={dob.m} onChange={e => setDob({...dob, m: e.target.value})}><option value="">Mes</option>{MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}</Select>
                 <Select value={dob.y} onChange={e => setDob({...dob, y: e.target.value})}><option value="">Año</option>{Array.from({length: 100}, (_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}</Select>
               </div></div>
            </div>
            <div><Label>Nombre Completo</Label><Input value={form.nombre} onChange={e => updateForm('nombre', e.target.value)} placeholder="Apellidos, Nombres" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Edad Calculada</Label><Input value={form.edad} readOnly className="font-bold bg-slate-50 dark:bg-slate-950" /></div>
              <div><Label>Sexo</Label><Select value={form.sexo} onChange={e => updateForm('sexo', e.target.value)}><option value="">-</option><option>Masculino</option><option>Femenino</option></Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Estado Civil</Label><Select value={form.estadoCivil} onChange={e => updateForm('estadoCivil', e.target.value)}><option value="">-</option><option>Soltero/a</option><option>Casado/a</option><option>Unión Libre</option></Select></div>
              <div><Label>Escolaridad</Label><Select value={form.escolaridad} onChange={e => updateForm('escolaridad', e.target.value)}><option value="">-</option><option>Ninguna</option><option>Primaria</option><option>Secundaria</option><option>Licenciatura</option></Select></div>
              <div><Label>Ocupación</Label><Input value={form.ocupacion} onChange={e => updateForm('ocupacion', e.target.value)} /></div>
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4"><SectionTitle><Stethoscope size={20}/> Médico Tratante</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nombre del Médico</Label><Input value={form.medicoTratante} onChange={e => updateForm('medicoTratante', e.target.value)} /></div>
                <div><Label>Cédula</Label><Input value={form.cedulaProfesional} onChange={e => updateForm('cedulaProfesional', e.target.value)} /></div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionTitle><History size={20}/> Motivo de Consulta</SectionTitle>
            <div><Label>Síntoma Principal</Label><Input value={form.sintomaPrincipal} onChange={e => updateForm('sintomaPrincipal', e.target.value)} /></div>
            <div className="relative"><Label>Padecimiento Actual</Label>
              <TextArea rows={10} value={form.padecimientoActual} onChange={e => updateForm('padecimientoActual', e.target.value)} />
              <button onClick={() => toggleVoice('padecimientoActual')} className={`absolute bottom-3 right-3 p-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-emerald-600'} text-white shadow-lg`}><Mic size={20} /></button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionTitle><HeartPulse size={20}/> Signos Vitales & Glasgow</SectionTitle>
            <div className="grid grid-cols-3 gap-3">{SIGNOS_ORDER.map(key => (
              <div key={key} className="p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-center">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">{SIGNOS_LABELS[key]}</label>
                <input value={(form.signos as any)[key]} onChange={e => handleSigno(key, e.target.value)} className="w-full text-center text-lg font-bold bg-transparent outline-none" />
                <span className="text-[9px] text-slate-400">{SIGNOS_UNITS[key]}</span>
              </div>
            ))}</div>
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-bold mb-3">Escala de Glasgow: {glasgowTotal}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1"><span className="text-[10px] text-center">Ocular</span>{[4,3,2,1].map(v => <button key={v} onClick={() => setForm(p=>({...p, g:{...p.g, o:v}}))} className={`py-1 text-sm rounded ${Number(form.g.o)===v ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'}`}>{v}</button>)}</div>
                <div className="flex flex-col gap-1"><span className="text-[10px] text-center">Verbal</span>{[5,4,3,2,1].map(v => <button key={v} onClick={() => setForm(p=>({...p, g:{...p.g, v:v}}))} className={`py-1 text-sm rounded ${Number(form.g.v)===v ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'}`}>{v}</button>)}</div>
                <div className="flex flex-col gap-1"><span className="text-[10px] text-center">Motora</span>{[6,5,4,3,2,1].map(v => <button key={v} onClick={() => setForm(p=>({...p, g:{...p.g, m:v}}))} className={`py-1 text-sm rounded ${Number(form.g.m)===v ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'}`}>{v}</button>)}</div>
              </div>
            </div>
            <div><Label>Exploración Física</Label><TextArea rows={6} value={form.exploracion} onChange={e => updateForm('exploracion', e.target.value)} /></div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionTitle><ClipboardPlus size={20}/> Antecedentes</SectionTitle>
            <div className="flex flex-wrap gap-2">{ANTECEDENTES_OPTS.map(o => <button key={o} onClick={() => addAntecedente(o)} className="px-3 py-1 bg-white border border-slate-300 dark:bg-slate-950 dark:border-slate-700 rounded text-sm hover:bg-slate-50">+ {o}</button>)}</div>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">{form.antecedentes.map(a => <span key={a} className="bg-white dark:bg-slate-800 px-2 py-1 rounded-md text-sm border flex items-center gap-2">{a} <button onClick={() => removeAntecedente(a)}><X size={12}/></button></span>)}</div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tabaquismo</Label><Select value={form.tabaquismo} onChange={e => updateForm('tabaquismo', e.target.value)}><option>Negado</option><option>Positivo</option></Select></div>
              <div><Label>Alcohol</Label><Select value={form.alcohol} onChange={e => updateForm('alcohol', e.target.value)}><option>Negado</option><option>Ocasional</option></Select></div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionTitle><CheckCircle size={20}/> Diagnóstico y Plan</SectionTitle>
            <div><Label>Diagnósticos</Label><div className="space-y-2 mb-4">{form.diagnostico.map(dx => <div key={dx} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-950 rounded border">{dx} <button onClick={() => removeDx(dx)}><Trash2 size={14}/></button></div>)}</div>
              <div className="flex gap-2"><Input value={customDx} onChange={e => setCustomDx(e.target.value)} placeholder="Nuevo diagnóstico..." onKeyDown={e => e.key==='Enter' && addDx(customDx)} /><button onClick={() => addDx(customDx)} className="bg-emerald-600 text-white p-2 rounded-lg"><Plus/></button></div>
            </div>
            <div><Label>Plan de Manejo</Label><TextArea rows={6} value={form.plan} onChange={e => updateForm('plan', e.target.value)} /></div>
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800"><SectionTitle><Wand2 size={20}/> Autocompletar Automático</SectionTitle>
              <TextArea rows={4} value={importText} onChange={e => setImportText(e.target.value)} placeholder="Pega texto médico aquí..." className="mb-3" />
              <button onClick={handleSmartFill} disabled={isImporting} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">{isImporting ? <Loader2 className="animate-spin"/> : <Wand2/>} Rellenar campos</button>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="app-bg min-h-screen text-slate-800 dark:text-slate-200 pb-20 font-sans">
      <AuroraStyles />
      <div className="bg-emerald-600 dark:bg-emerald-950 sticky top-0 z-40 px-4 py-6 flex justify-between items-center shadow-lg border-b border-transparent dark:border-emerald-900">
         <div className="flex items-center gap-3"><div className="bg-white/20 text-white p-2 rounded-lg"><Stethoscope size={24}/></div><div><h1 className="font-bold text-xl text-white">Nota de Ingreso Hospitalario</h1><p className="text-[10px] text-emerald-100 opacity-80">By Dr. Gabriel Mendez</p></div></div>
         <div className="flex gap-2"><button onClick={() => handleSystemAnalysis()} disabled={isProcessing} className="p-2 text-white hover:bg-white/10 rounded-full">{isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles size={20}/>}</button><button onClick={() => setDark(!dark)} className="p-2 text-white">{dark ? <Sun size={20}/> : <Moon size={20}/>}</button><button onClick={() => setShowHistory(true)} className="p-2 text-white"><Archive size={20}/></button></div>
      </div>
      <div className="bg-blue-500 dark:bg-slate-950 px-4 pt-6 pb-12 shadow-sm relative z-20"><div className="flex justify-between max-w-lg mx-auto">{STEPS_CONFIG.map(s => <div key={s.id} onClick={() => setStep(s.id)} className="flex flex-col items-center gap-1 cursor-pointer"><div className={`w-12 h-12 rounded-full flex items-center justify-center border-[3px] transition-all ${step===s.id ? 'bg-white text-emerald-600 border-white scale-110 shadow-lg' : 'border-white/40 text-white'}`}><s.icon size={22}/></div><span className={`text-[10px] font-bold ${step===s.id ? 'text-white' : 'text-blue-100/60'}`}>{s.label}</span></div>)}</div></div>
      <main className="px-4 -mt-6 relative z-30"><div className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl max-w-3xl mx-auto min-h-[60vh] flex flex-col justify-between">
          {renderStep()}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 items-center">
             <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="flex items-center gap-2 text-slate-400 disabled:opacity-30 hover:text-emerald-600 font-medium transition-colors"><ChevronLeft size={20}/> Atrás</button>
             {step < 5 ? (<button onClick={() => setStep(step + 1)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transform hover:scale-105 transition-all">Siguiente <ChevronRight size={18}/></button>) : (
               <div className="flex gap-3 w-full sm:w-auto"><button onClick={downloadWord} className="flex-1 px-6 py-3 border-2 border-emerald-600 text-emerald-600 rounded-xl font-bold flex items-center justify-center gap-2"><Download size={18}/> Word</button><button onClick={handleWhatsApp} className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"><Share2 size={18}/> WhatsApp</button></div>
             )}
          </div>
      </div></main>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce flex items-center gap-2 text-sm"><CheckCircle size={16} className="text-emerald-400"/> {toast}</div>}
      {processingResult && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-6 max-h-[80vh] overflow-y-auto"><h3 className="font-bold text-indigo-600 mb-4 flex items-center gap-2"><Sparkles/> Análisis Automatizado</h3><div className="space-y-4 text-sm"><div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg"><b>Redacción sugerida:</b><p className="italic mt-1">"{processingResult.improvedMotivo}"</p></div><div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg"><b>Plan sugerido:</b><p className="mt-1">{processingResult.improvedPlan}</p></div></div><div className="flex justify-end gap-3 mt-6"><button onClick={() => setProcessingResult(null)} className="px-4 py-2 text-slate-500">Descartar</button><button onClick={applySystemSuggestions} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">Aplicar cambios</button></div></div></div>}
      {showHistory && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-4 max-h-[70vh] flex flex-col"><div className="flex justify-between items-center mb-4 border-b pb-2"><h3 className="font-bold">Historial</h3><button onClick={() => setShowHistory(false)}><X/></button></div><div className="flex-1 overflow-y-auto space-y-2">{notes.length===0 ? <p className="text-center text-slate-400 py-8">Vacio</p> : notes.map(n => <div key={n.id} className="p-3 border rounded-lg flex justify-between items-center"><div className="text-sm font-bold">{n.form.nombre || 'Sin nombre'}</div><div className="flex gap-2"><button onClick={() => { setForm(n.form); setShowHistory(false); showToast('Cargado'); }} className="p-1 text-blue-500"><FileUp size={16}/></button><button onClick={() => setNotes(StorageService.deleteNote(n.id))} className="p-1 text-red-500"><Trash2 size={16}/></button></div></div>)}</div></div></div>}
    </div>
  );
}