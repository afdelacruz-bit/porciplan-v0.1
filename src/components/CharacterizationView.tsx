import React, { useState, useEffect } from 'react';
import {
  MaterialConditionStatus,
  MaterialInventoryEntry,
  ProductiveOrientation,
  ProjectCharacterization,
  TopographyType,
  WaterSourceType
} from '../types/project';
import { MATERIAL_OPTIONS } from '../services/storage';
import { 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Compass, 
  DollarSign, 
  Info,
  Check,
  ArrowRight,
  Plus,
  Trash2,
  PackageCheck
} from 'lucide-react';

interface CharacterizationViewProps {
  characterization: ProjectCharacterization;
  onSave: (updated: ProjectCharacterization) => void;
  onNavigateToNext: () => void;
}

export const CharacterizationView: React.FC<CharacterizationViewProps> = ({
  characterization,
  onSave,
  onNavigateToNext
}) => {
  const [formData, setFormData] = useState<ProjectCharacterization>(characterization);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'terreno' | 'recursos'>('general');

  // Keep form data in sync if active project changes
  useEffect(() => {
    setFormData(characterization);
    setErrors({});
  }, [characterization.id]);

  // Dynamic area calculation
  const handleDimensionChange = (field: 'length' | 'width', val: number) => {
    const num = Math.max(0, val || 0);
    const newTerrain = {
      ...formData.terrain,
      [field]: num,
      totalArea: field === 'length' ? num * formData.terrain.width : formData.terrain.length * num
    };
    setFormData({
      ...formData,
      terrain: newTerrain
    });
  };

  const handleMaterialToggle = (materialId: string) => {
    const current = [...formData.availableMaterials];
    const index = current.indexOf(materialId);
    const existingDetails = [...(formData.materialDetails || [])];

    if (index >= 0) {
      current.splice(index, 1);
      // Keep recoverable_infra entries intact; remove unedited checked material detail if unchecking
      const filtered = existingDetails.filter(
        (d) => !(d.sourceKind === 'predio_zona' && d.materialId === materialId)
      );
      setFormData({
        ...formData,
        availableMaterials: current,
        materialDetails: filtered
      });
    } else {
      current.push(materialId);
      const opt = MATERIAL_OPTIONS.find((m) => m.id === materialId);
      const alreadyHas = existingDetails.some(
        (d) => d.sourceKind === 'predio_zona' && d.materialId === materialId
      );
      if (!alreadyHas && opt) {
        existingDetails.push({
          id: `mat_${materialId}_${Date.now()}`,
          materialId,
          label: opt.label.split('(')[0].trim(),
          sourceKind: 'predio_zona',
          availableQuantity: undefined,
          unit: materialId === 'malla_eslabonada' ? 'ml' : 'm²',
          usableCondition: 'pendiente_verificar',
          intendedUse: '',
          purchaseOrTransportCost: undefined
        });
      }
      setFormData({
        ...formData,
        availableMaterials: current,
        materialDetails: existingDetails
      });
    }
  };

  const upsertMaterialDetail = (
    entryId: string,
    changes: Partial<MaterialInventoryEntry>
  ) => {
    const currentDetails = [...(formData.materialDetails || [])];
    const idx = currentDetails.findIndex((d) => d.id === entryId);
    if (idx >= 0) {
      currentDetails[idx] = { ...currentDetails[idx], ...changes };
    }
    setFormData({ ...formData, materialDetails: currentDetails });
  };

  const addCustomMaterialDetail = (sourceKind: 'predio_zona' | 'recuperable_infra') => {
    const newEntry: MaterialInventoryEntry = {
      id: `mat_${sourceKind}_${Date.now()}`,
      materialId: sourceKind === 'recuperable_infra' ? 'recuperable' : 'otro',
      label: sourceKind === 'recuperable_infra' ? '' : '',
      sourceKind,
      availableQuantity: undefined,
      unit: 'm²',
      usableCondition: 'pendiente_verificar',
      intendedUse: '',
      purchaseOrTransportCost: undefined
    };
    setFormData({
      ...formData,
      materialDetails: [...(formData.materialDetails || []), newEntry]
    });
  };

  const removeMaterialDetail = (entryId: string) => {
    setFormData({
      ...formData,
      materialDetails: (formData.materialDetails || []).filter((d) => d.id !== entryId)
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del proyecto es obligatorio.';
    }

    if (!formData.orientation) {
      newErrors.orientation = 'Debes seleccionar una orientación productiva.';
    }

    if (!formData.animalCount || formData.animalCount <= 0) {
      newErrors.animalCount = 'Indica una cantidad de animales mayor a cero.';
    }

    if (!formData.terrain.length || formData.terrain.length <= 0) {
      newErrors.length = 'El largo del terreno debe ser mayor a cero.';
    }

    if (!formData.terrain.width || formData.terrain.width <= 0) {
      newErrors.width = 'El ancho del terreno debe ser mayor a cero.';
    }

    if (formData.availableBudget < 0) {
      newErrors.budget = 'El presupuesto no puede ser un número negativo.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const orientationCards: Array<{
    id: ProductiveOrientation;
    title: string;
    subtitle: string;
    description: string;
    badge: string;
  }> = [
    {
      id: 'ceba',
      title: 'Levante / Ceba (Engorde)',
      subtitle: 'Etapa de crecimiento y acabado',
      description: 'Ideal para productores que compran lechones destetados (20-25 kg) y los llevan a peso final de beneficio (100-115 kg). Requiere corrales grupales uniformes y alta eficiencia en comederos.',
      badge: 'Menor complejidad técnica'
    },
    {
      id: 'cria',
      title: 'Cría (Reproducción)',
      subtitle: 'Producción de lechones destetados',
      description: 'Enfocada en hembras gestantes, salas de maternidad y parideras seguras para lechones hasta el destete. Demanda estricto control de temperatura en lechoneras y bioseguridad reforzada.',
      badge: 'Mayor exigencia de manejo'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header section with status */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-purple-700 tracking-wider uppercase">Paso 02</span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Caracterización de la Explotación</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registra los parámetros base de tu predio, orientación productiva, recursos y presupuesto disponible.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardado en almacenamiento local</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Información</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation for comfortable multi-step registration */}
      <div className="flex items-center gap-2 p-1 bg-purple-100/60 rounded-xl border border-purple-200/60 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex-1 min-w-[140px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center ${
            activeTab === 'general'
              ? 'bg-white text-purple-950 shadow-xs'
              : 'text-slate-600 hover:text-purple-900'
          }`}
        >
          1. General
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('terreno')}
          className={`flex-1 min-w-[140px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center ${
            activeTab === 'terreno'
              ? 'bg-white text-purple-950 shadow-xs'
              : 'text-slate-600 hover:text-purple-900'
          }`}
        >
          2. Terreno e Infraestructura
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recursos')}
          className={`flex-1 min-w-[140px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center ${
            activeTab === 'recursos'
              ? 'bg-white text-purple-950 shadow-xs'
              : 'text-slate-600 hover:text-purple-900'
          }`}
        >
          3. Presupuesto y Materiales
        </button>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Completa los campos obligatorios antes de guardar:</span>
            <span>{Object.values(errors).join(' · ')}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tab 1: General & Orientación */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-xs space-y-6">
            
            <div className="space-y-4">
              <h2 className="text-base font-bold text-purple-950 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Datos Básicos del Proyecto</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Proyecto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Granja Porcina El Porvenir"
                    className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900 ${
                      errors.name ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Productor / Responsable
                  </label>
                  <input
                    type="text"
                    value={formData.producerName}
                    onChange={(e) => setFormData({ ...formData, producerName: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ubicación (Municipio / Vereda / Departamento)
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ej. Vereda San Isidro, Fusagasugá"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cantidad Total de Animales Proyectados <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.animalCount || ''}
                      onChange={(e) => setFormData({ ...formData, animalCount: parseInt(e.target.value) || 0 })}
                      placeholder="Ej. 50"
                      className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900 font-mono tabular-nums ${
                        errors.animalCount ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                      }`}
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                      cabezas
                    </span>
                  </div>
                  {errors.animalCount && <p className="text-xs text-red-600 mt-1">{errors.animalCount}</p>}
                </div>
              </div>
            </div>

            {/* Orientación Productiva selector */}
            <div className="space-y-3 pt-4 border-t border-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Orientación Productiva <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500">Selecciona el propósito técnico de la explotación.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {orientationCards.map((card) => {
                  const isSelected = formData.orientation === card.id;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setFormData({ ...formData, orientation: card.id })}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-600/30'
                          : 'border-slate-200 hover:border-purple-200 bg-white'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-900">{card.title}</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-purple-700 block">{card.subtitle}</span>
                        <p className="text-xs text-slate-600 leading-relaxed pt-1">{card.description}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-purple-100/60">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-600">
                          {card.badge}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('terreno')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 transition-colors flex items-center gap-1.5"
              >
                <span>Continuar a Terreno e Infraestructura</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Terreno e Infraestructura */}
        {activeTab === 'terreno' && (
          <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-xs space-y-6">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-purple-950 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-purple-600" />
                  <span>Dimensiones y Características del Terreno</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Largo del Terreno <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={formData.terrain.length || ''}
                      onChange={(e) => handleDimensionChange('length', parseFloat(e.target.value))}
                      placeholder="Ej. 40"
                      className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900 font-mono tabular-nums ${
                        errors.length ? 'border-red-400' : 'border-slate-200'
                      }`}
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                      metros
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Ejemplo: 40 metros</span>
                  {errors.length && <p className="text-xs text-red-600 mt-1">{errors.length}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ancho del Terreno <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={formData.terrain.width || ''}
                      onChange={(e) => handleDimensionChange('width', parseFloat(e.target.value))}
                      placeholder="Ej. 25"
                      className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900 font-mono tabular-nums ${
                        errors.width ? 'border-red-400' : 'border-slate-200'
                      }`}
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                      metros
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Ejemplo: 25 metros</span>
                  {errors.width && <p className="text-xs text-red-600 mt-1">{errors.width}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Área Total del Lote
                  </label>
                  <div className="px-3.5 py-2 rounded-xl bg-purple-100/70 border border-purple-200 text-purple-950 font-bold font-mono text-sm flex items-center justify-center text-center">
                    <span>{formData.terrain.totalArea} m²</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Topografía Predominante
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'plano', title: 'Terreno Plano', desc: 'Facilidad de nivelación y drenaje controlado.' },
                    { id: 'leve_pendiente', title: 'Leve Pendiente (2-5%)', desc: 'Favorable para gravedad de efluentes y desagües.' },
                    { id: 'ondulado', title: 'Ondulado / Inclinado', desc: 'Requiere movimientos de tierra o terrazas.' }
                  ].map((top) => (
                    <button
                      key={top.id}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        terrain: { ...formData.terrain, topography: top.id as TopographyType }
                      })}
                      className={`p-3 text-left rounded-xl border text-xs transition-colors ${
                        formData.terrain.topography === top.id
                          ? 'border-purple-600 bg-purple-50 text-purple-950 font-medium'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-semibold">{top.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{top.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Infraestructura Previa */}
            <div className="space-y-4 pt-4 border-t border-purple-50">
              <h2 className="text-base font-bold text-purple-950">Infraestructura Previa Existente</h2>
              
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasExistingInfrastructure"
                    checked={formData.hasExistingInfrastructure === true}
                    onChange={() => setFormData({ ...formData, hasExistingInfrastructure: true })}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs sm:text-sm font-medium text-slate-700">Sí, existe infraestructura previa</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasExistingInfrastructure"
                    checked={formData.hasExistingInfrastructure === false}
                    onChange={() => setFormData({ ...formData, hasExistingInfrastructure: false, existingInfraDetails: '' })}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs sm:text-sm font-medium text-slate-700">No, es un lote desde cero</span>
                </label>
              </div>

              {formData.hasExistingInfrastructure && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Detalles y Estado de la Infraestructura Aprovechable
                    </label>
                    <textarea
                      rows={3}
                      value={formData.existingInfraDetails}
                      onChange={(e) => setFormData({ ...formData, existingInfraDetails: e.target.value })}
                      placeholder="Describe qué existe: galpón antiguo, piso de concreto, cerramiento, red de agua, etc. e indica su estado de conservación."
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                    />
                  </div>

                  {/* Recoverable Infrastructure Materials (Optional) */}
                  <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                          <PackageCheck className="w-4 h-4 text-purple-700" />
                          <span>Materiales o Estructuras Recuperables (opcional)</span>
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Si conoces cantidades reales aprovechables de la infraestructura existente, regístralas aquí para descontarlas en Presupuesto con trazabilidad.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addCustomMaterialDetail('recuperable_infra')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-purple-200 text-purple-900 hover:bg-purple-100 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Registrar elemento recuperable</span>
                      </button>
                    </div>

                    {(formData.materialDetails || []).filter((m) => m.sourceKind === 'recuperable_infra').length > 0 && (
                      <div className="space-y-2.5">
                        {(formData.materialDetails || [])
                          .filter((m) => m.sourceKind === 'recuperable_infra')
                          .map((entry) => (
                            <div key={entry.id} className="p-3 bg-white rounded-xl border border-purple-100 grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-xs items-end">
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Elemento / Material recuperable</label>
                                <input
                                  type="text"
                                  value={entry.label}
                                  onChange={(e) => upsertMaterialDetail(entry.id, { label: e.target.value })}
                                  placeholder="Ej. Losa de concreto existente"
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Cant. útil</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={entry.availableQuantity ?? ''}
                                  onChange={(e) =>
                                    upsertMaterialDetail(entry.id, {
                                      availableQuantity: e.target.value === '' ? undefined : parseFloat(e.target.value)
                                    })
                                  }
                                  placeholder="Ej. 48"
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Unidad</label>
                                <input
                                  type="text"
                                  value={entry.unit}
                                  onChange={(e) => upsertMaterialDetail(entry.id, { unit: e.target.value })}
                                  placeholder="m², ml, unidad"
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Estado</label>
                                <select
                                  value={entry.usableCondition}
                                  onChange={(e) =>
                                    upsertMaterialDetail(entry.id, {
                                      usableCondition: e.target.value as MaterialConditionStatus
                                    })
                                  }
                                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-900"
                                >
                                  <option value="pendiente_verificar">Pendiente verificar</option>
                                  <option value="bueno">Bueno</option>
                                  <option value="regular_aprovechable">Regular aprovechable</option>
                                  <option value="no_apto">No apto</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1">
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Costo acond. ({formData.currency})</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={entry.purchaseOrTransportCost ?? ''}
                                    onChange={(e) =>
                                      upsertMaterialDetail(entry.id, {
                                        purchaseOrTransportCost: e.target.value === '' ? undefined : parseFloat(e.target.value)
                                      })
                                    }
                                    placeholder="0"
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-slate-900"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeMaterialDetail(entry.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                                  title="Quitar elemento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Suministros Básicos */}
            <div className="space-y-4 pt-4 border-t border-purple-50">
              <h2 className="text-base font-bold text-purple-950">Servicios y Suministros Básicos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fuente Principal de Agua
                  </label>
                  <select
                    value={formData.waterSource}
                    onChange={(e) => setFormData({ ...formData, waterSource: e.target.value as WaterSourceType })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                  >
                    <option value="acueducto">Acueducto veredal / municipal</option>
                    <option value="pozo_profundo">Pozo profundo o aljibe</option>
                    <option value="quebrada_rio">Quebrada / Río cercano</option>
                    <option value="reservorio_lluvia">Cosecha de agua / Reservorio</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="hasElectricity"
                    checked={formData.hasElectricity}
                    onChange={(e) => setFormData({ ...formData, hasElectricity: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-slate-300"
                  />
                  <label htmlFor="hasElectricity" className="text-xs sm:text-sm font-medium text-slate-700 cursor-pointer">
                    Cuenta con suministro de energía eléctrica (red comercial o solar)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                ← Volver a General
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('recursos')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 transition-colors flex items-center gap-1.5"
              >
                <span>Continuar a Presupuesto y Materiales</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* Tab 3: Presupuesto y Materiales */}
        {activeTab === 'recursos' && (
          <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-xs space-y-6">
            
            {/* Presupuesto Disponible */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-purple-950 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <span>Presupuesto Disponible para la Inversión</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Moneda de Referencia
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                  >
                    <option value="COP">COP ($ Peso Colombiano)</option>
                    <option value="USD">USD ($ Dólar Estadounidense)</option>
                    <option value="MXN">MXN ($ Peso Mexicano)</option>
                    <option value="PEN">PEN (S/ Sol Peruano)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monto de Presupuesto Disponible <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="100000"
                      value={formData.availableBudget || ''}
                      onChange={(e) => setFormData({ ...formData, availableBudget: parseFloat(e.target.value) || 0 })}
                      placeholder="Ej. 25000000"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900 font-mono tabular-nums"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-mono font-medium pointer-events-none">
                      {formData.currency}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Ejemplo: 25000000 (equivalente a $25.000.000). Capital disponible o aprobado para obras civiles, cerramiento y equipamiento inicial.
                  </span>
                </div>
              </div>
            </div>

            {/* Materiales Disponibles */}
            <div className="space-y-3 pt-4 border-t border-purple-50">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Materiales Disponibles en la Zona o Predio
                </label>
                <p className="text-xs text-slate-500">
                  Selecciona los materiales que ya tienes o a los que tienes acceso fácil en tu región para reducir costos de construcción.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MATERIAL_OPTIONS.map((mat) => {
                  const isChecked = formData.availableMaterials.includes(mat.id);
                  return (
                    <label
                      key={mat.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-purple-300 bg-purple-50/70 text-purple-950 font-medium'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleMaterialToggle(mat.id)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-slate-300"
                      />
                      <span>{mat.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Otros Materiales Locales o Notas de Suministro
                </label>
                <input
                  type="text"
                  value={formData.otherMaterials}
                  onChange={(e) => setFormData({ ...formData, otherMaterials: e.target.value })}
                  placeholder="Ej. Madera redonda de eucalipto, material de río para balastro, etc."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                />
              </div>

              {/* Optional Local Material Inventory & Costs Details */}
              {(formData.availableMaterials.length > 0 || (formData.materialDetails || []).some((m) => m.sourceKind === 'predio_zona')) && (
                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-purple-700 shrink-0" />
                        <span>Detalle de disponibilidad y costo local (opcional)</span>
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Marcar una casilla arriba no asume cantidad suficiente ni costo cero. Registra aquí cantidad útil, unidad, estado y costo de compra o transporte si deseas calcular ahorro real en Presupuesto.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addCustomMaterialDetail('predio_zona')}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-purple-200 text-purple-900 hover:bg-purple-100 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar otro material medido</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(formData.materialDetails || [])
                      .filter((m) => m.sourceKind === 'predio_zona')
                      .map((entry) => (
                        <div key={entry.id} className="p-3 bg-white rounded-xl border border-purple-100 grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-xs items-end">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Material / Uso previsto</label>
                            <input
                              type="text"
                              value={entry.label}
                              onChange={(e) => upsertMaterialDetail(entry.id, { label: e.target.value })}
                              placeholder="Material local"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-900 mb-1"
                            />
                            <input
                              type="text"
                              value={entry.intendedUse}
                              onChange={(e) => upsertMaterialDetail(entry.id, { intendedUse: e.target.value })}
                              placeholder="Uso previsto (ej. cubierta, corrales)"
                              className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-[11px] text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Cant. disponible</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={entry.availableQuantity ?? ''}
                              onChange={(e) =>
                                upsertMaterialDetail(entry.id, {
                                  availableQuantity: e.target.value === '' ? undefined : parseFloat(e.target.value)
                                })
                              }
                              placeholder="Pendiente"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Unidad</label>
                            <input
                              type="text"
                              value={entry.unit}
                              onChange={(e) => upsertMaterialDetail(entry.id, { unit: e.target.value })}
                              placeholder="m², ml, unidad"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Estado aprovechable</label>
                            <select
                              value={entry.usableCondition}
                              onChange={(e) =>
                                upsertMaterialDetail(entry.id, {
                                  usableCondition: e.target.value as MaterialConditionStatus
                                })
                              }
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-900"
                            >
                              <option value="pendiente_verificar">Pendiente verificar</option>
                              <option value="bueno">Bueno</option>
                              <option value="regular_aprovechable">Regular aprovechable</option>
                              <option value="no_apto">No apto</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Compra / flete ({formData.currency})</label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={entry.purchaseOrTransportCost ?? ''}
                                onChange={(e) =>
                                  upsertMaterialDetail(entry.id, {
                                    purchaseOrTransportCost: e.target.value === '' ? undefined : parseFloat(e.target.value)
                                  })
                                }
                                placeholder="0"
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-slate-900"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMaterialDetail(entry.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                              title="Eliminar detalle"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones Generales de la Granja
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Anotaciones climáticas, vientos predominantes, accesos vehiculares para camión de alimento o lechones..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('terreno')}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                ← Volver a Terreno
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Caracterización</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validate()) {
                      onSave(formData);
                      onNavigateToNext();
                    }
                  }}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-purple-900 bg-purple-100 hover:bg-purple-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>Ir a Planificación Técnica</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

      </form>

      {/* Summary Review Card of Registered Data */}
      <section className="bg-purple-50/70 rounded-2xl p-6 border border-purple-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-700" />
            <h3 className="text-sm font-bold text-purple-950">Resumen de la Caracterización Registrada</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {formData.currency} ${Number(formData.availableBudget || 0).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded-xl border border-purple-100">
            <span className="text-slate-500 block">Explotación:</span>
            <span className="font-semibold text-purple-950">
              {formData.orientation === 'ceba' ? 'Levante y Ceba' : formData.orientation === 'cria' ? 'Cría / Lechones' : 'Ciclo Completo'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-purple-100">
            <span className="text-slate-500 block">Población proyectada:</span>
            <span className="font-semibold text-purple-950 font-mono tabular-nums">{formData.animalCount} animales</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-purple-100">
            <span className="text-slate-500 block">Lote disponible:</span>
            <span className="font-semibold text-purple-950 font-mono tabular-nums">
              {formData.terrain.length}m × {formData.terrain.width}m ({formData.terrain.totalArea} m²)
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-purple-100">
            <span className="text-slate-500 block">Infraestructura previa:</span>
            <span className="font-semibold text-purple-950">
              {formData.hasExistingInfrastructure ? 'Existente (aprovechable)' : 'Desde cero'}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-700">Materiales seleccionados:</span>
          {formData.availableMaterials.length === 0 ? (
            <span className="italic text-slate-400">Ninguno seleccionado</span>
          ) : (
            formData.availableMaterials.map((mId) => {
              const opt = MATERIAL_OPTIONS.find(o => o.id === mId);
              return (
                <span key={mId} className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-medium text-[11px]">
                  {opt ? opt.label.split('(')[0].trim() : mId}
                </span>
              );
            })
          )}
        </div>
      </section>

    </div>
  );
};
