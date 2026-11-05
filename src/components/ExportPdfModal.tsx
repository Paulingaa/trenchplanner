import React, { useState } from 'react';
import { X, FileDown, CheckCircle2, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { RgkProjectState, SimulationResults } from '../types';
import { SOIL_SPECS } from '../core/soils';
import { PIPE_SPECS } from '../core/pipes';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: RgkProjectState;
  simulation: SimulationResults;
  canvasElement: HTMLCanvasElement | null;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  state,
  simulation,
  canvasElement,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const { parameters, segments } = state;
  const soilSpec = SOIL_SPECS[parameters.defaultSoil];
  const pipeSpec = PIPE_SPECS[parameters.pipeType];

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Top Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('TrenchPlanner Pro - Ringgrabenkollektor Auslegungsbericht', 15, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`VDI 4640 Blatt 2 Konform | Erstellt am: ${parameters.date || new Date().toLocaleDateString('de-DE')}`, 15, 18);

      // Project Info Box (Left Column)
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 30, 85, 60, 3, 3, 'FD');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('1. Projekt & Gebäudedaten', 20, 38);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      const infoLines = [
        `Projekt: ${parameters.projectName || 'Unbenannt'}`,
        `Standort: ${parameters.postalCode} ${parameters.city}`,
        `Norm-Außentemperatur: ${parameters.designOutdoorTempC.toFixed(1)} °C`,
        `Gebäude-Heizlast Qh: ${parameters.buildingHeatingLoadKw.toFixed(2)} kW`,
        `Warmwasserzuschlag: ${simulation.dhwLoadKw.toFixed(2)} kW (${parameters.numberOfResidents} Pers.)`,
        `Gesamte Heizlast: ${simulation.totalHeatingLoadKw.toFixed(2)} kW`,
        `Benötigte Kälteleistung Q0: ${simulation.requiredCoolingCapacityKw.toFixed(2)} kW`,
        `Bodenart: ${soilSpec.nameDe}`,
      ];

      infoLines.forEach((line, i) => {
        doc.text(line, 20, 46 + i * 5);
      });

      // Technical & Hydraulic Box (Middle Column)
      doc.roundedRect(105, 30, 85, 60, 3, 3, 'FD');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('2. Hydraulik & Kollektordaten', 110, 38);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      const techLines = [
        `Rohrtyp: ${pipeSpec.name}`,
        `Kreise: ${parameters.numberOfCircuits} × ${parameters.pipeLengthPerCircuitM} m (${simulation.totalPipeAvailableM} m gesamt)`,
        `Thermische Deckung: ${simulation.coverageRatioPercent.toFixed(1)} % (${simulation.totalTrenchExtractionKw.toFixed(2)} kW Entzug)`,
        `Volumenstrom Sole: ${simulation.totalBrineFlowRateM3h.toFixed(2)} m³/h (${simulation.circuitBrineFlowRateLmin.toFixed(1)} L/min/Kreis)`,
        `Reynolds-Zahl: Re = ${simulation.reynoldsNumber.toFixed(0)} (${simulation.flowRegime.toUpperCase()})`,
        `Druckverlust: ${simulation.totalPressureDropKPa.toFixed(1)} kPa (${simulation.totalPressureDropMbar.toFixed(0)} mbar)`,
        `Pumpenförderhöhe: ${simulation.pumpHeadMwc.toFixed(2)} mWS`,
        `Status: ${simulation.isSufficient ? 'AUSREICHEND DIMENSIONIERT' : 'UNTERDIMENSIONIERT'}`,
      ];

      techLines.forEach((line, i) => {
        doc.text(line, 110, 46 + i * 5);
      });

      // Verification Badge (Right Column)
      const badgeColor = simulation.isSufficient ? [16, 185, 129] : [244, 63, 94];
      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.roundedRect(195, 30, 85, 60, 3, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Auslegungs-Zertifikat', 205, 42);

      doc.setFontSize(24);
      doc.text(`${simulation.coverageRatioPercent.toFixed(0)} %`, 205, 58);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        simulation.isSufficient
          ? 'Kollektor erfüllt alle Kriterien der VDI 4640'
          : 'Achtung: Kollektorleistung unzureichend!',
        205,
        70
      );
      doc.text(`Druckverlust: ${simulation.totalPressureDropKPa.toFixed(1)} kPa (Zulässig < 38 kPa)`, 205, 78);

      // Embedded CAD Site Plan Image
      if (canvasElement) {
        try {
          const imgData = canvasElement.toDataURL('image/png', 1.0);
          doc.addImage(imgData, 'PNG', 15, 96, 175, 95);
        } catch (e) {
          console.error('Failed to embed canvas snapshot:', e);
        }
      }

      // Segment Table Summary
      doc.roundedRect(195, 96, 85, 95, 3, 3, 'FD');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('3. Grabenabschnitte', 200, 104);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      let tableY = 112;
      segments.slice(0, 8).forEach((seg, i) => {
        const segRes = simulation.segmentResults.find(r => r.segmentId === seg.id);
        const yieldKw = segRes ? segRes.extractionKw.toFixed(2) : '-';
        doc.text(
          `${seg.name}: ${seg.lengthM.toFixed(1)}m | B: ${seg.widthM.toFixed(1)}m | T: ${seg.depthM.toFixed(1)}m | ${yieldKw} kW`,
          200,
          tableY + i * 8
        );
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Erstellt mit TrenchPlanner Pro - Der moderne browserbasierte Ringgrabenkollektor CAD-Planer',
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );

      // Save PDF
      const safeName = (parameters.projectName || 'rgk-planung')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_');
      doc.save(`${safeName}-auslegungsbericht.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Projektbericht als PDF exportieren</h2>
              <p className="text-xs text-slate-400">Vollständiges Auslegungsdokument nach VDI 4640</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <p>Der generierte Bericht enthält auf DIN A4 Querformat:</p>
          <ul className="space-y-1.5 pl-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Projekt- & Klimastandortdaten mit Norm-Außentemperatur</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Hochauflösender CAD-Lageplan mit farbcodiertem Temperaturverlauf</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Hydraulische Nachweise (Reynolds-Zahl, Druckverlust, Förderhöhe)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Detaillierte Grabenabschnittstabelle mit Slinky-Vorschub & Entzug</span>
            </li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            Abbrechen
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            <span>PDF jetzt erstellen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
