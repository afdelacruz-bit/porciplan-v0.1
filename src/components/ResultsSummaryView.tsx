import React, { useMemo } from 'react';
import { BudgetStageTag, PorciProject } from '../types/project';
import { MATERIAL_OPTIONS } from '../services/storage';
import { calculateGrowthFinishLayout } from '../services/growthFinishLayout';
import { calculateBreedingLayout } from '../services/breedingLayout';
import {
  BUDGET_CATEGORY_LABELS,
  MATERIAL_CONDITION_LABELS,
  PRICE_SOURCE_LABELS,
  QUANTITY_SOURCE_LABELS,
  buildBudgetRecommendations,
  evaluateProjectBudget,
  extractProducerObservations,
  normalizeBudgetItem
} from '../services/budgetEngine';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Download,
  FileDown,
  FileText,
  Info,
  Lightbulb,
  PackageCheck,
  Printer,
  Scale,
  ShieldCheck
} from 'lucide-react';
import { exportProjectSummaryToPdf } from '../services/pdfExport';

interface ResultsSummaryViewProps {
  project: PorciProject;
}

const STAGE_LABELS: Record<BudgetStageTag, string> = {
  ceba: 'Levante-Ceba',
  gestacion: 'Gestación',
  maternidad: 'Maternidad',
  verracos: 'Verracos',
  precebo: 'Precebo',
  compartido: 'Compartido',
  general: 'General'
};

