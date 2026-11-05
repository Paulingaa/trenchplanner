import LZString from 'lz-string';
import { RgkProjectState } from '../types';

const STORAGE_KEY = 'rgk_current_project';
const AUTOSAVE_KEY = 'rgk_autosave_history';

export function serializeStateToUrl(state: RgkProjectState): string {
  try {
    const json = JSON.stringify(state);
    const compressed = LZString.compressToEncodedURIComponent(json);
    return `${window.location.origin}${window.location.pathname}#project=${compressed}`;
  } catch (err) {
    console.error('Failed to serialize state to URL:', err);
    return window.location.href;
  }
}

export function deserializeStateFromUrl(): RgkProjectState | null {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('#project=')) return null;
    const compressed = hash.replace('#project=', '');
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    return JSON.parse(json) as RgkProjectState;
  } catch (err) {
    console.error('Failed to deserialize state from URL:', err);
    return null;
  }
}

export function saveStateToLocalStorage(state: RgkProjectState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Also save in history
    const historyItem = {
      timestamp: new Date().toISOString(),
      name: state.parameters.projectName || 'Unbenanntes Projekt',
      data: state,
    };
    const existing = localStorage.getItem(AUTOSAVE_KEY);
    const list = existing ? JSON.parse(existing) : [];
    // Keep last 10 snapshots
    const updated = [historyItem, ...list.slice(0, 9)];
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('LocalStorage save error:', err);
  }
}

export function loadStateFromLocalStorage(): RgkProjectState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RgkProjectState;
  } catch (err) {
    console.error('LocalStorage load error:', err);
    return null;
  }
}

export function exportStateToJsonFile(state: RgkProjectState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (state.parameters.projectName || 'rgk-plan')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  a.download = `${safeName}.rgk.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importStateFromJsonFile(file: File): Promise<RgkProjectState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const state = JSON.parse(text) as RgkProjectState;
        if (!state.parameters || !state.segments) {
          throw new Error('Ungültiges RGK-Projektdateiformat');
        }
        resolve(state);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
    reader.readAsText(file);
  });
}
