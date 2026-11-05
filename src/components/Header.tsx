import React, { useState } from 'react';
import {
  Compass,
  Share2,
  FileDown,
  Layers,
  Gauge,
  ShoppingCart,
  BookOpen,
  FolderOpen,
  Save,
  Check,
  Moon,
  Sun,
  Globe,
  Upload,
  Download,
} from 'lucide-react';
import { PRESET_TEMPLATES } from '../core/presets';
import { serializeStateToUrl, exportStateToJsonFile } from '../core/serializer';
import { RgkProjectState, Language, Theme } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

interface HeaderProps {
  state: RgkProjectState;
  onUpdateState: (newState: RgkProjectState) => void;
  onOpenCrossSection: () => void;
  onOpenHydraulics: () => void;
  onOpenBom: () => void;
  onOpenGuide: () => void;
  onOpenExportPdf: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  lang: Language;
  onToggleLang: () => void;
  onImportJsonFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onUpdateState,
  onOpenCrossSection,
  onOpenHydraulics,
  onOpenBom,
  onOpenGuide,
  onOpenExportPdf,
  theme,
  onToggleTheme,
  lang,
  onToggleLang,
  onImportJsonFile,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const t = TRANSLATIONS[lang];

  const handleCopyShareLink = () => {
    const url = serializeStateToUrl(state);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_TEMPLATES.find((p) => p.id === presetId);
    if (preset) {
      onUpdateState(preset.state);
      setShowPresetsMenu(false);
    }
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sky-400 font-bold tracking-tight text-base">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <Compass className="w-5 h-5 text-sky-400" />
          </div>
          <span className="hidden sm:inline bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent font-extrabold">
            TrenchPlanner <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">PRO</span>
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Editable Project Name */}
        <input
          type="text"
          value={state.parameters.projectName}
          onChange={(e) =>
            onUpdateState({
              ...state,
              parameters: { ...state.parameters, projectName: e.target.value },
            })
          }
          className="bg-transparent hover:bg-slate-800/60 focus:bg-slate-800 text-sm font-medium text-slate-200 px-2 py-1 rounded border border-transparent focus:border-sky-500 outline-none w-48 sm:w-64 transition truncate"
          title="Projektname bearbeiten"
        />
      </div>

      {/* Main Action Bar */}
      <div className="flex items-center gap-1.5">
        {/* Presets dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresetsMenu(!showPresetsMenu)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">{t.loadPreset}</span>
          </button>

          {showPresetsMenu && (
            <div className="absolute left-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-2 py-1 font-semibold">
                Projektvorlagen
              </div>
              {PRESET_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectPreset(tmpl.id)}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-700/70 transition flex flex-col gap-0.5"
                >
                  <span className="text-xs font-medium text-white">{lang === 'de' ? tmpl.nameDe : tmpl.nameEn}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">{lang === 'de' ? tmpl.descriptionDe : tmpl.descriptionEn}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Triggers */}
        <button
          onClick={onOpenCrossSection}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 border border-slate-700/80 transition"
          title="Grabenquerschnitt & Erd-Isothermen"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">{t.crossSection}</span>
        </button>

        <button
          onClick={onOpenHydraulics}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 border border-slate-700/80 transition"
          title="Hydraulik & Strömungsanalyse"
        >
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">{t.hydraulicAnalysis}</span>
        </button>

        <button
          onClick={onOpenBom}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 border border-slate-700/80 transition"
          title="Stückliste, Aushubvolumen & Kostenschätzung"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">{t.billOfMaterials}</span>
        </button>

        <button
          onClick={onOpenGuide}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 border border-slate-700/80 transition"
          title="VDI 4640 Verlegeleitfaden"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden xl:inline">{t.vdiGuide}</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Share Link */}
        <button
          onClick={handleCopyShareLink}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 rounded-lg flex items-center gap-1.5 transition"
          title="Projekt über URL-Hash teilen"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-sky-400" />}
          <span>{copied ? 'Kopiert!' : t.shareUrl}</span>
        </button>

        {/* PDF Export */}
        <button
          onClick={onOpenExportPdf}
          className="px-2.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          title="Vollständigen Bericht als PDF exportieren"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.exportPdf}</span>
        </button>

        {/* JSON Import / Export */}
        <label className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer border border-slate-700 transition" title="JSON Projektdatei laden">
          <Upload className="w-3.5 h-3.5" />
          <input type="file" accept=".json" onChange={onImportJsonFile} className="hidden" />
        </label>

        <button
          onClick={() => exportStateToJsonFile(state)}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
          title="Projekt als JSON herunterladen"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* Lang & Theme toggles */}
        <button
          onClick={onToggleLang}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition font-mono text-[11px] font-bold"
          title="Sprache wechseln / Switch Language"
        >
          {lang.toUpperCase()}
        </button>

        <button
          onClick={onToggleTheme}
          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
          title="Theme wechseln"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-400" />}
        </button>
      </div>
    </header>
  );
};
