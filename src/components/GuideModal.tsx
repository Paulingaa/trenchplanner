import React from 'react';
import { X, BookOpen, CheckCircle2, AlertTriangle, ShieldCheck, Wrench, Droplets } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">VDI 4640 Verlegeleitfaden & Praxis-Ratgeber</h2>
              <p className="text-xs text-slate-400">
                Planung, Aushub, Rohrverlegung und Inbetriebnahme eines Ringgrabenkollektors (RGK)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Phase 1: Planning & Boundary */}
          <div className="bg-slate-800/40 border border-slate-700/80 p-5 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-mono font-bold">1</span>
              <span>Genehmigung & Vorbereitung (VDI 4640 Blatt 2)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ringgrabenkollektoren nutzen oberflächennahe Erdwärme (Tiefe 1.5–2.0 m). Im Gegensatz zu Tiefensonden (bis 100m) ist in den meisten Bundesländern und Kantonen lediglich eine <strong>einfache Bauanzeige / wasserrechtliche Anzeige</strong> bei der Unteren Wasserbehörde erforderlich, da das Grundwasser in der Regel nicht berührt wird.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                <span className="font-semibold text-white block mb-1">Grenzabstände:</span>
                Mindestens 1.0 m (empfohlen 1.5–2.0 m) Abstand zu Nachbargrundstücken einhalten, um gegenseitigen Wärmeentzug zu vermeiden.
              </div>
              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                <span className="font-semibold text-white block mb-1">Gebäude-Schutz:</span>
                Hausanschlussraum-Anbindung: Keller- und Fundamentwände sind frostgefährdet. Rohrleitungen innerhalb 1.5 m zum Haus stets mit diffusionsoffener Wärmedämmung dämmen!
              </div>
            </div>
          </div>

          {/* Phase 2: Excavation */}
          <div className="bg-slate-800/40 border border-slate-700/80 p-5 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">2</span>
              <span>Erdaushub & Grabenprofil (DIN 4124)</span>
            </div>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Baggergröße:</strong> Ein 3.5t bis 5.5t Minibagger mit 1.2–1.8m Böschungslöffel oder Grablöffel ist ideal.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Grabentiefe:</strong> Standardtiefe ist 1.50 bis 1.70 m. Auf dieser Tiefe regeneriert das Erdreich im Sommer optimal durch Sonneneinstrahlung und warme Regenfälle.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Grabensohle:</strong> Boden von groben, spitzen Steinen befreien. Eine 5–10 cm feine Sandschicht (Rundkorn 0/2 oder 0/4) schützt das PE 100-RC Rohr vor Beschädigung.
                </span>
              </li>
            </ul>
          </div>

          {/* Phase 3: Pipe Installation */}
          <div className="bg-slate-800/40 border border-slate-700/80 p-5 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">3</span>
              <span>Rohrverlegung (Slinky-Schlaufen ausrollen)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              PE 100-RC Erdwärmerohre (Resistance to Crack) sind extrem widerstandsfähig gegen Punktlasten und langsames Risswachstum.
            </p>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 space-y-1">
              <span className="font-semibold block">Tipp für die Praxis:</span>
              <p>
                Das PE-Rohr wird liegend am Grabenrand abgerollt. Zu zweit oder zu dritt werden die vorgeformten Schlaufen (ca. 1.2–1.5 m Durchmesser) im berechneten Vorschubabstand (z.B. alle 30–45 cm) in den Graben gelegt und mit Kabelbindern an den Überlappungspunkten fixiert.
              </p>
            </div>
          </div>

          {/* Phase 4: Pressure Test & Filling */}
          <div className="bg-slate-800/40 border border-slate-700/80 p-5 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-mono font-bold">4</span>
              <span>Druckprüfung & Inbetriebnahme</span>
            </div>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <Wrench className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Druckprüfung nach DIN EN 805:</strong> VOR dem Verfüllen des Grabens wird das Rohr mit Wasser befüllt und mindestens 2 Stunden mit 4–6 bar Prüfdruck abgedrückt. Ein Druckverlust darf nicht auftreten!
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Droplets className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Solebefüllung & Entlüftung:</strong> Spülpumpe verwenden, um jeden Kreis einzeln solange zu spülen, bis absolut keine Luftblasen mehr sichtbar sind. Monopropylenglykol (20–25%) einmischen.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Trassenwarnband:</strong> Beim Verfüllen bei ca. -0.50 m Tiefe (50 cm unter der Grasnarbe) das gelbe Warnband einlegen, um bei späteren Gartenarbeiten versehentliche Beschädigungen zu verhindern.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
