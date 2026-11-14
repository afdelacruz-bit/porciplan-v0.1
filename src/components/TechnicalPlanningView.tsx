import React, { useState } from 'react';
import { PorciProject, ProductiveOrientation, TechnicalZoneSpec } from '../types/project';
import { 
  GrowthFinishUserConfig, 
  GrowthFinishWeightRange, 
  GrowthFinishHousingSystem 
} from '../types/growthFinish';
import { BreedingUserConfig } from '../types/breeding';
import { 
  WEIGHT_RANGE_OPTIONS, 
  HOUSING_SYSTEM_OPTIONS, 
  DEFAULT_GROWTH_FINISH_CONFIG,
  COLOMBIAN_REGULATORY_FRAMEWORK
} from '../constants/growthFinishMatrix';
import { DEFAULT_BREEDING_CONFIG } from '../constants/breedingMatrix';
import { calculateGrowthFinishLayout } from '../services/growthFinishLayout';
import { calculateBreedingLayout, resolveBreedingConfig } from '../services/breedingLayout';
import { buildAutoPlanningFromCharacterization } from '../services/autoPlanning';
import { BreedingPlanningSection } from './BreedingPlanningSection';
import { 
  Layers, 
  Wind, 
  Sun, 
  Droplets, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Info, 
  Save, 
  ArrowRight,
  Sliders,
  AlertOctagon,
  Scale,
  Package,
  Lightbulb,
  FileText,
  Wand2,
  X
} from 'lucide-react';

interface TechnicalPlanningViewProps {
  project: PorciProject;
  onUpdateTechnicalNotes: (notes: Record<string, string>) => void;
  onUpdateGrowthFinishConfig?: (config: GrowthFinishUserConfig) => void;
  onUpdateBreedingConfig?: (config: BreedingUserConfig) => void;
  onNavigateToNext: () => void;
}

