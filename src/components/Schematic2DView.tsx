import React, { useState, useId } from 'react';
import { PorciProject } from '../types/project';
import { GrowthFinishUserConfig } from '../types/growthFinish';
import { BreedingUserConfig } from '../types/breeding';
import { calculateGrowthFinishLayout } from '../services/growthFinishLayout';
import { calculateBreedingLayout } from '../services/breedingLayout';
import { LayoutAdjustmentProposal, proposeValidLayoutAdjustment } from '../services/autoPlanning';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Grid, 
  Compass, 
  Info, 
  Printer, 
  Download,
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Wand2,
  Undo2,
  X
} from 'lucide-react';

interface Schematic2DViewProps {
  project: PorciProject;
  onApplyPlanningAdjustment?: (updates: {
    growthFinishConfig?: GrowthFinishUserConfig;
    breedingConfig?: BreedingUserConfig;
    animalCount?: number;
  }) => void;
  onNavigateToNext: () => void;
}

interface PlanningSnapshot {
  projectId: string;
  growthFinishConfig?: GrowthFinishUserConfig;
  breedingConfig?: BreedingUserConfig;
  animalCount: number;
  appliedChanges: string[];
}

interface SelectedZoneInfo {
  title: string;
  category: string;
  dimensionsText: string;
  description: string;
  recommendations: string[];
}

