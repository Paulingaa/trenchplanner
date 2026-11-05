import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import { CadCanvas } from './components/CadCanvas';
import { CrossSectionModal } from './components/CrossSectionModal';
import { HydraulicModal } from './components/HydraulicModal';
import { BomModal } from './components/BomModal';
import { GuideModal } from './components/GuideModal';
import { ExportPdfModal } from './components/ExportPdfModal';
import { PRESET_TEMPLATES } from './core/presets';
import { runRgkSimulation } from './core/simulation';
import {
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
  deserializeStateFromUrl,
  importStateFromJsonFile,
} from './core/serializer';
import {
  RgkProjectState,
  TrenchSegment,
  ProjectParameters,
  Language,
  Theme,
} from './types';

export function App() {
  // Theme & Language
  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLang] = useState<Language>('de');

  // RGK Project State
  const [state, setState] = useState<RgkProjectState>(() => {
    // 1. Try URL serialized state
    const urlState = deserializeStateFromUrl();
    if (urlState) return urlState;

    // 2. Try LocalStorage
    const localState = loadStateFromLocalStorage();
    if (localState) return localState;

    // 3. Fallback to default preset
    return PRESET_TEMPLATES[0].state;
  });

  // Selected Segment
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    state.segments[0]?.id || null
  );

  // Modals visibility
  const [isCrossSectionOpen, setIsCrossSectionOpen] = useState(false);
  const [isHydraulicsOpen, setIsHydraulicsOpen] = useState(false);
  const [isBomOpen, setIsBomOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);

  // Canvas element ref for PDF snapshot
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);

  // Run thermodynamic & hydraulic simulation on every state change
  const simulation = useMemo(() => {
    return runRgkSimulation(state);
  }, [state]);

  // Confetti trigger when achieving 100%+ coverage
  const hasTriggeredConfettiRef = useRef(false);
  useEffect(() => {
    if (simulation.coverageRatioPercent >= 100 && !hasTriggeredConfettiRef.current) {
      hasTriggeredConfettiRef.current = true;
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.15 },
        colors: ['#38bdf8', '#10b981', '#f59e0b'],
      });
    } else if (simulation.coverageRatioPercent < 98) {
      hasTriggeredConfettiRef.current = false;
    }
  }, [simulation.coverageRatioPercent]);

  // Auto-save to LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      saveStateToLocalStorage(state);
    }, 1000);
    return () => clearTimeout(timer);
  }, [state]);

  // Find canvas element for PDF export
  useEffect(() => {
    const el = document.querySelector('canvas') as HTMLCanvasElement;
    if (el) setCanvasElement(el);
  }, []);

  // Handlers
  const handleUpdateParameters = (newParams: ProjectParameters) => {
    setState((prev) => ({ ...prev, parameters: newParams }));
  };

  const handleUpdateSegment = (updated: TrenchSegment) => {
    setState((prev) => ({
      ...prev,
      segments: prev.segments.map((s) => (s.id === updated.id ? updated : s)),
    }));
  };

  const handleAddSegment = () => {
    const lastSeg = state.segments[state.segments.length - 1];
    const startPt = lastSeg ? lastSeg.endPoint : { x: 10, y: 10 };
    const endPt = { x: startPt.x + 10, y: startPt.y };
    const letter = String.fromCharCode(65 + state.segments.length);

    const newSeg: TrenchSegment = {
      id: `seg_${Date.now()}`,
      name: `${letter} (Slinky)`,
      startPoint: startPt,
      endPoint: endPt,
      lengthM: 10.0,
      widthM: 1.4,
      depthM: 1.6,
      type: 'slinky',
      allocatedPipeLengthM: 40,
      loopDiameterM: 1.3,
      numberOfCircuits: state.parameters.numberOfCircuits,
    };

    setState((prev) => ({
      ...prev,
      segments: [...prev.segments, newSeg],
    }));
    setSelectedSegmentId(newSeg.id);
  };

  const handleDeleteSegment = (id: string) => {
    setState((prev) => ({
      ...prev,
      segments: prev.segments.filter((s) => s.id !== id),
    }));
    if (selectedSegmentId === id) {
      setSelectedSegmentId(state.segments[0]?.id || null);
    }
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importStateFromJsonFile(file);
      setState(imported);
      if (imported.segments.length > 0) {
        setSelectedSegmentId(imported.segments[0].id);
      }
    } catch (err) {
      alert('Fehler beim Laden der Datei: ' + (err as Error).message);
    }
  };

  const activeSegment = state.segments.find((s) => s.id === selectedSegmentId) || state.segments[0] || null;

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Header */}
      <Header
        state={state}
        onUpdateState={setState}
        onOpenCrossSection={() => setIsCrossSectionOpen(true)}
        onOpenHydraulics={() => setIsHydraulicsOpen(true)}
        onOpenBom={() => setIsBomOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenExportPdf={() => setIsExportPdfOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'de' ? 'en' : 'de'))}
        onImportJsonFile={handleImportJsonFile}
      />

      {/* Main Workspace: Left Sidebar + CAD Canvas + Right Sidebar */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left Sidebar: Parameters & Specs */}
        <SidebarLeft
          parameters={state.parameters}
          onChangeParameters={handleUpdateParameters}
          lang={lang}
        />

        {/* Center: CAD Canvas Viewport */}
        <CadCanvas
          state={state}
          onUpdateState={setState}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={setSelectedSegmentId}
          theme={theme}
        />

        {/* Right Sidebar: Live Simulation & Segment Inspector */}
        <SidebarRight
          segments={state.segments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={setSelectedSegmentId}
          onUpdateSegment={handleUpdateSegment}
          onAddSegment={handleAddSegment}
          onDeleteSegment={handleDeleteSegment}
          simulation={simulation}
          lang={lang}
        />
      </div>

      {/* Modals */}
      <CrossSectionModal
        isOpen={isCrossSectionOpen}
        onClose={() => setIsCrossSectionOpen(false)}
        segment={activeSegment}
        defaultSoil={state.parameters.defaultSoil}
      />

      <HydraulicModal
        isOpen={isHydraulicsOpen}
        onClose={() => setIsHydraulicsOpen(false)}
        state={state}
        simulation={simulation}
      />

      <BomModal
        isOpen={isBomOpen}
        onClose={() => setIsBomOpen(false)}
        state={state}
        simulation={simulation}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ExportPdfModal
        isOpen={isExportPdfOpen}
        onClose={() => setIsExportPdfOpen(false)}
        state={state}
        simulation={simulation}
        canvasElement={canvasElement}
      />
    </div>
  );
}

export default App;
