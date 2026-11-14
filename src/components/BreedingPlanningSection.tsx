import React from 'react';
import {
  BreedingCalculationResult,
  BreedingGestationHousing,
  BreedingSowCategory,
  BreedingUserConfig
} from '../types/breeding';
import {
  BOAR_PEN_REFERENCE,
  BREEDING_AISLE_REFERENCE,
  BREEDING_WATER_REFERENCE,
  FARROWING_REFERENCE,
  GESTATION_CRATE_REFERENCE
} from '../constants/breedingMatrix';
import { COLOMBIAN_REGULATORY_FRAMEWORK } from '../constants/growthFinishMatrix';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  FileText,
  Flame,
  Info,
  Layers,
  Lightbulb,
  Scale,
  Sliders,
  Users
} from 'lucide-react';

interface BreedingPlanningSectionProps {
  terrain: { length: number; width: number; totalArea: number };
  config: BreedingUserConfig;
  result: BreedingCalculationResult;
  onConfigChange: (changes: Partial<BreedingUserConfig>) => void;
}

const classificationBadgeClass = (classification: string): string => {
  if (classification.startsWith('Criterio técnico')) {
    return 'bg-purple-100 text-purple-900 border-purple-300';
  }
  if (classification.startsWith('Criterio funcional')) {
    return 'bg-indigo-50 text-indigo-900 border-indigo-200';
  }
  if (classification.includes('Recomendación')) {
    return 'bg-amber-50 text-amber-900 border-amber-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export const BreedingPlanningSection: React.FC<BreedingPlanningSectionProps> = ({
  terrain,
  config,
  result,
  onConfigChange
}) => {
  return (
    <section className="bg-white rounded-3xl border border-purple-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-purple-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
            <Scale className="w-4 h-4" />
            <span>Planificación Técnica Especializada · Cría Porcina</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            Gestación, Maternidad y Reproductores (Manual de Construcciones Porcícolas)
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Configura explícitamente el pie de cría (cerdas en gestación, plazas de maternidad y verracos). Cada parámetro indica si corresponde a <strong>criterio técnico de bienestar</strong>, <strong>recomendación técnica</strong> o <strong>parámetro configurable</strong>.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Área Productiva Bruta
          </span>
          <div className="text-2xl font-bold font-mono text-purple-950 tabular-nums">
            {result.totalProductiveGrossArea} <span className="text-sm font-normal text-slate-600">m²</span>
          </div>
        </div>
      </div>

      {/* 1. Explicit Reproductive Population */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-700" />
          <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
            1. Población Reproductiva y Capacidad de Salas
          </h3>
        </div>
        <p className="text-[11px] text-slate-500">
          El campo general de animales en Caracterización es referencial. Registra aquí las cantidades exactas por etapa reproductiva para dimensionar las naves de cría sin mezclar categorías.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Cerdas en Gestación <span className="text-purple-700">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                value={config.sowsCount}
                onChange={(e) =>
                  onConfigChange({ sowsCount: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono tabular-nums focus:ring-1 focus:ring-purple-600"
              />
              <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 pointer-events-none">
                cerdas
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Pie de cría alojado en el módulo de gestación.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Plazas / Parideras Totales <span className="text-purple-700">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                value={config.farrowingPlacesCount}
                onChange={(e) =>
                  onConfigChange({
                    farrowingPlacesCount: Math.max(0, parseInt(e.target.value, 10) || 0)
                  })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono tabular-nums focus:ring-1 focus:ring-purple-600"
              />
              <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 pointer-events-none">
                plazas
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Cunas / jaulas parideras para lactancia.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Salas de Maternidad
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={Math.max(1, config.farrowingPlacesCount)}
                step="1"
                value={config.farrowingRoomsCount}
                onChange={(e) =>
                  onConfigChange({
                    farrowingRoomsCount: Math.max(1, parseInt(e.target.value, 10) || 1)
                  })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono tabular-nums focus:ring-1 focus:ring-purple-600"
              />
              <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 pointer-events-none">
                salas
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Para manejo sanitario todo dentro / todo fuera (~{result.farrowing.placesPerRoom} plazas/sala).
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Verracos / Receladores
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                value={config.boarsCount}
                onChange={(e) =>
                  onConfigChange({ boarsCount: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono tabular-nums focus:ring-1 focus:ring-purple-600"
              />
              <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 pointer-events-none">
                machos
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Ingresa <strong>0</strong> si trabajas 100% con inseminación externa (sin corral de verraco).
            </span>
          </div>
        </div>
      </div>

      {/* 2. Gestation System & Farrowing Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gestation Block */}
        <div className="p-4 sm:p-5 rounded-2xl border border-purple-100 bg-purple-50/30 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                2. Sistema de Alojamiento en Gestación
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Selecciona entre corrales grupales (prioritario por bienestar) o jaulas individuales de referencia.
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold shrink-0 ${classificationBadgeClass(
                result.gestation.classification
              )}`}
            >
              {result.gestation.classification}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(
              [
                {
                  id: 'grupal' as BreedingGestationHousing,
                  title: 'Gestación Grupal',
                  subtitle: 'Superficie libre recomendada por cerda según tamaño de grupo.'
                },
                {
                  id: 'jaula' as BreedingGestationHousing,
                  title: 'Jaula Individual',
                  subtitle: 'Referencia técnica de diseño (2,10–2,40 × 0,60–0,70 m).'
                }
              ] as const
            ).map((opt) => {
              const selected = config.gestationHousing === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onConfigChange({ gestationHousing: opt.id })}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selected
                      ? 'border-purple-600 bg-white shadow-xs ring-1 ring-purple-600/30'
                      : 'border-slate-200 bg-white/70 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950">{opt.title}</span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        selected ? 'border-purple-600 bg-purple-600' : 'border-slate-300'
                      }`}
                    >
                      {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{opt.subtitle}</p>
                </button>
              );
            })}
          </div>

          {/* Conditional Fields: Grupal vs Jaula */}
          {config.gestationHousing === 'grupal' ? (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Categoría de la Cerda
                  </label>
                  <select
                    value={config.gestationSowCategory}
                    onChange={(e) =>
                      onConfigChange({
                        gestationSowCategory: e.target.value as BreedingSowCategory
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-purple-600"
                  >
                    <option value="adulta">Cerda Adulta (2,05 – 2,48 m²/cerda)</option>
                    <option value="joven">Cerda Joven / Reemplazo (1,49 – 1,81 m²/cerda)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Las cerdas adultas requieren mayor superficie libre por animal.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cerdas por Grupo (Corral)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max={Math.max(2, config.sowsCount || 60)}
                    value={config.gestationGroupSize}
                    onChange={(e) =>
                      onConfigChange({
                        gestationGroupSize: Math.max(1, parseInt(e.target.value, 10) || 6)
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono tabular-nums focus:ring-1 focus:ring-purple-600"
                  />
                  <span className="text-[10px] text-purple-800 font-medium mt-1 block">
                    Banda aplicada: {result.gestation.groupBandLabel} ({result.gestation.appliedAreaPerSow} m²/cerda)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{GESTATION_CRATE_REFERENCE.warningNote}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Largo de Jaula (m)
                  </label>
                  <input
                    type="number"
                    min="1.90"
                    max="2.60"
                    step="0.05"
                    value={config.gestationCrateLength}
                    onChange={(e) =>
                      onConfigChange({
                        gestationCrateLength: parseFloat(e.target.value) || 2.2
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Ref: 2,10 – 2,40 m</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ancho de Jaula (m)
                  </label>
                  <input
                    type="number"
                    min="0.55"
                    max="0.90"
                    step="0.05"
                    value={config.gestationCrateWidth}
                    onChange={(e) =>
                      onConfigChange({
                        gestationCrateWidth: parseFloat(e.target.value) || 0.65
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Ref: 0,60 – 0,70 m</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Farrowing + Boar + Circulation Block */}
        <div className="p-4 sm:p-5 rounded-2xl border border-purple-100 bg-purple-50/30 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                3. Maternidad, Verraco y Circulación
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dimensiones configurables basadas en criterios zootécnicos y manuales de ingeniería porcina.
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold shrink-0 ${classificationBadgeClass(
                result.farrowing.classification
              )}`}
            >
              {result.farrowing.classification}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Largo de Paridera (m)
              </label>
              <input
                type="number"
                min="2.00"
                max="2.80"
                step="0.05"
                value={config.farrowingPlaceLength}
                onChange={(e) =>
                  onConfigChange({
                    farrowingPlaceLength: parseFloat(e.target.value) || FARROWING_REFERENCE.defaultLengthM
                  })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Ref Manual 2026: 2,20 – 2,40 m
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ancho Total Paridera (m)
              </label>
              <input
                type="number"
                min="1.50"
                max="2.80"
                step="0.05"
                value={config.farrowingPlaceWidth}
                onChange={(e) =>
                  onConfigChange({
                    farrowingPlaceWidth:
                      parseFloat(e.target.value) || FARROWING_REFERENCE.recommendedTotalWidthM
                  })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Ref 2026: 0,70 m jaula + 2×0,65 m lechoneras = 2,00 m
              </span>
            </div>
          </div>

          {/* Boar Area (only if boarsCount > 0) + Aisle + Setback */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-100 text-xs">
            {config.boarsCount > 0 ? (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Área Corral Verraco (m²)
                </label>
                <input
                  type="number"
                  min={BOAR_PEN_REFERENCE.normativeMinAreaM2}
                  max="16"
                  step="0.5"
                  value={config.boarPenArea}
                  onChange={(e) =>
                    onConfigChange({
                      boarPenArea: Math.max(
                        BOAR_PEN_REFERENCE.normativeMinAreaM2,
                        parseFloat(e.target.value) || BOAR_PEN_REFERENCE.recommendedAreaM2
                      )
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Mín. técnico ≥ 6 m² (ancho ≥ 2,20 m); rec. ≥ 7 m².
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[10px] text-slate-500 flex items-center">
                Corral de verraco omitido (0 verracos registrados).
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Pasillo (m)</label>
                <span className="text-[10px] text-purple-700 font-mono font-bold">
                  {config.aisleWidth} m
                </span>
              </div>
              <input
                type="number"
                min="0.7"
                max="2.5"
                step="0.05"
                value={config.aisleWidth}
                onChange={(e) =>
                  onConfigChange({ aisleWidth: parseFloat(e.target.value) || 0.9 })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
              <div className="flex gap-1 mt-1 text-[10px]">
                {[
                  { val: 0.7, label: '0.7 Alim.' },
                  { val: 0.9, label: '0.9 Cerdas' },
                  { val: 1.2, label: '1.2 Manejo' }
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => onConfigChange({ aisleWidth: preset.val })}
                    className={`px-1.5 py-0.5 rounded border ${
                      config.aisleWidth === preset.val
                        ? 'bg-purple-700 text-white border-purple-700 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Retiro Perimetral (m)
              </label>
              <input
                type="number"
                min="1.0"
                max="15.0"
                step="0.5"
                value={config.setbackDistance}
                onChange={(e) =>
                  onConfigChange({ setbackDistance: parseFloat(e.target.value) || 2.5 })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Franja libre dentro del lindero.
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-purple-100 text-[10px] text-slate-600 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
            <span>{result.farrowing.note}</span>
          </div>
        </div>
      </div>

      {/* 4. Preliminary Calculation KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-purple-100/70 border border-purple-200">
          <span className="text-[11px] text-purple-900 font-semibold block">
            Nave de Gestación
          </span>
          <div className="text-xl font-bold font-mono text-purple-950 tabular-nums mt-1">
            {result.gestation.pavilionLength}m × {result.gestation.pavilionWidth}m
          </div>
          <span className="text-[10px] text-purple-800 mt-0.5 block">
            {result.gestation.netArea} m² útiles · {result.gestation.pavilionGrossArea} m² brutos
          </span>
        </div>

        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
          <span className="text-[11px] text-slate-500 block">
            Maternidad ({result.farrowing.roomsCount} sala{result.farrowing.roomsCount > 1 ? 's' : ''})
          </span>
          <div className="text-xl font-bold font-mono text-purple-950 tabular-nums mt-1">
            {result.farrowing.roomLength}m × {result.farrowing.roomWidth}m
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            c/sala · {result.farrowing.totalGrossArea} m² brutos totales
          </span>
        </div>

        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
          <span className="text-[11px] text-slate-500 block">Área de Reproductores</span>
          <div className="text-xl font-bold font-mono text-purple-950 tabular-nums mt-1">
            {result.boars.enabled ? `${result.boars.totalGrossArea} m²` : 'No aplica'}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {result.boars.enabled
              ? `${result.boars.boarsCount} corral(es) de ${result.boars.penWidth}m × ${result.boars.penLength}m`
              : '0 verracos (IA externa)'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
          <span className="text-[11px] text-slate-500 block">Ocupación Total en Lote</span>
          <div className="text-xl font-bold font-mono text-purple-950 tabular-nums mt-1">
            {result.totalOccupiedFootprintArea} m²
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Productiva + anexos sanitarios
          </span>
        </div>
      </div>

      {/* 5. Engineering & Welfare Cards (Water, Lighting, Heating) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wider">
            <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Agua y Aforo (Cría)</span>
          </div>
          <div className="space-y-1 text-slate-700 text-[11px]">
            <div className="flex justify-between">
              <span>Gestantes (18 L/día):</span>
              <span className="font-mono font-semibold text-blue-950">
                {result.waterSystem.gestationDailyLiters} L/día
              </span>
            </div>
            <div className="flex justify-between">
              <span>Lactantes (22 L/día):</span>
              <span className="font-mono font-semibold text-blue-950">
                {result.waterSystem.lactationDailyLiters} L/día
              </span>
            </div>
            {result.boars.enabled && (
              <div className="flex justify-between">
                <span>Verracos (16 L/día):</span>
                <span className="font-mono font-semibold text-blue-950">
                  {result.waterSystem.boarDailyLiters} L/día
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Aforo recomendado chupo:</span>
              <span className="font-mono font-bold text-blue-900">
                {result.waterSystem.drinkerFlowRate}
              </span>
            </div>
            <div className="flex justify-between border-t border-blue-200/60 pt-1 font-semibold text-blue-950">
              <span>Tanque (3d + 20%):</span>
              <span className="font-mono">
                {result.waterSystem.tankReserveLiters.toLocaleString()} L ({result.waterSystem.tankReserveM3} m³)
              </span>
            </div>
            <span className="text-[10px] text-blue-800 block">
              Lechón lactante referencia: {BREEDING_WATER_REFERENCE.pigletNursingLitersPerDay} L/día.
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Iluminación y Pasillos</span>
          </div>
          <div className="space-y-1 text-slate-700 text-[11px]">
            <div className="flex justify-between">
              <span>Fotoperiodo mínimo:</span>
              <span className="font-mono font-bold text-emerald-950">
                ≥ {result.lightingHoursMin} h/día
              </span>
            </div>
            <div className="flex justify-between text-slate-500 text-[10px]">
              <span>Criterio de manejo:</span>
              <span>Bienestar porcino</span>
            </div>
            <div className="flex justify-between">
              <span>Pasillo configurado:</span>
              <span className="font-mono font-semibold text-emerald-950">
                {result.gestation.aisleWidth} m
              </span>
            </div>
            <div className="border-t border-emerald-200/60 pt-1 text-[10px] text-emerald-800 leading-tight">
              {BREEDING_AISLE_REFERENCE.note}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Calefacción de Lechones</span>
          </div>
          <p className="text-[11px] text-amber-950 leading-relaxed">
            {result.pigletHeatingNote}
          </p>
          <div className="border-t border-amber-200/60 pt-1 text-[10px] text-amber-800 flex items-center justify-between">
            <span>Clasificación: Criterio técnico de bienestar</span>
            <span className="font-semibold">Microclima neonatal</span>
          </div>
        </div>
      </div>

      {/* 6. Traceability Matrix (Sources & Classifications) */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-purple-700" />
          <span>Trazabilidad de Parámetros, Fuentes y Clasificación</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          {result.normativeNotes.map((item) => (
            <div
              key={item.component}
              className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between gap-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900">{item.component}</span>
                <span className="font-mono font-semibold text-purple-950">{item.value}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded border text-[9.5px] font-semibold ${classificationBadgeClass(
                    item.classification
                  )}`}
                >
                  {item.classification}
                </span>
                <span className="text-[10px] text-slate-500">{item.source}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Spatial Viability & Overlap Diagnostics */}
      <div
        className={`p-4 rounded-2xl border text-xs space-y-2 ${
          result.validation.isViable
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : !result.validation.hasValidTerrain || result.pendingInputs.length > 0
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-rose-50/90 border-rose-300 text-rose-950'
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          {result.validation.isViable ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Distribución Espacial de Cría Viable ({terrain.length}m × {terrain.width}m)
              </span>
            </>
          ) : !result.validation.hasValidTerrain || result.pendingInputs.length > 0 ? (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Validación Espacial Pendiente de Datos</span>
            </>
          ) : (
            <>
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Atención: Distribución No Viable para el Tamaño Actual del Terreno</span>
            </>
          )}
        </div>

        <p className="text-xs leading-relaxed">{result.validation.feasibilityNotice}</p>

        {result.pendingInputs.length > 0 && (
          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
            {result.pendingInputs.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        )}

        {result.validation.boundaryViolations.length > 0 && (
          <div className="pt-1 space-y-1">
            <span className="font-bold block text-[11px] uppercase tracking-wider">
              Desbordes detectados:
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {result.validation.boundaryViolations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        {result.validation.overlaps.length > 0 && (
          <div className="pt-1 space-y-1">
            <span className="font-bold block text-[11px] uppercase tracking-wider">
              Superposiciones entre instalaciones:
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {result.validation.overlaps.map((o, i) => (
                <li key={i}>{o.description}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Technical Checklist */}
      <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/70 text-xs space-y-2.5">
        <div className="flex items-center gap-2 text-purple-950 font-bold text-xs uppercase tracking-wider">
          <FileText className="w-4 h-4 text-purple-700" />
          <span>Criterios Técnicos Complementarios de Obra</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {COLOMBIAN_REGULATORY_FRAMEWORK.map((reg) => (
            <div key={reg.code} className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-[11px] text-purple-950">{reg.code}</span>
                <span className="text-[9px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                  {reg.authority}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-800 block line-clamp-1">
                {reg.title}
              </span>
              <p className="text-[10px] text-slate-500 leading-tight">{reg.scope}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