export const ResultsSummaryView: React.FC<ResultsSummaryViewProps> = ({ project }) => {
  const char = project.characterization;
  const currency = char.currency || 'COP';
  const isCeba = char.orientation === 'ceba';
  const isCria = char.orientation === 'cria';

  const growthLayout = useMemo(
    () => calculateGrowthFinishLayout(char.animalCount, char.terrain, project.growthFinishConfig),
    [char.animalCount, char.terrain, project.growthFinishConfig]
  );
  const breedingLayout = useMemo(
    () => calculateBreedingLayout(char.terrain, project.breedingConfig),
    [char.terrain, project.breedingConfig]
  );

  const evaluation = useMemo(
    () => evaluateProjectBudget(project, project.budgetItems || []),
    [project]
  );
  const observations = useMemo(() => extractProducerObservations(project), [project]);
  const recommendations = useMemo(
    () => buildBudgetRecommendations(project, evaluation, observations),
    [project, evaluation, observations]
  );

  const verifiedMaterialDetails = useMemo(
    () =>
      (char.materialDetails || []).filter(
        (m) =>
          (m.usableCondition === 'bueno' || m.usableCondition === 'regular_aprovechable') &&
          Number(m.availableQuantity) > 0
      ),
    [char.materialDetails]
  );

  const confirmedObs = observations.filter((o) => o.status === 'confirmada');
  const pendingObs = observations.filter((o) => o.status === 'pendiente');
  const discardedObs = observations.filter((o) => o.status === 'descartada');

  const orientationMap: Record<string, string> = {
    cria: 'Cría (Producción de Lechones Destetados)',
    ceba: 'Levante y Ceba (Finalización para Mercado)',
    ciclo_completo: 'Ciclo Completo (Parto a Finalización)'
  };

  const sectionOffset = isCeba || isCria ? 3 : 2;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `ficha_tecnica_${char.name.toLowerCase().replace(/\s+/g, '_')}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportTextSummary = () => {
    const lines = [
      `=======================================================`,
      `PORCIPLAN - FICHA TÉCNICA Y ECONÓMICA DE INSTALACIONES`,
      `=======================================================`,
      `Proyecto: ${char.name}`,
      `Productor: ${char.producerName || 'No especificado'}`,
      `Ubicación: ${char.location || 'No especificada'}`,
      `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
      ``,
      `1. CARACTERIZACIÓN DE LA EXPLOTACIÓN:`,
      `- Orientación Productiva: ${orientationMap[char.orientation] || char.orientation}`,
      `- Cantidad de animales: ${char.animalCount} cabezas`,
      `- Dimensiones de lote: ${char.terrain.length}m de largo × ${char.terrain.width}m de ancho`,
      `- Área total: ${char.terrain.totalArea} m²`,
      `- Topografía: ${char.terrain.topography}`,
      `- Infraestructura previa: ${
        char.hasExistingInfrastructure ? `Sí (${char.existingInfraDetails || 'Sin detalle'})` : 'No (Lote virgen)'
      }`,
      `- Fuente de agua: ${char.waterSource}`,
      `- Suministro eléctrico: ${char.hasElectricity ? 'Sí' : 'No'}`,
      ``,
      ...(isCeba
        ? [
            `2. DIMENSIONAMIENTO TÉCNICO DE INSTALACIONES (Levante y Ceba):`,
            `- Superficie libre mínima requerida: ${growthLayout.netFreeFloorArea} m² (${growthLayout.appliedDensity} m²/cerdo)`,
            `- Nave calculada: ${growthLayout.pavilionLength}m × ${growthLayout.pavilionWidth}m (${growthLayout.pensCount} corrales)`,
            `- Bebederos mínimos tipo chupón: >= ${growthLayout.waterSystem.minDrinkersTotal} unidades (Caudal: ${growthLayout.waterSystem.drinkerFlowRate})`,
            `- Demanda hídrica diaria: ${growthLayout.waterSystem.dailyWaterDemandLiters} L/día`,
            `- Tanque de reserva (3 días): ${growthLayout.waterSystem.tankReserveLiters.toLocaleString()} L (${growthLayout.waterSystem.tankReserveM3} m³)`,
            `- Bodega de alimento (15 d stock): ${growthLayout.feedSystem.requiredStorageAreaM2} m² (${growthLayout.feedSystem.totalStockTons} ton)`,
            `- Fosa / Estercolero (30 d retención): ${growthLayout.effluentSystem.pitVolumeM3} m³ (${growthLayout.effluentSystem.pitSurfaceM2} m²)`,
            `- Iluminación mínima recomendada: >= ${growthLayout.minLightingHours} horas/día`,
            `- Viabilidad espacial en el lote: ${
              growthLayout.validation.isViable ? 'VIABLE' : 'NO VIABLE (Requiere ajuste de predio o población)'
            }`,
            ``
          ]
        : isCria
        ? [
            `2. DIMENSIONAMIENTO TÉCNICO DE CRÍA (Manual de Construcciones Porcícolas):`,
            `- Cerdas en gestación: ${breedingLayout.gestation.sowsCount} (${breedingLayout.gestation.housing}, ${breedingLayout.gestation.pavilionLength}m × ${breedingLayout.gestation.pavilionWidth}m, ${breedingLayout.gestation.netArea} m² útiles)`,
            `- Maternidad: ${breedingLayout.farrowing.totalPlaces} parideras en ${breedingLayout.farrowing.roomsCount} sala(s) (${breedingLayout.farrowing.roomLength}m × ${breedingLayout.farrowing.roomWidth}m c/sala, ${breedingLayout.farrowing.totalGrossArea} m² brutos)`,
            `- Verracos / Reproductores: ${
              breedingLayout.boars.enabled
                ? `${breedingLayout.boars.boarsCount} plaza(s) (${breedingLayout.boars.areaPerPen} m² c/u)`
                : 'No aplica (0 verracos)'
            }`,
            `- Demanda hídrica diaria estimada: ${breedingLayout.waterSystem.totalDailyLiters} L/día (Aforo chupos: ${breedingLayout.waterSystem.drinkerFlowRate})`,
            `- Tanque de reserva (3 días + 20%): ${breedingLayout.waterSystem.tankReserveLiters.toLocaleString()} L (${breedingLayout.waterSystem.tankReserveM3} m³)`,
            `- Iluminación mínima recomendada: >= ${breedingLayout.lightingHoursMin} horas/día`,
            `- Viabilidad espacial en el lote: ${
              breedingLayout.validation.isViable
                ? 'VIABLE'
                : breedingLayout.validation.hasValidTerrain
                ? 'NO VIABLE'
                : 'PENDIENTE DE DIMENSIONES DEL TERRENO'
            }`,
            ``
          ]
        : []),
      `3. MATERIALES LOCALES Y RECUPERABLES:`,
      char.availableMaterials.length > 0
        ? char.availableMaterials.map((m) => `* ${m}`).join('\n')
        : '* Ninguno seleccionado',
      ...(verifiedMaterialDetails.length > 0
        ? [
            `Inventario verificado:`,
            ...verifiedMaterialDetails.map(
              (m) =>
                `* ${m.label}: ${m.availableQuantity} ${m.unit} (${MATERIAL_CONDITION_LABELS[m.usableCondition]})${
                  m.purchaseOrTransportCost ? ` · Costo local/flete: ${currency} $${m.purchaseOrTransportCost.toLocaleString()}` : ''
                }`
            )
          ]
        : []),
      char.otherMaterials ? `Otros reportados: ${char.otherMaterials}` : '',
      ``,
      `4. EVALUACIÓN Y BALANCE ECONÓMICO:`,
      `- Estado financiero: ${evaluation.statusLabel}`,
      `- Presupuesto Disponible: ${currency} $${evaluation.availableBudget.toLocaleString()}`,
      `- Subtotal Confirmado (Obra/Equipos): ${currency} $${evaluation.confirmedSubtotal.toLocaleString()}`,
      `- Imprevistos Confirmados (separados): ${currency} $${evaluation.confirmedContingency.toLocaleString()}`,
      `- Total Confirmado General: ${currency} $${evaluation.confirmedGrandTotal.toLocaleString()}`,
      ...(evaluation.templateExampleCount > 0
        ? [
            `- Rubros de ejemplo editable (sin validez real): ${evaluation.templateExampleCount} (${currency} $${evaluation.exampleTemplateSubtotal.toLocaleString()})`
          ]
        : []),
      `- Cobertura de rubros: ${evaluation.confirmedItemsCount}/${evaluation.totalItems} confirmados (${evaluation.pendingPriceCount} sin precio, ${evaluation.pendingQuantityCount} sin cantidad)`,
      `- Balance frente a lo confirmado: ${currency} $${Math.abs(evaluation.balance).toLocaleString()} (${
        evaluation.balance >= 0 ? 'Dentro del monto confirmado' : 'Déficit confirmado'
      })`,
      ...(evaluation.viabilityBlockers.length > 0
        ? [`- Factores que impiden declarar viabilidad definitiva:`, ...evaluation.viabilityBlockers.map((b) => `  * ${b}`)]
        : []),
      ``,
      `5. DESGLOSE TRAZABLE DE RUBROS:`,
      ...(project.budgetItems.length === 0
        ? ['* No hay rubros registrados todavía.']
        : project.budgetItems.map((it) => {
            const n = normalizeBudgetItem(it);
            const qtyStr = n.isQuantityPending ? `Pendiente (${it.unit})` : `${it.quantity} ${it.unit}`;
            const priceStr = n.isPricePending
              ? 'Pendiente de cotizar'
              : `$${Number(it.unitCost).toLocaleString()} [${PRICE_SOURCE_LABELS[n.priceSource]}]`;
            const totalStr =
              n.isQuantityPending || n.isPricePending
                ? 'Pendiente'
                : n.isTemplateExample
                ? `$${Number(it.totalCost).toLocaleString()} (Ejemplo)`
                : `$${Number(n.effectiveTotal).toLocaleString()}`;
            return `* [${BUDGET_CATEGORY_LABELS[it.category]?.split('(')[0].trim() || it.category}] ${it.concept}: ${qtyStr} (${QUANTITY_SOURCE_LABELS[n.quantitySource]}) × ${priceStr} = ${totalStr}`;
          })),
      ``,
      `6. OBSERVACIONES DEL PRODUCTOR:`,
      `- Confirmadas: ${confirmedObs.length} | Pendientes: ${pendingObs.length} | Descartadas: ${discardedObs.length}`,
      ...observations.map((o) => `* [${o.status.toUpperCase()}] ${o.sourceLabel}: "${o.excerpt}" -> ${o.detectedHint}`),
      ``,
      `7. RECOMENDACIONES BASADAS EN DATOS OBSERVADOS:`,
      ...recommendations.map((r) => `* ${r}`),
      ``,
      `=======================================================`,
      `Generado por PorciPlan - Herramienta de Planificación Porcina`
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resumen_${char.name.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const checklistItems = [
    {
      title: 'Orientación Bioclimática Este-Oeste',
      description:
        'El eje longitudinal de las naves porcinas debe ubicarse de Este a Oeste para reducir calentamiento solar lateral.'
    },
    isCeba && project.growthFinishConfig?.housingSystem === 'cama_profunda'
      ? {
          title: 'Cama Profunda Seca y Aireada (40–50 cm)',
          description:
            'Sustrato vegetal absorbente (cascarilla o viruta) sobre base firme compactada, con volteo periódico y control de humedad sin losa de concreto en corrales.'
        }
      : {
          title: 'Pendiente de Piso Sanitario (2-3%)',
          description:
            'Superficie de concreto antideslizante con caída continua hacia las canaletas traseras de lavado.'
        },
    {
      title: 'Bioseguridad y Filtro de Acceso',
      description:
        'Pediluvio en la puerta, cerramiento perimetral de protección y vestier para cambio obligatorio de calzado.'
    },
    {
      title: 'Manejo Responsable de Efluentes',
      description:
        'Fosa impermeabilizada o estercolero ubicado a distancia segura de fuentes hídricas y a sotavento.'
    },
    {
      title: 'Reserva Hídrica Autónoma (Mínimo 48-72h)',
      description:
        'Tanque elevado que garantice suministro ininterrumpido a comederos y bebederos tipo chupón.'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header & Print actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-purple-100 shadow-xs no-print">
        <div>
          <span className="text-xs font-semibold text-purple-700 tracking-wider uppercase">Paso 06</span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Resultados y Ficha del Proyecto</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Informe técnico y económico unificado con trazabilidad de cantidades, cotizaciones y observaciones del productor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportProjectSummaryToPdf(project)}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-xs transition-colors flex items-center gap-2"
            title="Descargar ficha técnica y resumen económico en PDF"
          >
            <FileDown className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-purple-200 text-purple-900 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
            title="Imprimir ficha técnica"
          >
            <Printer className="w-4 h-4 text-purple-600" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleExportTextSummary}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-purple-200 text-purple-900 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
            title="Descargar archivo de texto simple"
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Resumen TXT</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Exportar archivo de datos JSON"
          >
            <Download className="w-4 h-4" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE DOSSIER CARD */}
      <div className="bg-white rounded-3xl border border-purple-200/90 shadow-lg p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-purple-900 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 via-purple-50 to-white dark:from-purple-200 dark:to-purple-100 border border-purple-300/80 shrink-0 flex items-center justify-center">
                <img
                  src="/assets/aistudio/Gemini_Generated_Image_xmvgv6xmvgv6xmvg_7c0efeed.jpg"
                  alt="Logo PorciPlan"
                  className="w-full h-full object-cover object-[50%_47%] scale-[1.48] mix-blend-multiply saturate-[1.35] contrast-[1.12] brightness-[1.03]"
                />
              </div>
              <span className="text-xl font-bold text-purple-950">PorciPlan</span>
              <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium border border-purple-200">
                Ficha Técnica y Económica
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 pt-2">{char.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              {char.producerName && (
                <span>
                  Productor: <strong>{char.producerName}</strong>
                </span>
              )}
              {char.location && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Ubicación: <strong>{char.location}</strong>
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>
                Fecha:{' '}
                {new Date().toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 block">
              Estado Presupuestal
            </span>
            <span
              className={`inline-block mt-0.5 px-3 py-1 rounded-full font-bold text-xs ${
                evaluation.canDeclareViable
                  ? 'bg-emerald-100 text-emerald-900'
                  : evaluation.status === 'deficit_estimado'
                  ? 'bg-rose-100 text-rose-900'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {evaluation.canDeclareViable
                ? 'Dentro del monto (Completo)'
                : evaluation.status === 'deficit_estimado'
                ? 'Déficit Estimado'
                : 'Evaluación Parcial / Pendiente'}
            </span>
          </div>
        </div>

        {/* 1. Project Characterization Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-700" />
            <span>1. Parámetros de la Explotación Porcina</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-xs">
            <div>
              <span className="text-slate-500 block">Orientación Productiva:</span>
              <span className="font-bold text-purple-950 text-sm">
                {orientationMap[char.orientation] || char.orientation}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Capacidad Proyectada:</span>
              <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                {char.animalCount} cerdos
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Dimensiones del Terreno:</span>
              <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                {char.terrain.length}m × {char.terrain.width}m
              </span>
              <span className="text-[11px] text-slate-500 block">Área: {char.terrain.totalArea} m²</span>
            </div>

            <div>
              <span className="text-slate-500 block">Topografía:</span>
              <span className="font-bold text-purple-950 text-sm capitalize">
                {char.terrain.topography.replace('_', ' ')}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Infraestructura Previa:</span>
              <span className="font-bold text-purple-950 text-sm">
                {char.hasExistingInfrastructure ? 'Existente' : 'Predio Nuevo'}
              </span>
              {char.existingInfraDetails && (
                <span className="text-[11px] text-slate-500 block line-clamp-2">
                  {char.existingInfraDetails}
                </span>
              )}
            </div>

            <div>
              <span className="text-slate-500 block">Fuente de Agua:</span>
              <span className="font-bold text-purple-950 text-sm capitalize">
                {char.waterSource.replace('_', ' ')}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Energía Eléctrica:</span>
              <span className="font-bold text-purple-950 text-sm">
                {char.hasElectricity ? 'Disponible' : 'No disponible'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Presupuesto Disponible:</span>
              <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                {currency} ${Number(evaluation.availableBudget).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Materials & Recoverable Coverage Summary */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-purple-700" />
                Materiales marcados en caracterización:
              </span>
              {char.availableMaterials.length === 0 ? (
                <span className="italic text-slate-400">Sin registrar</span>
              ) : (
                char.availableMaterials.map((mId) => {
                  const opt = MATERIAL_OPTIONS.find((o) => o.id === mId);
                  return (
                    <span
                      key={mId}
                      className="bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-md font-medium text-[11px]"
                    >
                      {opt ? opt.label.split('(')[0].trim() : mId}
                    </span>
                  );
                })
              )}
              {char.otherMaterials && (
                <span className="text-slate-500 text-[11px]">({char.otherMaterials})</span>
              )}
            </div>

            {(evaluation.materialCoverage.checkedMaterialsCount > 0 ||
              verifiedMaterialDetails.length > 0 ||
              evaluation.materialCoverage.appliedDiscountItemsCount > 0) && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                <span>
                  Verificados con cantidad y estado:{' '}
                  <strong className="text-purple-950">
                    {evaluation.materialCoverage.verifiedMaterialEntriesCount}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Sin verificar cantidad/estado:{' '}
                  <strong className="text-amber-700">
                    {evaluation.materialCoverage.unverifiedMaterialsCount}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Rubros con descuento aplicado:{' '}
                  <strong className="text-emerald-700">
                    {evaluation.materialCoverage.appliedDiscountItemsCount}
                  </strong>
                </span>
              </div>
            )}

            {verifiedMaterialDetails.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {verifiedMaterialDetails.map((mat) => (
                  <span
                    key={mat.id}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px]"
                  >
                    <strong>{mat.label}</strong>: {mat.availableQuantity} {mat.unit} (
                    {MATERIAL_CONDITION_LABELS[mat.usableCondition]})
                    {mat.purchaseOrTransportCost
                      ? ` · Flete/costo: $${Number(mat.purchaseOrTransportCost).toLocaleString()}`
                      : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Technical Engineering Sizing (Levante-Ceba / Cría) */}
        {isCeba && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-700" />
              <span>2. Dimensionamiento Técnico e Ingeniería (Levante y Ceba)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs">
              <div>
                <span className="text-slate-500 block">Superficie Libre Requerida:</span>
                <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                  {growthLayout.netFreeFloorArea} m²
                </span>
                <span className="text-[10px] text-purple-700 block">
                  ({growthLayout.appliedDensity} {growthLayout.densityUnit})
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Nave Principal Calculada:</span>
                <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                  {growthLayout.pavilionLength}m × {growthLayout.pavilionWidth}m
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {growthLayout.pensCount} corrales ({growthLayout.netAreaPerPen} m² c/u)
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Bebederos y Red Hídrica:</span>
                <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                  ≥ {growthLayout.waterSystem.minDrinkersTotal} chupones
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Reserva 3d: {growthLayout.waterSystem.tankReserveLiters.toLocaleString()} L
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Bodega y Estercolero:</span>
                <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                  {growthLayout.feedSystem.requiredStorageAreaM2} m² / {growthLayout.effluentSystem.pitVolumeM3} m³
                </span>
                <span className="text-[10px] text-slate-500 block">Fosa 30d retención</span>
              </div>
            </div>
          </div>
        )}

        {isCria && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-700" />
              <span>2. Dimensionamiento Técnico de Cría (Manual de Construcciones Porcícolas)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs">
              <div>
                <span className="text-slate-500 block">Gestación ({breedingLayout.gestation.housing}):</span>
                <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                  {breedingLayout.gestation.pavilionLength}m × {breedingLayout.gestation.pavilionWidth}m
                </span>
                <span className="text-[10px] text-purple-700 block">
                  {breedingLayout.gestation.sowsCount} cerdas · {breedingLayout.gestation.netArea} m² útiles
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">
                  Maternidad ({breedingLayout.farrowing.roomsCount} salas):
                </span>
                <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                  {breedingLayout.farrowing.totalGrossArea} m² brutos
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {breedingLayout.farrowing.totalPlaces} parideras ({breedingLayout.farrowing.placeWidth}m ×{' '}
                  {breedingLayout.farrowing.placeLength}m)
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Verracos / Reproductores:</span>
                <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                  {breedingLayout.boars.enabled ? `${breedingLayout.boars.totalGrossArea} m²` : 'No aplica'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {breedingLayout.boars.enabled
                    ? `${breedingLayout.boars.boarsCount} plaza(s)`
                    : '0 verracos en predio'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Red Hídrica y Viabilidad:</span>
                <span className="font-bold text-purple-950 text-sm font-mono tabular-nums">
                  {breedingLayout.waterSystem.tankReserveLiters.toLocaleString()} L
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {breedingLayout.validation.isViable
                    ? 'Distribución viable en lote'
                    : breedingLayout.validation.hasValidTerrain
                    ? 'Requiere ajuste espacial'
                    : 'Pendiente dimensiones lote'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Economic Balance & Provenance Breakdown (Identical to BudgetView) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-700" />
            <span>{sectionOffset}. Evaluación Financiera y Trazabilidad del Presupuesto</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100">
              <span className="text-xs text-slate-500">Presupuesto Disponible:</span>
              <div className="text-lg font-bold text-purple-950 font-mono tabular-nums mt-0.5">
                {currency} ${evaluation.availableBudget.toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100">
              <span className="text-xs text-slate-500">Subtotal Confirmado (Obra/Eq.):</span>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {currency} ${evaluation.confirmedSubtotal.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Imprevistos sep.: {currency} ${evaluation.confirmedContingency.toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100">
              <span className="text-xs text-slate-500">Cobertura de Datos:</span>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {evaluation.confirmedItemsCount}/{evaluation.totalItems}{' '}
                <span className="text-xs font-normal text-slate-500">confirmados</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {evaluation.pendingPriceCount} sin precio · {evaluation.pendingQuantityCount} sin cant.
                {evaluation.templateExampleCount > 0 ? ` · ${evaluation.templateExampleCount} ej.` : ''}
              </span>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                evaluation.status === 'dentro_del_monto'
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                  : evaluation.status === 'deficit_estimado'
                  ? 'bg-rose-50 text-rose-950 border-rose-200'
                  : 'bg-amber-50 text-amber-950 border-amber-200'
              }`}
            >
              <span className="text-xs font-semibold block">
                {evaluation.status === 'dentro_del_monto'
                  ? 'Margen Confirmado:'
                  : evaluation.status === 'deficit_estimado'
                  ? 'Déficit Estimado:'
                  : 'Evaluación Incompleta:'}
              </span>
              <div className="text-lg font-bold font-mono tabular-nums mt-0.5">
                {evaluation.status === 'evaluacion_incompleta'
                  ? 'Parcial'
                  : `${currency} $${Math.abs(evaluation.balance).toLocaleString()}`}
              </div>
              <span className="text-[10px] opacity-85 block leading-tight mt-0.5">
                Total general conf.: ${evaluation.confirmedGrandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Honest Viability / Pending Blockers Callout */}
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              evaluation.canDeclareViable
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : evaluation.status === 'deficit_estimado'
                ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {evaluation.canDeclareViable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : evaluation.status === 'deficit_estimado' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{evaluation.statusLabel}</span>
            </div>
            <p className="text-[11px] leading-relaxed">{evaluation.statusDetail}</p>

            {evaluation.viabilityBlockers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {evaluation.viabilityBlockers.map((b, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/85 border border-current/15 font-medium"
                  >
                    • {b}
                  </span>
                ))}
              </div>
            )}

            {evaluation.status === 'deficit_estimado' && evaluation.topContributors.length > 0 && (
              <div className="pt-1 border-t border-rose-200/70 text-[11px]">
                <span className="font-bold">Mayores contribuyentes al costo: </span>
                {evaluation.topContributors
                  .slice(0, 3)
                  .map(
                    (tc) =>
                      `${tc.concept.split('(')[0].trim()} ($${tc.totalCost.toLocaleString()} · ${tc.sharePct}%)`
                  )
                  .join(' | ')}
              </div>
            )}
          </div>

          {/* Traceable Budget Items Table */}
          {project.budgetItems.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Rubro y Origen de Cantidad</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-2 text-right">Cantidad</th>
                    <th className="py-2.5 px-3 text-right">Unitario y Procedencia</th>
                    <th className="py-2.5 px-3 text-right">Total ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.budgetItems.map((it) => {
                    const norm = normalizeBudgetItem(it);
                    return (
                      <tr
                        key={it.id}
                        className={norm.isTemplateExample ? 'bg-amber-50/40' : ''}
                      >
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{it.concept}</span>
                            {it.stageTag && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-semibold">
                                {STAGE_LABELS[it.stageTag] || it.stageTag}
                              </span>
                            )}
                            {norm.isTemplateExample && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                                Ejemplo editable
                              </span>
                            )}
                          </div>
                          {it.quantityOrigin && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {it.quantityOrigin}
                            </span>
                          )}
                          {it.discountExplanation && (
                            <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                              {it.discountExplanation}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 align-top">
                          {BUDGET_CATEGORY_LABELS[it.category]?.split('(')[0].trim() || it.category}
                        </td>

                        <td className="py-2.5 px-2 text-right align-top">
                          {norm.isQuantityPending ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-semibold">
                              Pendiente ({it.unit})
                            </span>
                          ) : (
                            <div>
                              <span className="font-mono tabular-nums font-semibold text-slate-900">
                                {it.quantity} {it.unit}
                              </span>
                              {it.originalQuantity && it.discountedQuantity ? (
                                <span className="block text-[9px] text-emerald-700 line-through">
                                  Orig: {it.originalQuantity} {it.unit}
                                </span>
                              ) : null}
                              <span className="block text-[9px] text-slate-500">
                                {QUANTITY_SOURCE_LABELS[norm.quantitySource]}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right align-top">
                          {norm.isPricePending ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-semibold">
                              Pendiente cotizar
                            </span>
                          ) : (
                            <div>
                              <span className="font-mono tabular-nums text-slate-900">
                                ${Number(it.unitCost).toLocaleString()}
                              </span>
                              <span className="block text-[9px] text-slate-500">
                                {PRICE_SOURCE_LABELS[norm.priceSource]}
                              </span>
                              {(it.supplierOrRef || it.quoteDate) && (
                                <span className="block text-[9px] text-purple-700">
                                  {[it.supplierOrRef, it.quoteDate].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right align-top font-mono tabular-nums font-semibold text-slate-900">
                          {norm.isQuantityPending || norm.isPricePending ? (
                            <span className="text-amber-700 font-sans text-[10px]">Pendiente</span>
                          ) : norm.isTemplateExample ? (
                            <span className="text-amber-800">
                              ${Number(it.totalCost).toLocaleString()}*
                            </span>
                          ) : (
                            `$${Number(norm.effectiveTotal).toLocaleString()}`
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 text-center">
              Aún no se han generado ni agregado rubros en el módulo de Presupuesto.
            </div>
          )}
        </div>

        {/* 4. Producer Observations Tracking */}
        {observations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-700" />
              <span>
                {sectionOffset + 1}. Seguimiento de Observaciones del Productor (
                {confirmedObs.length} confirmadas · {pendingObs.length} pendientes)
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {observations.map((obs) => (
                <div
                  key={obs.id}
                  className={`p-3.5 rounded-xl border space-y-1.5 ${
                    obs.status === 'confirmada'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : obs.status === 'descartada'
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{obs.sourceLabel}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        obs.status === 'confirmada'
                          ? 'bg-emerald-100 text-emerald-800'
                          : obs.status === 'descartada'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {obs.status === 'confirmada'
                        ? 'Confirmada'
                        : obs.status === 'descartada'
                        ? 'Descartada'
                        : 'Pendiente'}
                    </span>
                  </div>
                  <p className="text-[11px] italic text-slate-700">«{obs.excerpt}»</p>
                  <p className="text-[10px] text-slate-500">{obs.detectedHint}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Concrete Data-Derived Recommendations */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-purple-700" />
            <span>
              {sectionOffset + (observations.length > 0 ? 2 : 1)}. Recomendaciones Concretas según Datos del Proyecto
            </span>
          </h3>

          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2 text-xs">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-700">
                <span className="font-bold text-purple-700 font-mono mt-0.5">0{idx + 1}.</span>
                <p className="leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Zootechnical Checklist for Construction */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>
              {sectionOffset + (observations.length > 0 ? 3 : 2)}. Checklist de Criterios Básicos de Construcción Porcina
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checklistItems.map((chk, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">{chk.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">{chk.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Honest Local Persistence & Quote Sourcing Note (Replaces old placeholder) */}
        <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-purple-950">
            <Info className="w-4 h-4 text-purple-700" />
            <span>Alcance de los Cálculos y Fuente de Precios</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Todos los datos de esta ficha se conservan localmente en tu navegador. Las áreas, capacidades de tanque,
            bebederos y fosa provienen del motor de cálculo zootécnico según tu configuración guardada; los valores
            monetarios dependen exclusivamente de las cotizaciones locales o precios unitarios ingresados por el productor
            (sin conexión externa a bases de precios ni estimación automática de mercado).
          </p>
        </div>

        {/* Footer print note */}
        <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
          PorciPlan · Herramienta de Planificación Técnica y Presupuestal Porcina
        </div>
      </div>
    </div>
  );
};
