import { PatientForm, NoteEntry } from "../types";

export const StorageService = {
  saveDraft: (data: PatientForm) => localStorage.setItem('ultra_draft', JSON.stringify(data)),
  
  loadDraft: (): PatientForm | null => {
    const d = localStorage.getItem('ultra_draft');
    return d ? JSON.parse(d) : null;
  },
  
  clearDraft: () => localStorage.removeItem('ultra_draft'),
  
  saveNote: (note: NoteEntry): NoteEntry[] => {
    const notes: NoteEntry[] = JSON.parse(localStorage.getItem('ultra_notes') || '[]');
    notes.unshift(note);
    if (notes.length > 30) notes.pop(); // Guarda las ultimas 30 notas
    localStorage.setItem('ultra_notes', JSON.stringify(notes));
    return notes;
  },
  
  getNotes: (): NoteEntry[] => JSON.parse(localStorage.getItem('ultra_notes') || '[]'),
  
  deleteNote: (id: number): NoteEntry[] => {
    const notes: NoteEntry[] = JSON.parse(localStorage.getItem('ultra_notes') || '[]');
    const newNotes = notes.filter(n => n.id !== id);
    localStorage.setItem('ultra_notes', JSON.stringify(newNotes));
    return newNotes;
  },
  
  clearAllNotes: (): NoteEntry[] => {
    localStorage.removeItem('ultra_notes');
    return [];
  },
  
  saveSignatureLocal: (data: string) => localStorage.setItem('ultra_signature', data),
  
  loadSignatureLocal: (): string | null => localStorage.getItem('ultra_signature')
};