export const TechnicalPlanningView: React.FC<TechnicalPlanningViewProps> = ({
  project,
  onUpdateTechnicalNotes,
  onUpdateGrowthFinishConfig,
  onUpdateBreedingConfig,
  onNavigateToNext
}) => {
  const [technicalNotes, setTechnicalNotes] = useState<Record<string, string>>(project.technicalNotes || {});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [autoFillSummary, setAutoFillSummary] = useState<string[] | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone_galpon_principal');

  // Growth-Finish Configuration State
  const [growthConfig, setGrowthConfig] = useState<GrowthFinishUserConfig>(
    project.growthFinishConfig || DEFAULT_GROWTH_FINISH_CONFIG
  );

  // Breeding (Cría) Configuration State (backward compatible if project.breedingConfig is absent)
  const [breedingConfig, setBreedingConfig] = useState<BreedingUserConfig>(() =>
    resolveBreedingConfig(project.breedingConfig)
  );

  React.useEffect(() => {
    setTechnicalNotes(project.technicalNotes || {});
    setGrowthConfig(project.growthFinishConfig || DEFAULT_GROWTH_FINISH_CONFIG);
    setBreedingConfig(resolveBreedingConfig(project.breedingConfig));
    setAutoFillSummary(null);
  }, [project.characterization.id]);

  const orientation = project.characterization.orientation;
  const animalCount = project.characterization.animalCount;
  const terrain = project.characterization.terrain;

  // Real-time calculation by orientation (dedicated engines)
  const calculationResult = calculateGrowthFinishLayout(animalCount, terrain, growthConfig);
  const breedingResult = calculateBreedingLayout(terrain, breedingConfig);

  const handleNoteChange = (key: string, value: string) => {
    const updated = { ...technicalNotes, [key]: value };
    setTechnicalNotes(updated);
  };

  const handleConfigChange = (changes: Partial<GrowthFinishUserConfig>) => {
    const updated = { ...growthConfig, ...changes };
    setGrowthConfig(updated);
    if (onUpdateGrowthFinishConfig) {
      onUpdateGrowthFinishConfig(updated);
    }
  };

  const handleBreedingConfigChange = (changes: Partial<BreedingUserConfig>) => {
    const updated = resolveBreedingConfig({ ...breedingConfig, ...changes });
    setBreedingConfig(updated);
    if (onUpdateBreedingConfig) {
      onUpdateBreedingConfig(updated);
    }
  };

  const handleAutoFill = () => {
    const auto = buildAutoPlanningFromCharacterization(project);
    setTechnicalNotes(auto.technicalNotes);
    onUpdateTechnicalNotes(auto.technicalNotes);

    if (auto.growthConfig) {
      setGrowthConfig(auto.growthConfig);
      onUpdateGrowthFinishConfig?.(auto.growthConfig);
    }
    if (auto.breedingConfig) {
      setBreedingConfig(auto.breedingConfig);
      onUpdateBreedingConfig?.(auto.breedingConfig);
    }
    setAutoFillSummary(auto.summaryBullets);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSave = () => {
    onUpdateTechnicalNotes(technicalNotes);
    if (orientation === 'ceba' && onUpdateGrowthFinishConfig) {
      onUpdateGrowthFinishConfig(growthConfig);
    }
    if (orientation === 'cria' && onUpdateBreedingConfig) {
      onUpdateBreedingConfig(breedingConfig);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Structured technical zones based on established swine zootechnical requirements
  const zones: TechnicalZoneSpec[] = [
    {
      id: 'zone_galpon_principal',
      name: orientation === 'cria' 
        ? 'Salas de Maternidad y Parideras' 
        : orientation === 'ceba' 
        ? 'Nave de Levante y Ceba (Corrales Colectivos)' 
        : 'Nave Central de Producción Integrada',
      category: 'produccion' as const,
      description: orientation === 'cria'
        ? `${breedingResult.farrowing.roomsCount} sala(s) con ${breedingResult.farrowing.totalPlaces} paridera(s) de ${breedingResult.farrowing.placeLength}m × ${breedingResult.farrowing.placeWidth}m (${breedingResult.farrowing.totalGrossArea} m² brutos totales) y franja térmica para lechones.`
        : orientation === 'ceba'
        ? `Corrales colectivos para lotes homogéneos (${calculationResult.pigsPerPen} cerdos por corral), con división de zona seca de descanso y zona húmeda de deyecciones.`
        : 'Distribución modular de salas separadas por etapas (maternidad, destete y ceba) con paredes divisorias lavables e independientes.',
      orientationSuitability: ['cria', 'ceba', 'ciclo_completo'] as ProductiveOrientation[],
      recommendedFloor: orientation === 'ceba' && growthConfig.housingSystem === 'cama_profunda'
        ? 'Cama profunda sobre base impermeable con sustrato vegetal absorbente (cascarilla/viruta, espesor 40-50 cm).'
        : orientation === 'cria'
        ? 'Piso higiénico, antideslizante y drenable en zona de cerda; zona seca cálida para lechones.'
        : 'Piso de concreto vaciado con estrías antideslizantes (pendiente 2.5% a 3%) o slats plásticos en zonas húmedas.',
      ventilationNotes: 'Orientación longitudinal Este-Oeste para mitigar radiación solar. Muros bajos (1.0m - 1.2m) con malla y cortinas regulables para ventilación natural.',
      waterDrainageNotes: 'Canaleta posterior de recolección de porcinaza con rejilla de separación y pendiente hacia fosa séptica/estercolero.'
    },
    {
      id: 'zone_gestacion_reproduccion',
      name: orientation === 'cria'
        ? `Nave de Gestación (${breedingResult.gestation.housing === 'grupal' ? 'Grupal' : 'Jaulas'})`
        : 'Área de Gestación y Cobertura',
      category: 'produccion' as const,
      description: orientation === 'cria'
        ? `${breedingResult.gestation.sowsCount} cerdas en ${breedingResult.gestation.unitsCount} ${breedingResult.gestation.housing === 'grupal' ? 'corral(es) grupal(es)' : 'jaulas'} (${breedingResult.gestation.pavilionLength}m × ${breedingResult.gestation.pavilionWidth}m). ${breedingResult.boars.enabled ? `Incluye ${breedingResult.boars.boarsCount} corral(es) de verraco de ${breedingResult.boars.areaPerPen} m² c/u.` : 'Sin verraco en predio.'}`
        : 'Alojamiento para cerdas reproductoras en gestación y verraco/área de inseminación artificial.',
      orientationSuitability: ['cria', 'ciclo_completo'] as ProductiveOrientation[],
      recommendedFloor: 'Piso sólido antideslizante de fácil lavado y drenaje adecuado, sin encharcamientos ni bordes peligrosos.',
      ventilationNotes: 'Excelente circulación de aire fresco para evitar estrés calórico durante la preñez.',
      waterDrainageNotes: 'Desagües directos a línea de tratamiento de efluentes, sin encharcamientos.'
    },
    {
      id: 'zone_precebo_destete',
      name: 'Área de Precebo / Destete',
      category: 'produccion' as const,
      description: 'Recepción de lechones destetados (6 a 25 kg). Demanda mayor control térmico y piso cálido/seco para evitar diarreas mecánicas.',
      orientationSuitability: ['cria', 'ciclo_completo'] as ProductiveOrientation[],
      recommendedFloor: 'Piso de listones plásticos (slats) o cama profunda sobre concreto.',
      ventilationNotes: 'Ventilación controlada sin corrientes de aire directo a nivel de los lechones.',
      waterDrainageNotes: 'Drenaje por gravedad hacia fosa exterior con desinfección periódica.'
    },
    {
      id: 'zone_bodega_alimento',
      name: 'Bodega de Alimento Concentrado y Medicamentos',
      category: 'almacen' as const,
      description: 'Instalación cerrada y techada para almacenar sacos de concentrado sobre estibas plásticas o de madera, preservando la calidad organoléptica y nutricional.',
      orientationSuitability: ['cria', 'ceba', 'ciclo_completo'] as ProductiveOrientation[],
      recommendedFloor: 'Piso de concreto impermeabilizado y pulido, elevado mínimo 15cm sobre el nivel del suelo circundante.',
      ventilationNotes: 'Ambiente seco y ventilado con celosías a prueba de roedores y pájaros.',
      waterDrainageNotes: 'Sin contacto con aguas residuales ni canales de evacuación del galpón.'
    },
    {
      id: 'zone_bioseguridad_filtro',
      name: 'Filtro Sanitario y Pediluvio de Entrada',
      category: 'sanidad_ambiental' as const,
      description: 'Punto de control de bioseguridad obligatorio en el acceso: vado/pediluvio con desinfectante, vestier de cambio de calzado y lavado de manos.',
      orientationSuitability: ['cria', 'ceba', 'ciclo_completo'] as ProductiveOrientation[],
      recommendedFloor: 'Pozo o batea en concreto con profundidad de 10-15cm para líquido desinfectante.',
      ventilationNotes: 'Espacio de transición entre zona sucia exterior y zona limpia de producción.',
      waterDrainageNotes: 'Válvula de desagüe para recambio semanal o bisemanal de la solución desinfectante.'
    },
    {
      id: 'zone_manejo_porcinaza',
      name: 'Sistema de Tratamiento de Efluentes / Estercolero',
      category: 'sanidad_ambiental' as const,
      description: 'Estructura impermeabilizada (estercolero, fosa de sedimentación o biodigestor) ubicada en la parte más baja del lote para fermentación de sólidos y biofertilizante.',
      orientationSuitability: ['cria', 'ceba', 'ciclo_completo'] as ProductiveOrientation[],
      recommendedFloor: 'Tanque impermeabilizado con concreto hidrófugo o geomembrana para evitar lixiviados a aguas subterráneas.',
      ventilationNotes: 'Ubicado a sotavento (a favor del viento hacia afuera) para evitar que los olores ingresen a las áreas habitadas o naves.',
      waterDrainageNotes: 'Tubería cerrada en PVC sanitario de 4 o 6 pulgadas desde las canaletas de los galpones.'
    }
  ].filter(z => z.orientationSuitability.includes(orientation));

  const activeZone = zones.find(z => z.id === selectedZoneId) || zones[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-purple-700 tracking-wider uppercase">Paso 03</span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Planificación Técnica de Instalaciones</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {orientation === 'cria' ? (
              <>
                Dimensionamiento técnico según criterios de bienestar porcino y el <strong>Manual de Construcciones Porcícolas</strong> para <span className="font-semibold text-purple-950 font-mono tabular-nums">{breedingConfig.sowsCount} cerdas en gestación · {breedingConfig.farrowingPlacesCount} parideras</span>.
              </>
            ) : (
              <>
                Dimensionamiento técnico según criterios de bienestar porcino y el <strong>Manual de Construcciones Porcícolas 2026</strong> para <span className="font-semibold text-purple-950 font-mono tabular-nums">{animalCount} cerdos</span>.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configuración técnica guardada</span>
            </div>
          )}
          {(orientation === 'ceba' || orientation === 'cria') && (
            <button
              type="button"
              onClick={handleAutoFill}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center gap-1.5"
              title="Rellenar opciones técnicas automáticamente con base en tu caracterización inicial"
            >
              <Wand2 className="w-4 h-4 text-purple-700" />
              <span>Autocompletar según caracterización</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Especificaciones</span>
          </button>
        </div>
      </div>

      {/* Auto-fill confirmation banner */}
      {autoFillSummary && (
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-950 space-y-2 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-purple-900">
              <Sparkles className="w-4 h-4 text-purple-700 shrink-0" />
              <span>Planificación completada automáticamente desde tu caracterización ({orientation === 'cria' ? 'Cría' : 'Levante / Ceba'})</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoFillSummary(null)}
              className="p-1 text-purple-500 hover:text-purple-800 rounded-md"
              aria-label="Cerrar resumen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-1 text-[11px] text-purple-900/90 list-disc list-inside">
            {autoFillSummary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="text-[11px] text-purple-700">
            Puedes ajustar manualmente cualquiera de estos valores antes de pasar al plano 2D.
          </p>
        </div>
      )}

      {/* TECHNICAL SURFACE CALCULATION SECTION FOR LEVANTE-CEBA */}
      {orientation === 'ceba' ? (
        <section className="bg-white rounded-3xl border border-purple-200 shadow-sm p-6 sm:p-8 space-y-6">
          
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-purple-100 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
                <Scale className="w-4 h-4" />
                <span>Cálculo Técnico de Superficie Libre</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                Etapa de Levante y Ceba
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                La <em>superficie libre de suelo</em> corresponde al área útil a libre disposición de los animales, sin computar comederos ni bebederos. El espacio mínimo calculado no se reduce para forzar la cabida dentro del lote.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Densidad Técnica Aplicada</span>
              <div className="text-2xl font-bold font-mono text-purple-950 tabular-nums">
                {calculationResult.appliedDensity} <span className="text-sm font-normal text-slate-600">{calculationResult.densityUnit}</span>
              </div>
            </div>
          </div>

          {/* User Selectors for Normative Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Weight Range Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                1. Rango de Peso Vivo del Lote <span className="text-purple-700">*</span>
              </label>
              <div className="space-y-2">
                {WEIGHT_RANGE_OPTIONS.map((opt) => {
                  const isSelected = growthConfig.weightRange === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleConfigChange({ weightRange: opt.id })}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-600/30'
                          : 'border-slate-200 hover:border-purple-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-950 font-mono">{opt.label}</span>
                          <span className="text-[11px] font-semibold text-purple-700">· {opt.stageName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.description}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                        isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Housing System Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                2. Sistema de Alojamiento y Tipo de Piso <span className="text-purple-700">*</span>
              </label>
              <div className="space-y-2">
                {HOUSING_SYSTEM_OPTIONS.map((sys) => {
                  const isSelected = growthConfig.housingSystem === sys.id;
                  return (
                    <div
                      key={sys.id}
                      onClick={() => handleConfigChange({ housingSystem: sys.id })}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-600/30'
                          : 'border-slate-200 hover:border-purple-200 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-purple-950 block">{sys.label}</span>
                        <p className="text-[11px] text-slate-600">{sys.description}</p>
                        <p className="text-[10px] text-slate-400 italic pt-0.5">{sys.technicalDetails}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 mt-0.5 ${
                        isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special warning if weight > 110 kg */}
              {growthConfig.weightRange === 'mas_de_110' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Criterio Técnico Abierto: Peso &gt; 110 kg</span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    Para animales por encima de 110 kg se establece una cota mínima abierta (<strong>&gt; 1,00 m²</strong> en piso convencional y <strong>&gt; 1,50 m²</strong> en cama profunda). Se aplica como recomendación técnica <strong>{calculationResult.appliedDensity} m²/cerdo</strong> (Manual de Construcciones Porcícolas 2026), pendiente de verificar el peso comercial exacto con el productor.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Ajustar densidad objetivo para ceba pesada (m²/cerdo):
                    </label>
                    <input
                      type="number"
                      min={growthConfig.housingSystem === 'cama_profunda' ? 1.51 : 1.01}
                      step="0.05"
                      value={growthConfig.customOver110Density || calculationResult.appliedDensity}
                      onChange={(e) => handleConfigChange({ customOver110Density: parseFloat(e.target.value) || undefined })}
                      className="w-32 px-2.5 py-1 text-xs bg-white border border-amber-300 rounded-lg text-amber-950 font-mono font-bold"
                    />
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* User-Configurable Operational Decisions */}
          <div className="pt-4 border-t border-purple-100 space-y-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-700" />
              <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                Decisiones Operativas del Productor
              </h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Estos valores responden a criterios de manejo, operabilidad y bioseguridad definidos por el productor.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-xs">
              
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cerdos por Corral
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={animalCount}
                    value={growthConfig.pigsPerPen}
                    onChange={(e) => handleConfigChange({ pigsPerPen: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono tabular-nums focus:ring-1 focus:ring-purple-600"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 pointer-events-none">cabezas</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Homogeneidad de lotes</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Ancho de Pasillo
                  </label>
                  <span className="text-[10px] text-purple-700 font-mono font-bold">{growthConfig.aisleWidth} m</span>
                </div>
                <div className="relative mb-1.5">
                  <input
                    type="number"
                    min="0.7"
                    max="3.0"
                    step="0.05"
                    value={growthConfig.aisleWidth}
                    onChange={(e) => handleConfigChange({ aisleWidth: parseFloat(e.target.value) || 1.2 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono tabular-nums focus:ring-1 focus:ring-purple-600"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 pointer-events-none">metros</span>
                </div>
                <div className="flex gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleConfigChange({ aisleWidth: 0.7 })}
                    className={`px-1.5 py-0.5 rounded border transition-colors ${
                      growthConfig.aisleWidth === 0.7 ? 'bg-purple-700 text-white border-purple-700 font-bold' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                    }`}
                    title="Pasillo de alimentación (Manual Porkcolombia 2026)"
                  >
                    0.7m Alim.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfigChange({ aisleWidth: 0.9 })}
                    className={`px-1.5 py-0.5 rounded border transition-colors ${
                      growthConfig.aisleWidth === 0.9 ? 'bg-purple-700 text-white border-purple-700 font-bold' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                    }`}
                    title="Acceso de animales"
                  >
                    0.9m Acceso
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfigChange({ aisleWidth: 1.2 })}
                    className={`px-1.5 py-0.5 rounded border transition-colors ${
                      growthConfig.aisleWidth === 1.2 ? 'bg-purple-700 text-white border-purple-700 font-bold' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                    }`}
                    title="Carretilla y operario"
                  >
                    1.2m Manejo
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Disposición de Filas
                </label>
                <select
                  value={growthConfig.penArrangement}
                  onChange={(e) => handleConfigChange({ penArrangement: e.target.value as 'two_rows' | 'single_row' })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-purple-600"
                >
                  <option value="two_rows">2 Filas (Pasillo Central)</option>
                  <option value="single_row">1 Fila Lateral</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Geometría de la nave</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Retiro Perimetral (Lote)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={growthConfig.setbackDistance}
                    onChange={(e) => handleConfigChange({ setbackDistance: parseFloat(e.target.value) || 2.0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono tabular-nums focus:ring-1 focus:ring-purple-600"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 pointer-events-none">metros</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Bioseguridad rec.: 5.0m a 10.0m</span>
              </div>

            </div>
          </div>

          {/* Results Summary Box with Strict Non-Reduction Principle */}
          <div className="pt-2 space-y-4">
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              
              <div className="p-4 rounded-xl bg-purple-100/70 border border-purple-200">
                <span className="text-[11px] text-purple-900 font-semibold block">Superficie Libre Mínima Total</span>
                <div className="text-xl font-bold font-mono text-purple-950 tabular-nums mt-1">
                  {calculationResult.netFreeFloorArea} m²
                </div>
                <span className="text-[10px] text-purple-800 mt-0.5 block">Criterio técnico irrenunciable</span>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                <span className="text-[11px] text-slate-500 block">Distribución de Corrales</span>
                <div className="text-xl font-bold font-mono text-purple-950 tabular-nums mt-1">
                  {calculationResult.pensCount} corrales
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {calculationResult.netAreaPerPen} m² útiles/corral
                </span>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                <span className="text-[11px] text-slate-500 block">Dimensiones de la Nave</span>
                <div className="text-xl font-bold font-mono text-purple-950 tabular-nums mt-1">
                  {calculationResult.pavilionLength}m × {calculationResult.pavilionWidth}m
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Área bruta: {calculationResult.pavilionGrossArea} m²
                </span>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                <span className="text-[11px] text-slate-500 block">Corral Individual</span>
                <div className="text-xl font-bold font-mono text-purple-950 tabular-nums mt-1">
                  {calculationResult.penWidth}m × {calculationResult.penLength}m
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Pasillo: {calculationResult.aisleWidth} m
                </span>
              </div>

            </div>

            {/* AUXILIARY ENGINEERING SYSTEMS SIZING (Water, Feed, Effluents, Lighting) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
              
              {/* Water System Card */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wider">
                  <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Agua y Bebederos</span>
                </div>
                <div className="space-y-1 text-slate-700 text-[11px]">
                  <div className="flex justify-between">
                    <span>Bebederos tipo chupo:</span>
                    <span className="font-mono font-bold text-blue-950">≥ {calculationResult.waterSystem.minDrinkersTotal} unidades</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Relación recomendada:</span>
                    <span>1 bebedero / 10 cerdos</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Caudal de aforo:</span>
                    <span className="font-mono font-semibold text-blue-900">{calculationResult.waterSystem.drinkerFlowRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Demanda diaria hato:</span>
                    <span className="font-mono text-slate-900">{calculationResult.waterSystem.dailyWaterDemandLiters} L/día</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200/60 pt-1 font-semibold text-blue-950">
                    <span>Tanque reserva (3 días):</span>
                    <span className="font-mono">{calculationResult.waterSystem.tankReserveLiters.toLocaleString()} L ({calculationResult.waterSystem.tankReserveM3} m³)</span>
                  </div>
                </div>
              </div>

              {/* Feed Storage Card */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs uppercase tracking-wider">
                  <Package className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Bodega de Alimento</span>
                </div>
                <div className="space-y-1 text-slate-700 text-[11px]">
                  <div className="flex justify-between">
                    <span>Consumo promedio:</span>
                    <span className="font-mono font-semibold text-purple-950">{calculationResult.feedSystem.dailyIntakePerPigKg} kg/cerdo/d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock seguridad (15 d):</span>
                    <span className="font-mono font-bold text-purple-950">{calculationResult.feedSystem.totalStockTons} ton</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Total sacos (40 kg):</span>
                    <span>~{Math.ceil(calculationResult.feedSystem.totalStockKg / 40)} bultos</span>
                  </div>
                  <div className="flex justify-between border-t border-purple-200/60 pt-1 font-semibold text-purple-950">
                    <span>Área bodega calculada:</span>
                    <span className="font-mono">{calculationResult.feedSystem.requiredStorageAreaM2} m²</span>
                  </div>
                  <span className="text-[10px] text-purple-700 block">Sobre estibas con pasillo perimetral</span>
                </div>
              </div>

              {/* Effluent & Manure Card */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Manejo de Efluentes</span>
                </div>
                <div className="space-y-1 text-slate-700 text-[11px]">
                  <div className="flex justify-between">
                    <span>Porcinaza estimada:</span>
                    <span className="font-mono font-semibold text-amber-950">{calculationResult.effluentSystem.dailyEffluentPerPigLiters} L/cerdo/d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Período de digestión:</span>
                    <span className="font-mono text-amber-900">{calculationResult.effluentSystem.retentionDays} días</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volumen fosa/estercolero:</span>
                    <span className="font-mono font-bold text-amber-950">{calculationResult.effluentSystem.pitVolumeM3} m³</span>
                  </div>
                  <div className="flex justify-between border-t border-amber-200/60 pt-1 font-semibold text-amber-950">
                    <span>Espejo superficial fosa:</span>
                    <span className="font-mono">{calculationResult.effluentSystem.pitSurfaceM2} m²</span>
                  </div>
                  <span className="text-[10px] text-amber-700 block">Impermeabilizada para control de lixiviados</span>
                </div>
              </div>

              {/* Lighting & Welfare Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Iluminación y Bienestar</span>
                </div>
                <div className="space-y-1 text-slate-700 text-[11px]">
                  <div className="flex justify-between">
                    <span>Fotoperiodo mínimo:</span>
                    <span className="font-mono font-bold text-emerald-950">≥ {calculationResult.minLightingHours} h/día</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Criterio de manejo:</span>
                    <span>Bienestar animal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zonificación interna:</span>
                    <span className="text-emerald-900 font-semibold">Seca / Húmeda</span>
                  </div>
                  <div className="border-t border-emerald-200/60 pt-1 text-[10px] text-emerald-800 leading-tight">
                    {growthConfig.housingSystem === 'cama_profunda'
                      ? 'Cama profunda seca y aireada (40–50 cm de sustrato absorbente) para garantizar reposo seco simultáneo.'
                      : 'Pisos ranurados o estrías antideslizantes con pendiente 2.5% para garantizar reposo seco simultáneo.'}
                  </div>
                </div>
              </div>

            </div>

            {/* Technical Reference & Classification Citation Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-500">Clasificación:</span>
                <span className="font-semibold text-slate-800">{calculationResult.normativeClassification}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-500">Fuente Técnica:</span>
                <span className="font-semibold text-purple-900">{calculationResult.normativeSource}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-500">Valor de densidad aplicado:</span>
                <span className="font-mono font-bold text-slate-900">{calculationResult.appliedDensity} {calculationResult.densityUnit}</span>
              </div>
            </div>

            {/* Spatial Feasibility Assessment & Overlap Diagnostic */}
            <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
              calculationResult.validation.isViable
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/90 border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {calculationResult.validation.isViable ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Distribución Espacial Viable en el Lote ({terrain.length}m × {terrain.width}m)</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-5 h-5 text-rose-600" />
                    <span>Atención: Distribución No Viable para el Tamaño Actual del Terreno</span>
                  </>
                )}
              </div>

              <p className="text-xs leading-relaxed">
                {calculationResult.validation.feasibilityNotice}
              </p>

              {/* Boundary Violations list */}
              {calculationResult.validation.boundaryViolations.length > 0 && (
                <div className="pt-1 space-y-1">
                  <span className="font-bold block text-[11px] uppercase tracking-wider">Desbordes detectados:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {calculationResult.validation.boundaryViolations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Overlaps list */}
              {calculationResult.validation.overlaps.length > 0 && (
                <div className="pt-1 space-y-1">
                  <span className="font-bold block text-[11px] uppercase tracking-wider">Superposiciones entre instalaciones:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {calculationResult.validation.overlaps.map((o, i) => (
                      <li key={i}>{o.description}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!calculationResult.validation.isViable && (
                <p className="text-[11px] font-semibold text-rose-800 pt-1">
                  ℹ️ Principio de bienestar animal activo: No se compacta ni reduce la superficie libre mínima ({calculationResult.netFreeFloorArea} m²) para forzar que el diseño quepa en un lote insuficiente. Se requiere ampliar las dimensiones del terreno en Caracterización o usar el ajuste asistido en el plano 2D.
                </p>
              )}
            </div>

            {/* Technical & Construction Criteria Checklist */}
            <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/70 text-xs space-y-2.5">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4 text-purple-700" />
                <span>Criterios Técnicos Complementarios de Obra</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Antes de iniciar obras de construcción, verifica los siguientes aspectos de bienestar animal, bioseguridad y manejo ambiental del predio:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {COLOMBIAN_REGULATORY_FRAMEWORK.map((reg) => (
                  <div key={reg.code} className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-[11px] text-purple-950">{reg.code}</span>
                      <span className="text-[9px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">{reg.authority}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-800 block line-clamp-1">{reg.title}</span>
                    <p className="text-[10px] text-slate-500 leading-tight">{reg.scope}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </section>
      ) : orientation === 'cria' ? (
        <BreedingPlanningSection
          terrain={terrain}
          config={breedingConfig}
          result={breedingResult}
          onConfigChange={handleBreedingConfigChange}
        />
      ) : (
        <section className="p-5 rounded-2xl bg-purple-50 border border-purple-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-purple-950">
            <Info className="w-4 h-4 text-purple-700" />
            <span>Orientación productiva actual: Ciclo Completo</span>
          </div>
          <p className="text-slate-600">
            El motor técnico de dimensionamiento está activo para <strong>Levante y Ceba</strong> y <strong>Cría</strong>. Para ciclo completo integrado se recomienda planificar las etapas de forma modular.
          </p>
        </section>
      )}

      {/* Foundational Bioclimatic & Zootechnical Principles */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-wider">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Orientación Solar (E-O)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            El eje más largo del galpón debe alinearse de <strong>Este a Oeste</strong> en climas tropicales o templados. 
            Esto evita que el sol incida de frente sobre los cerdos en las horas más calurosas del día.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-wider">
            <Wind className="w-4 h-4 text-cyan-600" />
            <span>Ventilación Cruzada</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Aprovechar los vientos dominantes para renovación constante de aire sin generar corrientes frías directas al suelo. 
            Muros laterales a 1.0 m de altura con aleros de mínimo 80 cm para lluvia y sombra.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-wider">
            <Droplets className="w-4 h-4 text-purple-600" />
            <span>Pendiente y Drenaje Sanitario</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pisos de corrales con <strong>pendiente continua del 2% al 3%</strong> orientada hacia el canal recolector posterior. 
            Permite lavado rápido y menor gasto de agua para mantener camas limpias y secas.
          </p>
        </div>
      </section>

      {/* Interactive Zone Explorer */}
      <section className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-purple-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Módulos Funcionales de la Granja</h2>
              <p className="text-xs text-slate-500">Selecciona un área para revisar los criterios técnicos recomendados y registrar tus especificaciones.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
            {zones.length} módulos requeridos
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
          
          {/* Zone Selector Sidebar */}
          <div className="lg:col-span-5 border-r border-purple-100 p-4 space-y-2 bg-purple-50/30">
            {zones.map((z, idx) => {
              const isSelected = z.id === activeZone.id;
              return (
                <button
                  key={z.id}
                  onClick={() => setSelectedZoneId(z.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-white border-purple-400 text-purple-950 shadow-sm ring-1 ring-purple-600/20'
                      : 'bg-white/60 hover:bg-white border-slate-200/80 text-slate-700'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-bold truncate">{z.name}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{z.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Zone Detail & Technical Customization */}
          <div className="lg:col-span-7 p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider bg-purple-100 px-2 py-0.5 rounded-md">
                  {activeZone.category === 'produccion' ? 'Área Productiva' : activeZone.category === 'almacen' ? 'Soporte y Almacenamiento' : 'Bioseguridad y Ambiente'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-purple-950">{activeZone.name}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeZone.description}</p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1">
                <span className="text-[11px] font-bold text-purple-900 block">Tipo de Piso Recomendado:</span>
                <p className="text-xs text-slate-700">{activeZone.recommendedFloor}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1">
                <span className="text-[11px] font-bold text-purple-900 block">Ventilación y Clima:</span>
                <p className="text-xs text-slate-700">{activeZone.ventilationNotes}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1">
                <span className="text-[11px] font-bold text-purple-900 block">Drenaje y Evacuación:</span>
                <p className="text-xs text-slate-700">{activeZone.waterDrainageNotes}</p>
              </div>
            </div>

            {/* Custom Producer Note for this Area */}
            <div className="pt-2 border-t border-purple-50">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tus Especificaciones / Notas Particulares para este Módulo
              </label>
              <textarea
                rows={2}
                value={technicalNotes[activeZone.id] || ''}
                onChange={(e) => handleNoteChange(activeZone.id, e.target.value)}
                placeholder={`Anota dimensiones previstas, marcas de comederos, materiales locales a usar en ${activeZone.name}...`}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Estas notas se conservan en tu proyecto y se reflejarán en el plano esquemático y el presupuesto.
              </span>
            </div>

          </div>

        </div>
      </section>

      {/* Navigation Footer */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 transition-colors"
        >
          Guardar Cambios
        </button>
        <button
          type="button"
          onClick={() => {
            handleSave();
            onNavigateToNext();
          }}
          className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-2"
        >
          <span>Ir a Diseño Esquemático 2D</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