export const Schematic2DView: React.FC<Schematic2DViewProps> = ({
  project,
  onApplyPlanningAdjustment,
  onNavigateToNext
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showBiosecurityRing, setShowBiosecurityRing] = useState<boolean>(true);
  const [selectedZone, setSelectedZone] = useState<SelectedZoneInfo | null>(null);
  const [proposal, setProposal] = useState<LayoutAdjustmentProposal | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<PlanningSnapshot | null>(null);
  const [imageFeedback, setImageFeedback] = useState<string | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    setProposal(null);
    setSelectedZone(null);
    setPreviousSnapshot(prev =>
      prev && prev.projectId === project.characterization.id ? prev : null
    );
  }, [project.characterization.id]);

  const patternId = useId();

  const terrain = project.characterization.terrain;
  const orientation = project.characterization.orientation;
  const animalCount = project.characterization.animalCount;
  const isCeba = orientation === 'ceba';
  const isCria = orientation === 'cria';

  // Calculate layout using the dedicated engine by orientation
  const growthLayout = calculateGrowthFinishLayout(animalCount, terrain, project.growthFinishConfig);
  const breedingLayout = calculateBreedingLayout(terrain, project.breedingConfig);

  const hasValidLotDimensions = terrain.length > 0 && terrain.width > 0;
  // Real world dimensions (fallback to reference preview frame only for rendering if invalid)
  const lotLength = hasValidLotDimensions ? terrain.length : 40;
  const lotWidth = hasValidLotDimensions ? terrain.width : 25;

  const activeValidation = isCria ? breedingLayout.validation : growthLayout.validation;

  // ViewBox & Canvas scale calculations
  const canvasWidth = 840;
  const canvasHeight = 540;
  const margin = 50;

  const drawableWidth = canvasWidth - margin * 2;
  const drawableHeight = canvasHeight - margin * 2;

  // Scale (pixels per meter)
  const scaleX = drawableWidth / lotLength;
  const scaleY = drawableHeight / lotWidth;
  const scale = Math.min(scaleX, scaleY);

  const lotPixelWidth = lotLength * scale;
  const lotPixelHeight = lotWidth * scale;

  const lotStartX = (canvasWidth - lotPixelWidth) / 2;
  const lotStartY = (canvasHeight - lotPixelHeight) / 2;

  // Facilities metric coordinates
  const activeRectangles = isCria ? breedingLayout.rectangles : growthLayout.rectangles;
  const pediluvioRect = activeRectangles.find(r => r.id === 'pediluvio')!;
  const bodegaRect = activeRectangles.find(r => r.id === 'bodega')!;
  const tanqueRect = activeRectangles.find(r => r.id === 'tanque')!;
  const estercoleroRect = activeRectangles.find(r => r.id === 'estercolero')!;
  const galponRect = growthLayout.rectangles.find(r => r.id === 'galpon_ceba')!;

  const gateX = lotStartX + pediluvioRect.x * scale;
  const gateY = lotStartY + pediluvioRect.y * scale;
  const gateW = pediluvioRect.width * scale;
  const gateH = pediluvioRect.height * scale;

  const warehouseX = lotStartX + bodegaRect.x * scale;
  const warehouseY = lotStartY + bodegaRect.y * scale;
  const warehouseW = bodegaRect.width * scale;
  const warehouseH = bodegaRect.height * scale;

  const tankX = lotStartX + (tanqueRect.x + tanqueRect.width / 2) * scale;
  const tankY = lotStartY + (tanqueRect.y + tanqueRect.height / 2) * scale;
  const tankRadius = (tanqueRect.width / 2) * scale;

  const wasteX = lotStartX + estercoleroRect.x * scale;
  const wasteY = lotStartY + estercoleroRect.y * scale;
  const wasteW = estercoleroRect.width * scale;
  const wasteH = estercoleroRect.height * scale;

  const pavilionX = lotStartX + galponRect.x * scale;
  const pavilionY = lotStartY + galponRect.y * scale;
  const pavilionPixelW = galponRect.width * scale;
  const pavilionPixelH = galponRect.height * scale;

  const handleZoneClick = (info: SelectedZoneInfo) => {
    setSelectedZone(info);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(2.0, Math.max(0.7, prev + delta)));
  };

  const resetView = () => {
    setZoomLevel(1);
    setSelectedZone(null);
  };

  const handleRequestAutoAdjust = () => {
    const generated = proposeValidLayoutAdjustment(project);
    setProposal(generated);
  };

  const handleAcceptProposal = () => {
    if (!proposal || !proposal.canBeSolved || !onApplyPlanningAdjustment) return;
    setPreviousSnapshot({
      projectId: project.characterization.id,
      growthFinishConfig: project.growthFinishConfig ? { ...project.growthFinishConfig } : undefined,
      breedingConfig: project.breedingConfig ? { ...project.breedingConfig } : undefined,
      animalCount: project.characterization.animalCount,
      appliedChanges: proposal.correctionsSummary
    });
    onApplyPlanningAdjustment({
      growthFinishConfig: proposal.proposedGrowthConfig,
      breedingConfig: proposal.proposedBreedingConfig,
      animalCount: proposal.proposedAnimalCount
    });
    setProposal(null);
  };

  const handleRevertAdjustment = () => {
    if (!previousSnapshot || !onApplyPlanningAdjustment) return;
    onApplyPlanningAdjustment({
      growthFinishConfig: previousSnapshot.growthFinishConfig,
      breedingConfig: previousSnapshot.breedingConfig,
      animalCount: previousSnapshot.animalCount
    });
    setPreviousSnapshot(null);
    setProposal(null);
  };

  const handleDownloadImage = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute('style');
    clone.removeAttribute('class');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(canvasWidth));
    clone.setAttribute('height', String(canvasHeight));
    clone.setAttribute(
      'style',
      "font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
    );

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const exportScale = 2;
      const headerHeight = 96;
      const footerHeight = 56;
      const outW = canvasWidth * exportScale;
      const outH = canvasHeight * exportScale + headerHeight + footerHeight;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        return;
      }

      // White canvas background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);

      // Top title bar
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(0, 0, outW, headerHeight);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.fillText(`PorciPlan · Plano Esquemático 2D — ${project.characterization.name}`, 36, 42);
      ctx.fillStyle = '#e9d5ff';
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      const orientationLabel = isCria ? 'Cría' : isCeba ? 'Levante y Ceba' : 'Ciclo Completo';
      ctx.fillText(
        `Predio: ${lotLength}m × ${lotWidth}m (${terrain.totalArea || lotLength * lotWidth} m²) · Orientación: ${orientationLabel} · Norte (N) arriba / Eje E ↔ O`,
        36,
        74
      );

      // Draw SVG plan
      ctx.fillStyle = '#faf8fc';
      ctx.fillRect(0, headerHeight, outW, canvasHeight * exportScale);
      ctx.drawImage(img, 0, headerHeight, outW, canvasHeight * exportScale);

      // Footer bar
      const footerY = headerHeight + canvasHeight * exportScale;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, footerY, outW, footerHeight);
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, footerY);
      ctx.lineTo(outW, footerY);
      ctx.stroke();

      ctx.fillStyle = activeValidation.isViable ? '#065f46' : '#9f1239';
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        activeValidation.isViable
          ? 'Estado: Distribución espacial viable dentro del predio'
          : 'Estado: Distribución con alertas espaciales (revisar límites/superposiciones)',
        36,
        footerY + 34
      );
      ctx.fillStyle = '#6b21a8';
      ctx.font = '16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Escala aprox.: ${scale.toFixed(1)} px/m`, outW - 36, footerY + 34);

      URL.revokeObjectURL(svgUrl);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        const safeSlug =
          project.characterization.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '') || 'proyecto';
        link.href = pngUrl;
        link.download = `plano_2d_${safeSlug}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(pngUrl);
        setImageFeedback('Plano descargado en PNG');
        setTimeout(() => setImageFeedback(null), 2500);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  };

  const canShowAutoAdjust =
    !activeValidation.isViable &&
    hasValidLotDimensions &&
    (!isCria || breedingLayout.pendingInputs.length === 0) &&
    Boolean(onApplyPlanningAdjustment);

  const activeRevertSnapshot =
    previousSnapshot && previousSnapshot.projectId === project.characterization.id
      ? previousSnapshot
      : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-purple-700 tracking-wider uppercase">Paso 04</span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Diseño Esquemático 2D de la Granja</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {hasValidLotDimensions
              ? `Plano arquitectónico esquemático del predio (${lotLength}m × ${lotWidth}m, ${terrain.totalArea} m²).`
              : 'Vista previa referencial (40m × 25m): falta registrar largo y ancho del lote en Caracterización.'}
            {isCeba && (
              <span className="font-semibold text-purple-900 ml-1">
                Dimensiones calculadas según criterios técnicos de bienestar ({growthLayout.appliedDensity} {growthLayout.densityUnit} = {growthLayout.netFreeFloorArea} m² libres).
              </span>
            )}
            {isCria && (
              <span className="font-semibold text-purple-900 ml-1">
                Cría: Gestación ({breedingLayout.gestation.pavilionLength}m × {breedingLayout.gestation.pavilionWidth}m) · Maternidad ({breedingLayout.farrowing.roomsCount} sala{breedingLayout.farrowing.roomsCount > 1 ? 's' : ''}, {breedingLayout.farrowing.totalPlaces} parideras).
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {imageFeedback && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{imageFeedback}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleDownloadImage}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-purple-200 text-purple-900 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
            title="Descargar plano 2D como imagen PNG"
          >
            <Download className="w-4 h-4 text-purple-700" />
            <span>Descargar Imagen</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Imprimir plano de la granja"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <button
            onClick={onNavigateToNext}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <span>Ir a Presupuesto</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Spatial Viability Warning Banner */}
      {isCria && (!breedingLayout.validation.hasValidTerrain || breedingLayout.pendingInputs.length > 0) ? (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs space-y-2 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>VALIDACIÓN ESPACIAL PENDIENTE: FALTAN DATOS DEL PREDIO O POBLACIÓN</span>
          </div>
          <p className="leading-relaxed">{breedingLayout.validation.feasibilityNotice}</p>
          {breedingLayout.pendingInputs.length > 0 && (
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-[11px] space-y-1">
              {breedingLayout.pendingInputs.map((msg, i) => (
                <div key={i} className="text-amber-900">• {msg}</div>
              ))}
            </div>
          )}
        </div>
      ) : !activeValidation.isViable && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 text-xs space-y-2.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                <span>ALERTA: DISTRIBUCIÓN NO VIABLE EN EL TERRENO ACTUAL</span>
              </div>

              {canShowAutoAdjust && (
                <button
                  type="button"
                  onClick={handleRequestAutoAdjust}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Proponer ajuste para plano válido</span>
                </button>
              )}
            </div>

            <p className="leading-relaxed">
              {activeValidation.feasibilityNotice}
            </p>
            <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-[11px] space-y-1">
              <span className="font-bold block text-rose-900">Diagnóstico de colisiones / límites:</span>
              {activeValidation.boundaryViolations.map((v, i) => (
                <div key={i} className="text-rose-700">• {v}</div>
              ))}
              {activeValidation.overlaps.map((o, i) => (
                <div key={i} className="text-rose-700">• {o.description}</div>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-rose-900 pt-0.5">
              {isCria ? (
                <>
                  ⚖️ Criterio técnico irrenunciable: PorciPlan <strong>no comprime ni reduce las áreas calculadas de gestación, maternidad o verraco</strong> ({breedingLayout.totalProductiveGrossArea} m² brutos productivos) para forzar cabida en un lote insuficiente.
                </>
              ) : (
                <>
                  ⚖️ Criterio de bienestar animal irrenunciable: PorciPlan <strong>no reduce la superficie libre mínima requerida</strong> ({growthLayout.netFreeFloorArea} m² libres) para forzar artificialmente que la nave quepa. Puedes ampliar el terreno en Caracterización o usar el ajuste asistido.
                </>
              )}
            </p>
          </div>

          {/* Proposal Confirmation Card (Problems Detected + Proposed Corrections) */}
          {proposal && (
            <div className="p-5 rounded-2xl bg-white border-2 border-purple-300 shadow-md text-xs space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-purple-100 pb-2.5">
                <div className="flex items-center gap-2 font-bold text-sm text-purple-950">
                  <Wand2 className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Propuesta de Ajuste para Obtener un Plano 2D Válido</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProposal(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                  aria-label="Cerrar propuesta"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                  <span className="font-bold text-rose-900 uppercase tracking-wider text-[10px] block">
                    Problemas detectados en el plano actual
                  </span>
                  {proposal.problemsDetected.length > 0 ? (
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800">
                      {proposal.problemsDetected.map((prob, idx) => (
                        <li key={idx}>{prob}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-rose-800">Conflicto espacial con los linderos o zonas auxiliares.</p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] block">
                    Correcciones que se aplicarán
                  </span>
                  {proposal.canBeSolved ? (
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-900 font-medium">
                      {proposal.correctionsSummary.map((corr, idx) => (
                        <li key={idx}>{corr}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-amber-800">
                      {proposal.resultingNotice}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-600">{proposal.resultingNotice}</p>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setProposal(null)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  No aceptar (mantener actual)
                </button>
                {proposal.canBeSolved && (
                  <button
                    type="button"
                    onClick={handleAcceptProposal}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aceptar y aplicar correcciones</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revert bar shown right under diagnostics/adjustment once a correction has been applied */}
      {activeRevertSnapshot && (
        <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="font-bold text-purple-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Ajuste automático aplicado al plano 2D</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Si el resultado no te convence, puedes regresar exactamente a la configuración que tenías antes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRevertAdjustment}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-purple-300 bg-white hover:bg-purple-100 text-purple-900 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Volver a los valores anteriores</span>
          </button>
        </div>
      )}

      {/* Toolbar & Canvas Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Canvas Area */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-purple-100 shadow-xs p-4 flex flex-col justify-between space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-purple-50/60 rounded-xl border border-purple-100 text-xs">
            {/* View Layer Toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  showGrid ? 'bg-purple-700 text-white' : 'text-slate-600 hover:bg-purple-100/60'
                }`}
                title="Mostrar cuadrícula métrica"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Cuadrícula</span>
              </button>

              <button
                onClick={() => setShowDimensions(!showDimensions)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  showDimensions ? 'bg-purple-700 text-white' : 'text-slate-600 hover:bg-purple-100/60'
                }`}
                title="Mostrar cotas y medidas calculadas"
              >
                <span>Cotas (m)</span>
              </button>

              <button
                onClick={() => setShowBiosecurityRing(!showBiosecurityRing)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  showBiosecurityRing ? 'bg-purple-700 text-white' : 'text-slate-600 hover:bg-purple-100/60'
                }`}
                title="Mostrar cerca perimetral y buffer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Bioseguridad</span>
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-purple-200">
              <button
                onClick={() => handleZoom(-0.15)}
                className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                title="Alejar"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] text-purple-950 font-bold min-w-[45px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.15)}
                className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                title="Acercar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetView}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors border-l border-slate-200 ml-0.5"
                title="Reiniciar vista"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SVG Canvas Container */}
          <div className="relative w-full aspect-[16/10] bg-[#faf8fc] rounded-xl border border-purple-200/80 overflow-hidden flex items-center justify-center shadow-inner">
            
            {/* Cardinal orientation marker (Rosa de los vientos) */}
            <div className="absolute top-3 right-3 z-10 pointer-events-none bg-white/90 backdrop-blur-xs p-2 rounded-xl border border-purple-200/80 shadow-xs flex flex-col items-center">
              <div className="text-[10px] font-bold text-red-600 font-mono tracking-wider">NORTE (N)</div>
              <div className="w-6 h-6 my-0.5 relative flex items-center justify-center">
                <div className="w-0.5 h-6 bg-slate-300 absolute" />
                <div className="w-6 h-0.5 bg-slate-300 absolute" />
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[10px] border-b-red-600 absolute top-0" />
              </div>
              <div className="text-[9px] font-semibold text-purple-900 tracking-tight">Eje E ↔ O</div>
            </div>

            {/* Scale badge in bottom-left corner */}
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-purple-200 text-[10px] font-mono text-purple-900 flex items-center gap-2">
              <span>Escala: ~{(scale).toFixed(1)} px / metro</span>
              <span>·</span>
              <span className="font-semibold text-purple-700">Diseño técnico porcino</span>
            </div>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              className="w-full h-full cursor-crosshair select-none transition-transform duration-200 ease-out"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <defs>
                <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e9d5ff" strokeWidth="0.5" />
                </pattern>
                
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6b21a8" />
                </marker>

                <marker id="arrow-error" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#dc2626" />
                </marker>
              </defs>

              {/* Grid Background */}
              {showGrid && (
                <rect width={canvasWidth} height={canvasHeight} fill={`url(#${patternId})`} />
              )}

              {/* Perimeter Buffer / Sanitary Ring */}
              {showBiosecurityRing && (
                <rect
                  x={lotStartX - 15}
                  y={lotStartY - 15}
                  width={lotPixelWidth + 30}
                  height={lotPixelHeight + 30}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  rx="12"
                />
              )}

              {/* Main Lot Boundary (Predio) */}
              <rect
                x={lotStartX}
                y={lotStartY}
                width={lotPixelWidth}
                height={lotPixelHeight}
                fill="#ffffff"
                stroke={
                  isCria && !breedingLayout.validation.hasValidTerrain
                    ? '#d97706'
                    : !activeValidation.fitsInsideLot
                    ? '#dc2626'
                    : '#4a044e'
                }
                strokeWidth={!activeValidation.fitsInsideLot ? '3' : '2.5'}
                strokeDasharray={isCria && !breedingLayout.validation.hasValidTerrain ? '8 4' : undefined}
                rx="6"
              />

              {/* Lot Ground Texture */}
              <rect
                x={lotStartX}
                y={lotStartY}
                width={lotPixelWidth}
                height={lotPixelHeight}
                fill="#fdf4ff"
                opacity="0.4"
                rx="6"
              />

              {/* External Dimensions / Cotas (Real lot dimensions in meters) */}
              {showDimensions && (
                <g className="text-[11px] font-mono font-bold fill-purple-900">
                  {/* Top dimension (Length) */}
                  <line
                    x1={lotStartX}
                    y1={lotStartY - 24}
                    x2={lotStartX + lotPixelWidth}
                    y2={lotStartY - 24}
                    stroke="#7e22ce"
                    strokeWidth="1.5"
                    markerStart="url(#arrow)"
                    markerEnd="url(#arrow)"
                  />
                  <line x1={lotStartX} y1={lotStartY - 30} x2={lotStartX} y2={lotStartY} stroke="#7e22ce" strokeWidth="0.8" strokeDasharray="2 2" />
                  <line x1={lotStartX + lotPixelWidth} y1={lotStartY - 30} x2={lotStartX + lotPixelWidth} y2={lotStartY} stroke="#7e22ce" strokeWidth="0.8" strokeDasharray="2 2" />
                  <text x={lotStartX + lotPixelWidth / 2} y={lotStartY - 30} textAnchor="middle" fill="#581c87" fontSize="12">
                    Largo del predio: {lotLength} m
                  </text>

                  {/* Left dimension (Width) */}
                  <line
                    x1={lotStartX - 24}
                    y1={lotStartY}
                    x2={lotStartX - 24}
                    y2={lotStartY + lotPixelHeight}
                    stroke="#7e22ce"
                    strokeWidth="1.5"
                    markerStart="url(#arrow)"
                    markerEnd="url(#arrow)"
                  />
                  <line x1={lotStartX - 30} y1={lotStartY} x2={lotStartX} y2={lotStartY} stroke="#7e22ce" strokeWidth="0.8" strokeDasharray="2 2" />
                  <line x1={lotStartX - 30} y1={lotStartY + lotPixelHeight} x2={lotStartX} y2={lotStartY + lotPixelHeight} stroke="#7e22ce" strokeWidth="0.8" strokeDasharray="2 2" />
                  <text
                    x={-(lotStartY + lotPixelHeight / 2)}
                    y={lotStartX - 30}
                    transform="rotate(-90)"
                    textAnchor="middle"
                    fill="#581c87"
                    fontSize="12"
                  >
                    Ancho: {lotWidth} m
                  </text>
                </g>
              )}

              {/* Entrance Gate & Sanitary Filter (Pediluvio) */}
              <g
                className="cursor-pointer transition-opacity hover:opacity-85"
                onClick={() => handleZoneClick({
                  title: 'Filtro Sanitario y Pediluvio de Entrada',
                  category: 'Bioseguridad y Acceso',
                  dimensionsText: `${pediluvioRect.width}m × ${pediluvioRect.height}m (${(pediluvioRect.width * pediluvioRect.height).toFixed(1)} m²)`,
                  description: 'Acceso perimetral de control sanitario para desinfección de calzado, lavado de manos y cambio por botas limpias antes de ingresar a los corrales.',
                  recommendations: [
                    'Ubicado en el cerramiento perimetral a distancia de retiro del lote.',
                    'Solución desinfectante activa de recambio regular.',
                    'Doble vado para separación de paso peatonal y rodaluvio vehicular.'
                  ]
                })}
              >
                <rect
                  x={gateX}
                  y={gateY}
                  width={gateW}
                  height={gateH}
                  fill="#f3e8ff"
                  stroke="#7e22ce"
                  strokeWidth="1.5"
                  rx="4"
                />
                <text x={gateX + gateW / 2} y={gateY + gateH / 2 - 2} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#581c87">
                  Pediluvio / Filtro
                </text>
                <text x={gateX + gateW / 2} y={gateY + gateH / 2 + 10} textAnchor="middle" fontSize="7.5" fontStyle="italic" fill="#6b21a8">
                  {pediluvioRect.width}m × {pediluvioRect.height}m
                </text>
              </g>

              {/* Feed Warehouse / Bodega */}
              <g
                className="cursor-pointer transition-opacity hover:opacity-85"
                onClick={() =>
                  handleZoneClick(
                    isCria
                      ? {
                          title: 'Bodega de Alimento e Insumos (Cría)',
                          category: 'Almacenamiento y Logística',
                          dimensionsText: `${bodegaRect.width}m × ${bodegaRect.height}m (${(bodegaRect.width * bodegaRect.height).toFixed(1)} m²)`,
                          description: 'Área referencial configurable para almacenamiento de alimento de gestación, lactancia e insumos sanitarios sobre estibas.',
                          recommendations: [
                            'Parámetro referencial configurable (sin fórmula cerrada única en matriz para cría).',
                            'Almacenar sacos sobre estibas separadas 20 cm de paredes.',
                            'Control de roedores, humedad y separación de medicamentos.'
                          ]
                        }
                      : {
                          title: 'Bodega de Alimento Concentrado',
                          category: 'Almacenamiento y Logística',
                          dimensionsText: `${bodegaRect.width}m × ${bodegaRect.height}m (${(bodegaRect.width * bodegaRect.height).toFixed(1)} m²)`,
                          description: `Bodega dimensionada para almacenar ${growthLayout.feedSystem.totalStockTons} ton de concentrado (~${Math.ceil(growthLayout.feedSystem.totalStockKg / 40)} sacos de 40 kg), garantizando 15 días de stock de seguridad para ${animalCount} cerdos.`,
                          recommendations: [
                            `Stock de seguridad: 15 días (${growthLayout.feedSystem.totalStockKg.toLocaleString()} kg).`,
                            `Consumo estimado: ${growthLayout.feedSystem.dailyIntakePerPigKg} kg/cerdo/día.`,
                            'Almacenamiento exclusivo sobre estibas plásticas o tratadas, separadas 20 cm de las paredes.',
                            'Piso de concreto impermeabilizado y elevado mínimo 15 cm respecto al nivel exterior.'
                          ]
                        }
                  )
                }
              >
                <rect
                  x={warehouseX}
                  y={warehouseY}
                  width={warehouseW}
                  height={warehouseH}
                  fill="#e9d5ff"
                  stroke="#6b21a8"
                  strokeWidth="1.8"
                  rx="4"
                />
                <text x={warehouseX + warehouseW / 2} y={warehouseY + warehouseH / 2 - 2} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#3b0764">
                  Bodega Alimento
                </text>
                <text x={warehouseX + warehouseW / 2} y={warehouseY + warehouseH / 2 + 10} textAnchor="middle" fontSize="7.5" fontStyle="italic" fill="#4a044e">
                  {bodegaRect.width}m × {bodegaRect.height}m
                </text>
              </g>

              {/* Water Storage Tank */}
              <g
                className="cursor-pointer transition-opacity hover:opacity-85"
                onClick={() =>
                  handleZoneClick(
                    isCria
                      ? {
                          title: 'Tanque de Reserva Hídrica y Aforo (Cría)',
                          category: 'Red Hidráulica y Bebederos',
                          dimensionsText: `${tanqueRect.width}m × ${tanqueRect.height}m (${breedingLayout.waterSystem.tankReserveLiters.toLocaleString()} L)`,
                          description: `Reserva estimada de ${breedingLayout.waterSystem.tankReserveM3} m³ (${breedingLayout.waterSystem.tankReserveLiters.toLocaleString()} L) para 3 días + 20% de contingencia en cría.`,
                          recommendations: [
                            `Demanda diaria estimada: ${breedingLayout.waterSystem.totalDailyLiters} L/día (18 L gestante, 22 L lactante, 16 L verraco).`,
                            `Aforo recomendado en chupos: ${breedingLayout.waterSystem.drinkerFlowRate}.`,
                            'Agua potable, higiénica y permanente en gestación, maternidad y verracos.'
                          ]
                        }
                      : {
                          title: 'Tanque de Reserva Hídrica y Bebederos',
                          category: 'Red Hidráulica y Bebederos',
                          dimensionsText: `${tanqueRect.width}m × ${tanqueRect.height}m (${growthLayout.waterSystem.tankReserveLiters.toLocaleString()} L)`,
                          description: `Reserva calculada de ${growthLayout.waterSystem.tankReserveM3} m³ (${growthLayout.waterSystem.tankReserveLiters.toLocaleString()} L) para garantizar 3 días continuos de abastecimiento autónomo con +20% de margen técnico.`,
                          recommendations: [
                            `Bebederos mínimos: ${growthLayout.waterSystem.minDrinkersTotal} chupones (mín. 1 por cada 10 cerdos).`,
                            `Caudal recomendado de aforo: ${growthLayout.waterSystem.drinkerFlowRate}.`,
                            `Consumo diario del hato: ${growthLayout.waterSystem.dailyWaterDemandLiters} L/día.`,
                            'Autonomía recomendada: 3 días (Manual de Construcciones Porcícolas 2026).',
                            'Ubicación protegida de radiación directa para mantener agua fresca y potable.'
                          ]
                        }
                  )
                }
              >
                <circle
                  cx={tankX}
                  cy={tankY}
                  r={tankRadius}
                  fill="#dbeafe"
                  stroke="#2563eb"
                  strokeWidth="2"
                />
                <text x={tankX} y={tankY + 3} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1e40af">
                  Tanque H₂O
                </text>
              </g>

              {/* Waste Treatment: Estercolero / Fosa Séptica */}
              <g
                className="cursor-pointer transition-opacity hover:opacity-85"
                onClick={() =>
                  handleZoneClick(
                    isCria
                      ? {
                          title: 'Estercolero / Fosa de Efluentes (Cría)',
                          category: 'Manejo Sanitario y Ambiental',
                          dimensionsText: `${estercoleroRect.width}m × ${estercoleroRect.height}m (${(estercoleroRect.width * estercoleroRect.height).toFixed(1)} m²)`,
                          description: 'Huella referencial impermeabilizada para recolección de porcinaza y aguas de lavado; su volumen final depende del diseño hidráulico del predio.',
                          recommendations: [
                            'Impermeabilización hidrófuga o geomembrana para evitar lixiviados.',
                            'Ubicado en la cota más baja del lote y a sotavento.',
                            'Verificar sistema de recolección y estabilización de sólidos y efluentes.'
                          ]
                        }
                      : {
                          title: 'Fosa / Estercolero de Porcinaza',
                          category: 'Manejo Sanitario y Ambiental',
                          dimensionsText: `${estercoleroRect.width}m × ${estercoleroRect.height}m (${(estercoleroRect.width * estercoleroRect.height).toFixed(1)} m²)`,
                          description: `Depósito impermeabilizado con volumen útil calculado de ${growthLayout.effluentSystem.pitVolumeM3} m³ para 30 días de retención y bioestabilización de porcinaza.`,
                          recommendations: [
                            `Volumen útil requerido: ${growthLayout.effluentSystem.pitVolumeM3} m³ (${growthLayout.effluentSystem.retentionDays} días de retención).`,
                            'Impermeabilización hidrófuga o geomembrana para evitar lixiviación a aguas subterráneas.',
                            'Ubicado en la cota más baja del lote y a sotavento (viento hacia afuera).',
                            'Mantener distancia de seguridad respecto a fuentes de agua y área habitacional.'
                          ]
                        }
                  )
                }
              >
                <rect
                  x={wasteX}
                  y={wasteY}
                  width={wasteW}
                  height={wasteH}
                  fill="#fed7aa"
                  stroke="#ea580c"
                  strokeWidth="1.8"
                  rx="4"
                />
                <text x={wasteX + wasteW / 2} y={wasteY + wasteH / 2 - 2} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#7c2d12">
                  Estercolero / Fosa
                </text>
                <text x={wasteX + wasteW / 2} y={wasteY + wasteH / 2 + 10} textAnchor="middle" fontSize="7.5" fontStyle="italic" fill="#9a3412">
                  {estercoleroRect.width}m × {estercoleroRect.height}m
                </text>
              </g>

              {/* MAIN PRODUCTION PAVILIONS: DEDICATED RENDER FOR CRÍA VS CEBA */}
              {isCria ? (
                <g>
                  {/* 1. Nave de Gestación (from breedingLayout.rectangles) */}
                  {(() => {
                    const gestRect = breedingLayout.rectangles.find(r => r.id === 'nave_gestacion');
                    if (!gestRect) return null;
                    const gx = lotStartX + gestRect.x * scale;
                    const gy = lotStartY + gestRect.y * scale;
                    const gw = gestRect.width * scale;
                    const gh = gestRect.height * scale;
                    const gest = breedingLayout.gestation;
                    const aisleH = gest.aisleWidth * scale;
                    const unitW = gest.unitWidth * scale;
                    const unitH = gest.unitLength * scale;
                    const isViolating = breedingLayout.validation.hasValidTerrain && !breedingLayout.validation.isViable;

                    return (
                      <g
                        className="cursor-pointer"
                        onClick={() =>
                          handleZoneClick({
                            title: gest.housing === 'grupal' ? 'Nave de Gestación Grupal' : 'Nave de Gestación en Jaulas',
                            category: `${gest.classification} (${gest.source})`,
                            dimensionsText: `${gest.pavilionLength}m × ${gest.pavilionWidth}m (${gest.pavilionGrossArea} m² brutos)`,
                            description: `${gest.note} Superficie útil: ${gest.netArea} m² (${gest.appliedAreaPerSow} ${gest.unitLabel}).`,
                            recommendations: [
                              `Fuente: ${gest.source}`,
                              `Unidades: ${gest.unitsCount} ${gest.housing === 'grupal' ? 'corral(es) grupal(es)' : 'jaula(s)'} de ${gest.unitWidth}m × ${gest.unitLength}m.`,
                              `Pasillo interno: ${gest.aisleWidth} m (0,90 m acceso cerdas / 0,70 m alimentación).`,
                              `Iluminación mínima recomendada: ≥ ${breedingLayout.lightingHoursMin} h/día.`
                            ]
                          })
                        }
                      >
                        <rect
                          x={gx}
                          y={gy}
                          width={gw}
                          height={gh}
                          fill="#ffffff"
                          stroke={isViolating ? '#dc2626' : '#4c1d95'}
                          strokeWidth="2.2"
                          rx="4"
                        />
                        {showDimensions && (
                          <text
                            x={gx + gw / 2}
                            y={gy - 6}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="bold"
                            fill={isViolating ? '#dc2626' : '#4c1d95'}
                          >
                            Gestación ({gest.housing === 'grupal' ? 'Grupal' : 'Jaulas'}): {gest.pavilionLength}m × {gest.pavilionWidth}m
                          </text>
                        )}
                        {/* Internal pens or crates */}
                        {Array.from({ length: gest.unitsPerRow }).map((_, colIdx) => {
                          const xPos = gx + colIdx * unitW;
                          const topIdx = colIdx + 1;
                          const bottomIdx = colIdx + 1 + gest.unitsPerRow;
                          const hasBottom = gest.rowsCount === 2 && bottomIdx <= gest.unitsCount;
                          return (
                            <g key={`gest_u_${colIdx}`}>
                              <rect
                                x={xPos}
                                y={gy}
                                width={unitW}
                                height={unitH}
                                fill="#f5f3ff"
                                stroke="#a78bfa"
                                strokeWidth="0.9"
                              />
                              {gest.housing === 'grupal' && (
                                <text
                                  x={xPos + unitW / 2}
                                  y={gy + unitH / 2 + 3}
                                  textAnchor="middle"
                                  fontSize="7"
                                  fontWeight="bold"
                                  fill="#4c1d95"
                                >
                                  G{topIdx}
                                </text>
                              )}
                              {hasBottom && (
                                <>
                                  <rect
                                    x={xPos}
                                    y={gy + unitH + aisleH}
                                    width={unitW}
                                    height={unitH}
                                    fill="#f5f3ff"
                                    stroke="#a78bfa"
                                    strokeWidth="0.9"
                                  />
                                  {gest.housing === 'grupal' && (
                                    <text
                                      x={xPos + unitW / 2}
                                      y={gy + unitH + aisleH + unitH / 2 + 3}
                                      textAnchor="middle"
                                      fontSize="7"
                                      fontWeight="bold"
                                      fill="#4c1d95"
                                    >
                                      G{bottomIdx}
                                    </text>
                                  )}
                                </>
                              )}
                            </g>
                          );
                        })}
                        {/* Gestation aisle */}
                        <rect
                          x={gx}
                          y={gy + unitH}
                          width={gw}
                          height={aisleH}
                          fill="#ede9fe"
                          stroke="#c4b5fd"
                          strokeWidth="0.8"
                        />
                        <text
                          x={gx + gw / 2}
                          y={gy + unitH + aisleH / 2 + 2.5}
                          textAnchor="middle"
                          fontSize="7"
                          fontWeight="bold"
                          fill="#5b21b6"
                        >
                          Pasillo Gestación ({gest.aisleWidth}m)
                        </text>
                      </g>
                    );
                  })()}

                  {/* 2. Corral de Verracos (only if boarsCount > 0) */}
                  {(() => {
                    const boarRect = breedingLayout.rectangles.find(r => r.id === 'corral_verracos');
                    if (!boarRect) return null;
                    const bx = lotStartX + boarRect.x * scale;
                    const by = lotStartY + boarRect.y * scale;
                    const bw = boarRect.width * scale;
                    const bh = boarRect.height * scale;
                    const boars = breedingLayout.boars;
                    const singleW = boars.penWidth * scale;

                    return (
                      <g
                        className="cursor-pointer"
                        onClick={() =>
                          handleZoneClick({
                            title: `Corral de Verraco${boars.boarsCount > 1 ? 's' : ''}`,
                            category: `${boars.classification} (${boars.source})`,
                            dimensionsText: `${boarRect.width}m × ${boarRect.height}m (${boars.totalGrossArea} m²)`,
                            description: `${boars.boarsCount} plaza(s) de verraco de ${boars.penWidth}m × ${boars.penLength}m (${boars.areaPerPen} m² útiles c/u).`,
                            recommendations: [
                              'Mínimo técnico recomendado: ≥ 6 m² y ancho ≥ 2,20 m (ideal ≥ 7 m² y cerramiento de 1,20 m).',
                              `Aforo de bebedero: ${breedingLayout.waterSystem.drinkerFlowRate}.`
                            ]
                          })
                        }
                      >
                        <rect
                          x={bx}
                          y={by}
                          width={bw}
                          height={bh}
                          fill="#f3e8ff"
                          stroke="#7e22ce"
                          strokeWidth="2"
                          rx="4"
                        />
                        {Array.from({ length: boars.boarsCount }).map((_, idx) => (
                          <rect
                            key={`boar_${idx}`}
                            x={bx + idx * singleW}
                            y={by}
                            width={singleW}
                            height={boars.penLength * scale}
                            fill="#faf5ff"
                            stroke="#a855f7"
                            strokeWidth="1"
                          />
                        ))}
                        <text
                          x={bx + bw / 2}
                          y={by + bh / 2 - 2}
                          textAnchor="middle"
                          fontSize="8"
                          fontWeight="bold"
                          fill="#581c87"
                        >
                          Verraco{boars.boarsCount > 1 ? `s (${boars.boarsCount})` : ''}
                        </text>
                        <text
                          x={bx + bw / 2}
                          y={by + bh / 2 + 9}
                          textAnchor="middle"
                          fontSize="7"
                          fontStyle="italic"
                          fill="#6b21a8"
                        >
                          {boarRect.width}m × {boarRect.height}m
                        </text>
                      </g>
                    );
                  })()}

                  {/* 3. Salas de Maternidad (each sala from breedingLayout.rectangles) */}
                  {breedingLayout.rectangles
                    .filter(r => r.category === 'maternidad')
                    .map((salaRect, idx) => {
                      const sx = lotStartX + salaRect.x * scale;
                      const sy = lotStartY + salaRect.y * scale;
                      const sw = salaRect.width * scale;
                      const sh = salaRect.height * scale;
                      const farr = breedingLayout.farrowing;
                      const placeW = farr.placeWidth * scale;
                      const placeH = farr.placeLength * scale;
                      const aisleH = farr.aisleWidth * scale;
                      const innerPadX = 0.3 * scale;
                      const innerPadY = 0.2 * scale;
                      const isViolating = breedingLayout.validation.hasValidTerrain && !breedingLayout.validation.isViable;

                      return (
                        <g
                          key={salaRect.id}
                          className="cursor-pointer"
                          onClick={() =>
                            handleZoneClick({
                              title: `Sala de Maternidad ${idx + 1}`,
                              category: `${farr.classification} (${farr.source})`,
                              dimensionsText: `${salaRect.width}m × ${salaRect.height}m (${farr.roomGrossArea} m²)`,
                              description: `Sala dimensionada para ${farr.placesPerRoom} paridera(s) de ${farr.placeWidth}m × ${farr.placeLength}m (${farr.areaPerPlace} m²/plaza) con pasillo de ${farr.aisleWidth} m.`,
                              recommendations: [
                                farr.note,
                                'Manual 2026: jaula paridera 0,70 m ancho efectivo + 0,65 m franja de lechones a cada lado (2,00 m total).',
                                breedingLayout.pigletHeatingNote,
                                `Aforo de bebedero cerda lactante: ${breedingLayout.waterSystem.drinkerFlowRate}.`
                              ]
                            })
                          }
                        >
                          <rect
                            x={sx}
                            y={sy}
                            width={sw}
                            height={sh}
                            fill="#ffffff"
                            stroke={isViolating ? '#dc2626' : '#a21caf'}
                            strokeWidth="2"
                            rx="4"
                          />
                          {showDimensions && (
                            <text
                              x={sx + sw / 2}
                              y={sy - 5}
                              textAnchor="middle"
                              fontSize="8.5"
                              fontWeight="bold"
                              fill={isViolating ? '#dc2626' : '#86198f'}
                            >
                              Maternidad S{idx + 1}: {salaRect.width}m × {salaRect.height}m
                            </text>
                          )}

                          {/* Parideras grid inside sala */}
                          {Array.from({ length: farr.placesPerRowInRoom }).map((_, colIdx) => {
                            const px = sx + innerPadX + colIdx * placeW;
                            const hasBottom = farr.rowsPerRoom === 2;
                            return (
                              <g key={`${salaRect.id}_p_${colIdx}`}>
                                <rect
                                  x={px}
                                  y={sy + innerPadY}
                                  width={placeW}
                                  height={placeH}
                                  fill="#fae8ff"
                                  stroke="#d946ef"
                                  strokeWidth="0.9"
                                />
                                {hasBottom && (
                                  <rect
                                    x={px}
                                    y={sy + innerPadY + placeH + aisleH}
                                    width={placeW}
                                    height={placeH}
                                    fill="#fae8ff"
                                    stroke="#d946ef"
                                    strokeWidth="0.9"
                                  />
                                )}
                              </g>
                            );
                          })}

                          {/* Sala aisle */}
                          <rect
                            x={sx + innerPadX}
                            y={sy + innerPadY + placeH}
                            width={Math.max(0, sw - innerPadX * 2)}
                            height={aisleH}
                            fill="#fdf4ff"
                            stroke="#e879f9"
                            strokeWidth="0.7"
                          />
                          <text
                            x={sx + sw / 2}
                            y={sy + innerPadY + placeH + aisleH / 2 + 2.5}
                            textAnchor="middle"
                            fontSize="7"
                            fontWeight="bold"
                            fill="#86198f"
                          >
                            Sala {idx + 1} · Pasillo {farr.aisleWidth}m
                          </text>
                        </g>
                      );
                    })}
                </g>
              ) : (
                <g
                className="cursor-pointer"
                onClick={() => handleZoneClick({
                  title: isCeba 
                    ? `Nave de Levante y Ceba (${growthLayout.pensCount} corrales)` 
                    : 'Nave Porcina de Producción',
                  category: 'Instalación Productiva Principal',
                  dimensionsText: `${growthLayout.pavilionLength}m × ${growthLayout.pavilionWidth}m (${growthLayout.pavilionGrossArea} m² brutos)`,
                  description: `Nave calculada con ${growthLayout.netFreeFloorArea} m² de superficie de suelo libre para ${animalCount} cerdos (${growthLayout.appliedDensity} m²/cerdo).`,
                  recommendations: [
                    `Superficie libre mínima: ${growthLayout.netFreeFloorArea} m².`,
                    `Corrales calculados: ${growthLayout.pensCount} unidades de ${growthLayout.penWidth}m × ${growthLayout.penLength}m (${growthLayout.netAreaPerPen} m² c/u).`,
                    `Bebederos: ≥ ${growthLayout.waterSystem.minDrinkersTotal} chupones (≥ ${growthLayout.waterSystem.minDrinkersPerPen} por corral, caudal ${growthLayout.waterSystem.drinkerFlowRate}).`,
                    `Iluminación mínima: ≥ ${growthLayout.minLightingHours} horas/día de luz.`,
                    `Pasillo central de manejo: ${growthLayout.aisleWidth} m de ancho.`,
                    'Orientación longitudinal Este-Oeste para mitigar radiación solar.',
                    'Pendiente de pisos entre 2.5% y 3% dirigida hacia canaletas.'
                  ]
                })}
              >
                {/* Pavilion Base Outline (Highlighted in red dashed stroke if spatial violation) */}
                <rect
                  x={pavilionX}
                  y={pavilionY}
                  width={pavilionPixelW}
                  height={pavilionPixelH}
                  fill="#ffffff"
                  stroke={!growthLayout.validation.isViable ? '#dc2626' : '#3b0764'}
                  strokeWidth={!growthLayout.validation.isViable ? '3' : '2.5'}
                  strokeDasharray={!growthLayout.validation.isViable ? '6 3' : undefined}
                  rx="6"
                  className="filter drop-shadow-xs"
                />

                {/* Dimension callouts directly on the SVG */}
                {showDimensions && (
                  <g className="text-[10px] font-mono font-bold">
                    {/* Top dimension of pavilion */}
                    <text
                      x={pavilionX + pavilionPixelW / 2}
                      y={pavilionY - 8}
                      textAnchor="middle"
                      fill={!growthLayout.validation.isViable ? '#dc2626' : '#581c87'}
                      fontSize="10"
                    >
                      Largo Nave: {growthLayout.pavilionLength} m
                    </text>

                    {/* Side dimension of pavilion */}
                    <text
                      x={pavilionX - 8}
                      y={pavilionY + pavilionPixelH / 2}
                      textAnchor="end"
                      fill={!growthLayout.validation.isViable ? '#dc2626' : '#581c87'}
                      fontSize="9"
                    >
                      {growthLayout.pavilionWidth} m
                    </text>
                  </g>
                )}

                {/* Central Corridor (Pasillo Central de Manejo) */}
                <rect
                  x={pavilionX}
                  y={pavilionY + growthLayout.penLength * scale}
                  width={pavilionPixelW}
                  height={growthLayout.aisleWidth * scale}
                  fill="#f3e8ff"
                  stroke="#c084fc"
                  strokeWidth="1"
                />
                <text
                  x={pavilionX + pavilionPixelW / 2}
                  y={pavilionY + (growthLayout.penLength + growthLayout.aisleWidth / 2) * scale + 3}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="bold"
                  fill="#6b21a8"
                >
                  Pasillo de Manejo ({growthLayout.aisleWidth} m)
                </text>

                {orientation === 'ciclo_completo' ? (
                  <>
                    {/* Ciclo Completo: 4 Stages */}
                    {[
                      { label: 'Gestación', fill: '#f5f3ff' },
                      { label: 'Maternidad', fill: '#fae8ff' },
                      { label: 'Destete / Precebo', fill: '#ede9fe' },
                      { label: 'Ceba Final', fill: '#f3e8ff' }
                    ].map((stg, idx) => {
                      const colW = pavilionPixelW / 4;
                      return (
                        <g key={stg.label}>
                          <rect
                            x={pavilionX + idx * colW}
                            y={pavilionY}
                            width={colW}
                            height={pavilionPixelH * 0.4}
                            fill={stg.fill}
                            stroke="#c084fc"
                            strokeWidth="1"
                          />
                          <rect
                            x={pavilionX + idx * colW}
                            y={pavilionY + pavilionPixelH * 0.6}
                            width={colW}
                            height={pavilionPixelH * 0.4}
                            fill={stg.fill}
                            stroke="#c084fc"
                            strokeWidth="1"
                          />
                          <text
                            x={pavilionX + idx * colW + colW / 2}
                            y={pavilionY + pavilionPixelH * 0.22}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="bold"
                            fill="#4c1d95"
                          >
                            {stg.label}
                          </text>
                          <text
                            x={pavilionX + idx * colW + colW / 2}
                            y={pavilionY + pavilionPixelH * 0.82}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="bold"
                            fill="#4c1d95"
                          >
                            {stg.label} (B)
                          </text>
                        </g>
                      );
                    })}
                  </>
                ) : (
                  /* LEVANTE-CEBA: Dynamic calculated pens grid */
                  Array.from({ length: growthLayout.pensPerRow }).map((_, i) => {
                    const penW = growthLayout.penWidth * scale;
                    const penH = growthLayout.penLength * scale;
                    const penStartX = pavilionX + i * penW;

                    // Top row pen
                    const topPenIndex = i + 1;
                    // Bottom row pen
                    const bottomPenIndex = i + 1 + growthLayout.pensPerRow;
                    const isBottomActive = bottomPenIndex <= growthLayout.pensCount;

                    return (
                      <g key={`pen_col_${i}`}>
                        {/* Top Pen */}
                        <rect
                          x={penStartX}
                          y={pavilionY}
                          width={penW}
                          height={penH}
                          fill="#faf5ff"
                          stroke="#d8b4fe"
                          strokeWidth="1"
                        />
                        <text
                          x={penStartX + penW / 2}
                          y={pavilionY + penH * 0.4}
                          textAnchor="middle"
                          fontSize="8"
                          fontWeight="bold"
                          fill="#581c87"
                        >
                          Corral {topPenIndex}
                        </text>
                        <text
                          x={penStartX + penW / 2}
                          y={pavilionY + penH * 0.7}
                          textAnchor="middle"
                          fontSize="7"
                          fill="#7e22ce"
                        >
                          {growthLayout.netAreaPerPen} m²
                        </text>

                        {/* Bottom Pen (if within total pens count) */}
                        {isBottomActive && (
                          <>
                            <rect
                              x={penStartX}
                              y={pavilionY + (growthLayout.penLength + growthLayout.aisleWidth) * scale}
                              width={penW}
                              height={penH}
                              fill="#faf5ff"
                              stroke="#d8b4fe"
                              strokeWidth="1"
                            />
                            <text
                              x={penStartX + penW / 2}
                              y={pavilionY + (growthLayout.penLength + growthLayout.aisleWidth) * scale + penH * 0.4}
                              textAnchor="middle"
                              fontSize="8"
                              fontWeight="bold"
                              fill="#581c87"
                            >
                              Corral {bottomPenIndex}
                            </text>
                            <text
                              x={penStartX + penW / 2}
                              y={pavilionY + (growthLayout.penLength + growthLayout.aisleWidth) * scale + penH * 0.7}
                              textAnchor="middle"
                              fontSize="7"
                              fill="#7e22ce"
                            >
                              {growthLayout.netAreaPerPen} m²
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })
                )}

                {/* Drainage Gutter (Canaleta de Porcinaza) line at bottom of pavilion */}
                <line
                  x1={pavilionX}
                  y1={pavilionY + pavilionPixelH}
                  x2={pavilionX + pavilionPixelW}
                  y2={pavilionY + pavilionPixelH}
                  stroke="#ea580c"
                  strokeWidth="3"
                  strokeDasharray="4 2"
                />
              </g>
              )}

              {/* Effluent pipe to estercolero (for Ceba/Ciclo; for Cría omit hardcoded pavilion line or connect neatly) */}
              {!isCria && (
                <path
                  d={`M ${pavilionX + pavilionPixelW} ${pavilionY + pavilionPixelH} Q ${wasteX - 20} ${pavilionY + pavilionPixelH + 20} ${wasteX} ${wasteY + wasteH / 2}`}
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              )}
            </svg>
          </div>

          {/* Quick Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600 border-t border-purple-50">
            <div className="flex flex-wrap items-center gap-3">
              {isCria ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-purple-800 inline-block" />
                    <span>Gestación ({breedingLayout.gestation.pavilionLength}m × {breedingLayout.gestation.pavilionWidth}m)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-fuchsia-700 inline-block" />
                    <span>Maternidad ({breedingLayout.farrowing.roomsCount}× {breedingLayout.farrowing.roomLength}m × {breedingLayout.farrowing.roomWidth}m)</span>
                  </span>
                  {breedingLayout.boars.enabled && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-purple-600 inline-block" />
                      <span>Verraco ({breedingLayout.boars.totalGrossArea} m²)</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-purple-700 inline-block" />
                  <span>Nave Calculada ({growthLayout.pavilionLength}m × {growthLayout.pavilionWidth}m)</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-purple-200 inline-block" />
                <span>Bodega ({bodegaRect.width}m × {bodegaRect.height}m)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-orange-300 inline-block" />
                <span>Estercolero ({estercoleroRect.width}m × {estercoleroRect.height}m)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" />
                <span>Tanque ({tanqueRect.width}m)</span>
              </span>
            </div>
            <span className="text-[11px] text-purple-700 italic">
              Posiciones y dimensiones derivadas en metros reales.
            </span>
          </div>

        </div>

        {/* Zone Details / Inspector Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Spatial Diagnostics Box */}
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
            isCria && (!breedingLayout.validation.hasValidTerrain || breedingLayout.pendingInputs.length > 0)
              ? 'bg-amber-50/90 border-amber-300 text-amber-950'
              : activeValidation.isViable
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
              {isCria && (!breedingLayout.validation.hasValidTerrain || breedingLayout.pendingInputs.length > 0) ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Validación Espacial Pendiente</span>
                </>
              ) : activeValidation.isViable ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Distribución Validada en el Terreno</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Inviabilidad Espacial Detectada</span>
                </>
              )}
            </div>
            <p className="text-[11px] leading-relaxed">
              {activeValidation.feasibilityNotice}
            </p>
            {!activeValidation.isViable && (
              <div className="p-2.5 bg-white/90 rounded-lg border border-rose-200 text-[10px] space-y-1">
                {activeValidation.boundaryViolations.map((v, i) => (
                  <div key={i} className="text-rose-800">• {v}</div>
                ))}
                {activeValidation.overlaps.map((o, i) => (
                  <div key={i} className="text-rose-800">• {o.description}</div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 shadow-xs p-6 space-y-4 min-h-[340px]">
            <div className="flex items-center justify-between border-b border-purple-50 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-700" />
                <h2 className="text-sm font-bold text-purple-950">Ficha Técnica de Instalación</h2>
              </div>
              <span className="text-xs text-slate-400">Esquema 2D</span>
            </div>

            {selectedZone ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                    {selectedZone.category}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{selectedZone.title}</h3>
                  <div className="text-xs font-mono font-semibold text-purple-900 mt-0.5">
                    Dimensiones calculadas: {selectedZone.dimensionsText}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedZone.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-purple-50">
                  <span className="text-xs font-bold text-purple-950 block">Buenas Prácticas Zootécnicas:</span>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {selectedZone.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Explorador Interactivo</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    {isCria
                      ? 'Haz clic en Gestación, Salas de Maternidad, Verraco, Bodega o Filtro Sanitario para inspeccionar sus cotas y criterios técnicos.'
                      : 'Haz clic en la nave porcina, la bodega, el estercolero o el filtro sanitario para inspeccionar sus cotas y requisitos de bienestar.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick terrain summary card */}
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 text-xs space-y-2">
            <span className="font-bold text-purple-950 block">Resumen Espacial del Lote:</span>
            <div className="flex justify-between text-slate-600">
              <span>Dimensiones del lote:</span>
              <span className="font-mono font-semibold text-slate-900">
                {hasValidLotDimensions ? `${lotLength}m × ${lotWidth}m` : 'Sin definir'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Área total predial:</span>
              <span className="font-mono font-semibold text-slate-900">{terrain.totalArea} m²</span>
            </div>
            {isCria ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Gestación ({breedingLayout.gestation.housing}):</span>
                  <span className="font-mono font-bold text-purple-950">{breedingLayout.gestation.pavilionGrossArea} m²</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Maternidad ({breedingLayout.farrowing.roomsCount} salas):</span>
                  <span className="font-mono font-bold text-purple-950">{breedingLayout.farrowing.totalGrossArea} m²</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Área bruta productiva total:</span>
                  <span className="font-mono font-bold text-purple-950">{breedingLayout.totalProductiveGrossArea} m²</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Superficie libre mínima:</span>
                  <span className="font-mono font-bold text-purple-950">{growthLayout.netFreeFloorArea} m²</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Área bruta de nave requerida:</span>
                  <span className="font-mono font-bold text-purple-950">{growthLayout.pavilionGrossArea} m²</span>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
