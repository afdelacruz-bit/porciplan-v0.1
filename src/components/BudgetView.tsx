import React, { useEffect, useMemo, useState } from 'react';
import {
  BudgetCategory,
  BudgetItem,
  BudgetPriceSource,
  BudgetQuantitySource,
  BudgetStageTag,
  PorciProject,
  ProducerObservationDecision
} from '../types/project';
import {
  BUDGET_CATEGORY_LABELS,
  PRICE_SOURCE_LABELS,
  QUANTITY_SOURCE_LABELS,
  applyMaterialEntryToBudgetItem,
  buildBudgetScenarios,
  buildEditableExampleTemplate,
  computeItemTotal,
  evaluateProjectBudget,
  extractProducerObservations,
  findConcreteFloorConflictItems,
  generateProjectBudgetProposal,
  normalizeBudgetItem,
  syncBudgetItemsWithHousingSystem
} from '../services/budgetEngine';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  DollarSign,
  Edit3,
  FileSpreadsheet,
  Info,
  MessageSquareWarning,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';

interface BudgetViewProps {
  project: PorciProject;
  onUpdateBudgetItems: (items: BudgetItem[]) => void;
  onUpdateObservationDecisions?: (decisions: ProducerObservationDecision[]) => void;
  onNavigateToNext: () => void;
}

const STAGE_BADGE_LABELS: Record<BudgetStageTag, string> = {
  ceba: 'Levante-Ceba',
  gestacion: 'Gestación',
  maternidad: 'Maternidad',
  verracos: 'Verracos',
  precebo: 'Precebo',
  compartido: 'Compartido',
  general: 'General'
};

export const BudgetView: React.FC<BudgetViewProps> = ({
  project,
  onUpdateBudgetItems,
  onUpdateObservationDecisions,
  onNavigateToNext
}) => {
  const [items, setItems] = useState<BudgetItem[]>(project.budgetItems || []);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [confirmAction, setConfirmAction] = useState<'proposal' | 'template' | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setItems(project.budgetItems || []);
    setConfirmAction(null);
    setEditingId(null);
    setApplyingMaterialItemId(null);
  }, [project.characterization.id, project.budgetItems]);

  // Add new item drawer state
  const [isAdding, setIsAdding] = useState(false);
  const [newConcept, setNewConcept] = useState('');
  const [newCategory, setNewCategory] = useState<BudgetCategory>('obras_civiles');
  const [newUnit, setNewUnit] = useState('unidad');
  const [newQty, setNewQty] = useState<number>(1);
  const [newQtyPending, setNewQtyPending] = useState(false);
  const [newUnitCost, setNewUnitCost] = useState<number>(0);
  const [newPriceSource, setNewPriceSource] = useState<BudgetPriceSource>('cotizacion');
  const [newSupplierOrRef, setNewSupplierOrRef] = useState('');
  const [newQuoteDate, setNewQuoteDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newIsEssential, setNewIsEssential] = useState(true);
  const [addError, setAddError] = useState('');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<BudgetItem | null>(null);

  // Material discount picker state
  const [applyingMaterialItemId, setApplyingMaterialItemId] = useState<string | null>(null);

  // Active sub-panel tabs
  const [activeSubPanel, setActiveSubPanel] = useState<'rubros' | 'observaciones' | 'escenarios'>('rubros');

  const currency = project.characterization.currency || 'COP';
  const orientation = project.characterization.orientation;

  const evaluation = useMemo(() => evaluateProjectBudget(project, items), [project, items]);
  const observations = useMemo(() => extractProducerObservations(project), [project]);
  const scenarios = useMemo(
    () => buildBudgetScenarios(project, items, evaluation),
    [project, items, evaluation]
  );

  const verifiedMaterialEntries = useMemo(
    () =>
      (project.characterization.materialDetails || []).filter(
        (m) =>
          (m.usableCondition === 'bueno' || m.usableCondition === 'regular_aprovechable') &&
          Number(m.availableQuantity) > 0
      ),
    [project.characterization.materialDetails]
  );

  const persistItems = (updated: BudgetItem[]) => {
    setItems(updated);
    onUpdateBudgetItems(updated);
  };

  const handleManualSave = () => {
    onUpdateBudgetItems(items);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleGenerateProposal = (forceReplace = false) => {
    if (items.length > 0 && !forceReplace) {
      setConfirmAction('proposal');
      return;
    }
    const confirmedObsIds = new Set(
      observations.filter((o) => o.status === 'confirmada').map((o) => o.id)
    );
    const proposed = generateProjectBudgetProposal(project, confirmedObsIds);
    persistItems(proposed);
    setConfirmAction(null);
    setSelectedCategory('all');
    setFeedbackBanner({
      type: 'info',
      text: `Se generó la propuesta con ${proposed.length} rubros para orientación ${
        orientation === 'ceba' ? 'Levante y Ceba' : orientation === 'cria' ? 'Cría' : 'Ciclo Completo'
      }. Los precios permanecen pendientes hasta que ingreses cotizaciones o valores locales reales.`
    });
  };

  const handleLoadTemplate = (forceReplace = false) => {
    if (items.length > 0 && !forceReplace) {
      setConfirmAction('template');
      return;
    }
    const templateItems = buildEditableExampleTemplate(project);
    persistItems(templateItems);
    setConfirmAction(null);
    setSelectedCategory('all');
    setFeedbackBanner({
      type: 'info',
      text: 'Se cargó la guía de ejemplo editable. Sus cantidades y valores son ilustrativos y NO tienen validez de cotización real.'
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcept.trim()) {
      setAddError('Por favor ingresa el concepto del rubro.');
      return;
    }
    if (!newQtyPending && newQty <= 0) {
      setAddError('La cantidad debe ser mayor a cero o marcarse como pendiente.');
      return;
    }
    const isPricePending = newPriceSource === 'pendiente';
    if (!isPricePending && newUnitCost < 0) {
      setAddError('El costo unitario no puede ser negativo.');
      return;
    }

    const qty = newQtyPending ? 0 : newQty;
    const cost = isPricePending ? 0 : newUnitCost;
    const newItem: BudgetItem = {
      id: `item_${Date.now()}`,
      category: newCategory,
      stageTag: orientation === 'ceba' ? 'ceba' : orientation === 'cria' ? 'compartido' : 'general',
      concept: newConcept.trim(),
      unit: newUnit.trim() || 'unidad',
      quantity: qty,
      originalQuantity: qty > 0 ? qty : undefined,
      quantitySource: newQtyPending ? 'pendiente' : 'productor',
      quantityOrigin: newQtyPending ? 'Cantidad pendiente de definir por el productor' : 'Cantidad ingresada manualmente por el productor',
      quantityPending: newQtyPending,
      unitCost: cost,
      unitCostPending: isPricePending,
      priceSource: newPriceSource,
      totalCost: computeItemTotal(qty, cost, newQtyPending, isPricePending),
      supplierOrRef: newSupplierOrRef.trim() || undefined,
      quoteDate: newQuoteDate || undefined,
      isEssential: newCategory === 'imprevistos' ? false : newIsEssential,
      notes: newNotes.trim() || undefined
    };

    persistItems([...items, newItem]);
    setNewConcept('');
    setNewQty(1);
    setNewQtyPending(false);
    setNewUnitCost(0);
    setNewPriceSource('cotizacion');
    setNewSupplierOrRef('');
    setNewQuoteDate('');
    setNewNotes('');
    setAddError('');
    setIsAdding(false);
  };

  const handleDeleteItem = (id: string) => {
    persistItems(items.filter((it) => it.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditDraft(null);
    }
  };

  const startEditItem = (item: BudgetItem) => {
    const norm = normalizeBudgetItem(item);
    setEditingId(item.id);
    setEditDraft({
      ...item,
      quantityPending: norm.isQuantityPending,
      unitCostPending: norm.isPricePending,
      priceSource: norm.priceSource,
      quantitySource: norm.quantitySource
    });
  };

  const saveEditDraft = () => {
    if (!editDraft) return;
    const isMaterialFullyCovered =
      Boolean(Number(editDraft.discountedQuantity) > 0) &&
      !editDraft.quantityPending &&
      Number(editDraft.quantity) === 0;
    const qtyPending = Boolean(
      editDraft.quantityPending || (!isMaterialFullyCovered && editDraft.quantity <= 0)
    );
    const pricePending = Boolean(editDraft.unitCostPending || editDraft.priceSource === 'pendiente');
    const qty = qtyPending ? 0 : Math.max(0, Number(editDraft.quantity) || 0);
    const unitCost = pricePending ? 0 : Math.max(0, Number(editDraft.unitCost) || 0);
    const nextQtySource: BudgetQuantitySource = qtyPending
      ? 'pendiente'
      : editDraft.quantitySource && editDraft.quantitySource !== 'pendiente'
      ? editDraft.quantitySource
      : 'productor';

    const finalized: BudgetItem = {
      ...editDraft,
      quantity: qty,
      quantityPending: qtyPending,
      quantitySource: nextQtySource,
      unitCost,
      unitCostPending: pricePending,
      priceSource: pricePending ? 'pendiente' : editDraft.priceSource || 'calculo_unitario',
      isTemplateExample: editDraft.priceSource === 'ejemplo_editable',
      totalCost: computeItemTotal(qty, unitCost, qtyPending, pricePending, editDraft.localMaterialCost)
    };

    persistItems(items.map((it) => (it.id === finalized.id ? finalized : it)));
    setEditingId(null);
    setEditDraft(null);
  };

  const handleApplyMaterialToItem = (itemId: string, entryId: string) => {
    const item = items.find((i) => i.id === itemId);
    const entry = verifiedMaterialEntries.find((e) => e.id === entryId);
    if (!item || !entry) return;

    const result = applyMaterialEntryToBudgetItem(item, entry);
    if (!result.ok || !result.updatedItem) {
      setFeedbackBanner({ type: 'error', text: result.reason || 'No se pudo aplicar el material.' });
      return;
    }

    persistItems(items.map((it) => (it.id === itemId ? result.updatedItem! : it)));
    setApplyingMaterialItemId(null);
    setFeedbackBanner({
      type: 'info',
      text: `Material "${entry.label}" aplicado a "${item.concept}". ${result.updatedItem.discountExplanation}`
    });
  };

  const handleObservationStatus = (
    obs: ProducerObservationDecision,
    nextStatus: ProducerObservationDecision['status']
  ) => {
    const currentDecisions = [...(project.observationDecisions || [])];
    const idx = currentDecisions.findIndex((d) => d.id === obs.id);
    const updatedObs: ProducerObservationDecision = { ...obs, status: nextStatus };
    if (idx >= 0) {
      currentDecisions[idx] = updatedObs;
    } else {
      currentDecisions.push(updatedObs);
    }
    onUpdateObservationDecisions?.(currentDecisions);
  };

  const visibleCategories = (Object.keys(BUDGET_CATEGORY_LABELS) as BudgetCategory[]).filter(
    (cat) => items.some((it) => it.category === cat) || cat === 'imprevistos'
  );

  const filteredItems =
    selectedCategory === 'all' ? items : items.filter((it) => it.category === selectedCategory);

  const pendingObsCount = observations.filter((o) => o.status === 'pendiente').length;
  const concreteFloorConflicts = useMemo(
    () => findConcreteFloorConflictItems(project, items),
    [project, items]
  );

  const handleConvertConcreteFloorToDeepLitter = () => {
    const synced = syncBudgetItemsWithHousingSystem(
      { ...project, budgetItems: items },
      'cama_profunda'
    );
    persistItems(synced);
    setFeedbackBanner({
      type: 'info',
      text: 'Se reemplazó el rubro de piso de concreto por sustrato y base compactada de cama profunda, ajustando las áreas del plano.'
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-purple-100 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-purple-700 tracking-wider uppercase">Paso 05</span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Presupuesto Trazable del Proyecto
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Conectado con tu caracterización ({orientation === 'ceba' ? 'Levante y Ceba' : orientation === 'cria' ? 'Cría' : 'Ciclo Completo'}, {project.characterization.animalCount} cabezas) y planificación técnica. Solo suma costos con cantidad y precio confirmados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>Presupuesto guardado</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleManualSave}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-purple-200 text-purple-900 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToNext}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <span>Ver Resultados</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline replacement confirmation (no window.confirm) */}
      {confirmAction && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold block text-amber-900">
              {confirmAction === 'proposal'
                ? '¿Reemplazar los rubros actuales por una propuesta generada desde la configuración técnica?'
                : '¿Cargar la guía de ejemplo editable y reemplazar los rubros actuales?'}
            </span>
            <span className="text-[11px] text-amber-800">
              {confirmAction === 'proposal'
                ? 'Se generarán cantidades trazables según tu orientación y planos, conservando precios como pendientes.'
                : 'La plantilla solo contiene ejemplos ilustrativos sin validez de cotización real.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-900 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() =>
                confirmAction === 'proposal' ? handleGenerateProposal(true) : handleLoadTemplate(true)
              }
              className="px-3.5 py-1.5 rounded-lg bg-purple-700 text-white font-bold hover:bg-purple-800"
            >
              Confirmar reemplazo
            </button>
          </div>
        </div>
      )}

      {feedbackBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-start justify-between gap-2 ${
            feedbackBanner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-purple-50 border-purple-200 text-purple-950'
          }`}
        >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="p-0.5 opacity-70 hover:opacity-100"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards: Available vs Confirmed Subtotal + Imprevistos vs Evaluation State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Presupuesto Disponible</span>
          <div className="text-xl font-bold text-purple-950 font-mono tabular-nums">
            {currency} ${Number(evaluation.availableBudget).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 block">Registrado en Caracterización</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Subtotal Confirmado (Obra/Equipos)</span>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {currency} ${Number(evaluation.confirmedSubtotal).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Imprevistos sep.: {currency} ${Number(evaluation.confirmedContingency).toLocaleString()}
            {evaluation.templateExampleCount > 0 && (
              <span className="text-amber-700 font-semibold">
                {' '}· +${evaluation.exampleTemplateSubtotal.toLocaleString()} ejemplo
              </span>
            )}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Cobertura y Datos Pendientes</span>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {evaluation.confirmedItemsCount}/{evaluation.totalItems}{' '}
            <span className="text-xs font-normal text-slate-500">completos</span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            {evaluation.pendingPriceCount} sin precio · {evaluation.pendingQuantityCount} sin cant.
          </span>
        </div>

        <div
          className={`p-5 rounded-2xl border shadow-xs space-y-1 ${
            evaluation.status === 'dentro_del_monto'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : evaluation.status === 'deficit_estimado'
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}
        >
          <span className="text-xs font-semibold block">
            {evaluation.status === 'dentro_del_monto'
              ? 'Saldo Disponible'
              : evaluation.status === 'deficit_estimado'
              ? 'Déficit Estimado'
              : 'Evaluación Incompleta'}
          </span>
          <div className="text-xl font-bold font-mono tabular-nums flex items-center gap-1.5">
            {evaluation.status === 'dentro_del_monto' ? (
              <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : evaluation.status === 'deficit_estimado' ? (
              <TrendingDown className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <span>
              {evaluation.status === 'evaluacion_incompleta'
                ? 'Parcial'
                : `${currency} $${Math.abs(evaluation.balance).toLocaleString()}`}
            </span>
          </div>
          <span className="text-[11px] opacity-85 block leading-snug">
            {evaluation.statusLabel}
          </span>
        </div>
      </div>

      {/* Explicit Budget Status Banner & Blockers */}
      <div
        className={`p-4 rounded-2xl border text-xs space-y-2 ${
          evaluation.canDeclareViable
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            : evaluation.status === 'deficit_estimado'
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
          <div className="flex items-center gap-2">
            {evaluation.canDeclareViable ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{evaluation.statusLabel}</span>
          </div>
          {evaluation.materialCoverage.checkedMaterialsCount > 0 && (
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/80 border border-current/20">
              Materiales marcados: {evaluation.materialCoverage.checkedMaterialsCount} · Verificados:{' '}
              {evaluation.materialCoverage.verifiedMaterialEntriesCount} · Descuentos aplicados:{' '}
              {evaluation.materialCoverage.appliedDiscountItemsCount}
            </span>
          )}
        </div>
        <p className="text-[11px] leading-relaxed">{evaluation.statusDetail}</p>

        {evaluation.viabilityBlockers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {evaluation.viabilityBlockers.map((b, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white/80 border border-current/15 font-medium"
              >
                • {b}
              </span>
            ))}
          </div>
        )}

        {evaluation.status === 'deficit_estimado' && evaluation.topContributors.length > 0 && (
          <div className="pt-1 text-[11px] space-y-1 border-t border-rose-200/70">
            <span className="font-bold block text-rose-900">
              Rubros que más contribuyen al costo confirmado actual:
            </span>
            <div className="flex flex-wrap gap-2">
              {evaluation.topContributors.map((tc) => (
                <span
                  key={tc.id}
                  className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-950 font-medium"
                >
                  {tc.concept.split('(')[0].trim()}:{' '}
                  <strong className="font-mono">
                    ${tc.totalCost.toLocaleString()} ({tc.sharePct}%)
                  </strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deep litter vs leftover concrete floor conflict alert */}
      {concreteFloorConflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2 max-w-2xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-900">
                Seleccionaste «Cama Profunda» en Planificación Técnica, pero aún hay {concreteFloorConflicts.length} rubro(s) de piso de concreto en este presupuesto.
              </span>
              <span className="text-[11px] text-amber-800">
                Puedes actualizar el rubro al sistema de cama profunda (sin losa de concreto en corrales) para mantener coherencia técnica y recalcular áreas.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConvertConcreteFloorToDeepLitter}
            className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold shadow-xs shrink-0"
          >
            Convertir a Cama Profunda
          </button>
        </div>
      )}

      {/* Sub-navigation between Rubros / Observaciones / Escenarios */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-purple-100/60 rounded-xl border border-purple-200/60 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubPanel('rubros')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubPanel === 'rubros'
                ? 'bg-white text-purple-950 shadow-xs'
                : 'text-slate-600 hover:text-purple-900'
            }`}
          >
            Rubros y Cotizaciones ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubPanel('observaciones')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeSubPanel === 'observaciones'
                ? 'bg-white text-purple-950 shadow-xs'
                : 'text-slate-600 hover:text-purple-900'
            }`}
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            <span>Observaciones ({observations.length})</span>
            {pendingObsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {pendingObsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubPanel('escenarios')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeSubPanel === 'escenarios'
                ? 'bg-white text-purple-950 shadow-xs'
                : 'text-slate-600 hover:text-purple-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Comparar Escenarios (A / B / C)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleGenerateProposal(false)}
            className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generar propuesta según proyecto</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3.5 py-2 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-purple-900 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Rubro</span>
          </button>
          <button
            type="button"
            onClick={() => handleLoadTemplate(false)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors flex items-center gap-1"
            title="Cargar ejemplo editable sin validez de cotización"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Ejemplo editable</span>
          </button>
        </div>
      </div>

      {/* PANEL 1: RUBROS Y COTIZACIONES */}
      {activeSubPanel === 'rubros' && (
        <div className="space-y-4">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-2 bg-purple-50/70 rounded-2xl border border-purple-100 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-white text-purple-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-purple-900'
              }`}
            >
              Todos ({items.length})
            </button>
            {visibleCategories.map((cat) => {
              const count = items.filter((it) => it.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-white text-purple-950 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-purple-900'
                  }`}
                >
                  {BUDGET_CATEGORY_LABELS[cat].split('(')[0].trim()} ({count})
                </button>
              );
            })}
          </div>

          {/* Add New Item Form */}
          {isAdding && (
            <form onSubmit={handleAddItem} className="bg-white p-6 rounded-2xl border border-purple-200 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-purple-50 pb-3">
                <h3 className="text-sm font-bold text-purple-950">Agregar Rubro Manual</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setAddError('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Concepto *</label>
                  <input
                    type="text"
                    value={newConcept}
                    onChange={(e) => setNewConcept(e.target.value)}
                    placeholder="Ej. Tubería galvanizada o teja termoacústica"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as BudgetCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                  >
                    {(Object.keys(BUDGET_CATEGORY_LABELS) as BudgetCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {BUDGET_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidad</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="m², unidad, ml, global"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Cantidad</label>
                    <label className="inline-flex items-center gap-1 text-[10px] text-amber-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newQtyPending}
                        onChange={(e) => setNewQtyPending(e.target.checked)}
                      />
                      <span>Por definir</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    disabled={newQtyPending}
                    value={newQtyPending ? '' : newQty || ''}
                    onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)}
                    placeholder={newQtyPending ? 'Pendiente' : 'Ej. 10'}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Origen del precio</label>
                  <select
                    value={newPriceSource}
                    onChange={(e) => setNewPriceSource(e.target.value as BudgetPriceSource)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                  >
                    <option value="cotizacion">Cotización ingresada</option>
                    <option value="precio_local">Precio local ingresado</option>
                    <option value="calculo_unitario">Cálculo (cant. × unit.)</option>
                    <option value="pendiente">Pendiente de cotizar</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Valor Unitario ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    disabled={newPriceSource === 'pendiente'}
                    value={newPriceSource === 'pendiente' ? '' : newUnitCost || ''}
                    onChange={(e) => setNewUnitCost(parseFloat(e.target.value) || 0)}
                    placeholder={newPriceSource === 'pendiente' ? 'Pendiente' : 'Ej. 65000'}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total calculado</label>
                  <div className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 font-bold font-mono">
                    {newQtyPending || newPriceSource === 'pendiente'
                      ? 'Pendiente'
                      : `${currency} $${(newQty * newUnitCost).toLocaleString()}`}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Proveedor / Referencia</label>
                  <input
                    type="text"
                    value={newSupplierOrRef}
                    onChange={(e) => setNewSupplierOrRef(e.target.value)}
                    placeholder="Ferretería local / Cotización #"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha cotización</label>
                  <input
                    type="date"
                    value={newQuoteDate}
                    onChange={(e) => setNewQuoteDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Notas</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Especificación, calibre, incluye flete..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                    />
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 shrink-0">
                      <input
                        type="checkbox"
                        checked={newIsEssential}
                        onChange={(e) => setNewIsEssential(e.target.checked)}
                      />
                      <span>Esencial</span>
                    </label>
                  </div>
                </div>
              </div>

              {addError && <p className="text-xs text-red-600">{addError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setAddError('');
                  }}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors"
                >
                  Guardar Rubro
                </button>
              </div>
            </form>
          )}

          {/* Budget Table */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    No hay rubros registrados {selectedCategory !== 'all' ? 'en esta categoría' : 'todavía'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Usa <strong>«Generar propuesta según proyecto»</strong> para crear rubros ajustados a tu orientación y dimensiones técnicas, o agrega conceptos manualmente.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleGenerateProposal(false)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors"
                  >
                    Generar propuesta según proyecto
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="px-4 py-2 text-xs font-semibold text-purple-900 bg-purple-50 border border-purple-200 rounded-xl"
                  >
                    Agregar Rubro Manual
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-purple-50/70 border-b border-purple-100 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Concepto, Etapa y Origen Técnico</th>
                      <th className="py-3 px-3">Categoría</th>
                      <th className="py-3 px-3 text-right">Cantidad</th>
                      <th className="py-3 px-3 text-right">Valor Unit. ({currency})</th>
                      <th className="py-3 px-4 text-right">Total ({currency})</th>
                      <th className="py-3 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {filteredItems.map((item) => {
                      const norm = normalizeBudgetItem(item);
                      const isEditingThis = editingId === item.id && editDraft;

                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            className={`hover:bg-purple-50/30 transition-colors ${
                              norm.isTemplateExample ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <td className="py-3 px-4 max-w-sm">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-slate-900">{item.concept}</span>
                                {item.stageTag && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                                    {STAGE_BADGE_LABELS[item.stageTag] || item.stageTag}
                                  </span>
                                )}
                                {norm.isTemplateExample && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    Ejemplo sin validez
                                  </span>
                                )}
                              </div>
                              {item.quantityOrigin && (
                                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                  Origen cant.: {item.quantityOrigin}
                                </div>
                              )}
                              {item.discountExplanation && (
                                <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                  {item.discountExplanation}
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-[11px] text-slate-500 italic mt-0.5">{item.notes}</div>
                              )}
                            </td>

                            <td className="py-3 px-3 align-top">
                              <span className="text-[11px] font-medium text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md inline-block">
                                {BUDGET_CATEGORY_LABELS[item.category]?.split('(')[0].trim() || item.category}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right align-top">
                              {norm.isQuantityPending ? (
                                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold text-[10px]">
                                  Pendiente ({item.unit})
                                </span>
                              ) : (
                                <div>
                                  <div className="font-mono tabular-nums font-bold text-slate-900">
                                    {item.quantity} <span className="font-normal text-slate-500">{item.unit}</span>
                                  </div>
                                  {item.originalQuantity && item.discountedQuantity ? (
                                    <div className="text-[10px] text-emerald-700 line-through">
                                      Orig: {item.originalQuantity} {item.unit}
                                    </div>
                                  ) : null}
                                  <span className="text-[10px] text-slate-500 block">
                                    {QUANTITY_SOURCE_LABELS[norm.quantitySource]}
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right align-top">
                              {norm.isPricePending ? (
                                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold text-[10px]">
                                  Pendiente cotizar
                                </span>
                              ) : (
                                <div>
                                  <div className="font-mono tabular-nums font-medium text-slate-800">
                                    ${Number(item.unitCost).toLocaleString()}
                                  </div>
                                  <span className="text-[10px] text-slate-500 block">
                                    {PRICE_SOURCE_LABELS[norm.priceSource]}
                                  </span>
                                  {(item.supplierOrRef || item.quoteDate) && (
                                    <span className="text-[10px] text-purple-700 block">
                                      {[item.supplierOrRef, item.quoteDate].filter(Boolean).join(' · ')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right align-top font-mono tabular-nums font-bold">
                              {norm.isQuantityPending || norm.isPricePending ? (
                                <span className="text-amber-700 text-[11px] font-sans">Pendiente</span>
                              ) : norm.isTemplateExample ? (
                                <span className="text-amber-800">
                                  ${Number(item.totalCost).toLocaleString()}*
                                </span>
                              ) : (
                                <span className="text-purple-950">
                                  ${Number(norm.effectiveTotal).toLocaleString()}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center align-top">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    isEditingThis ? (setEditingId(null), setEditDraft(null)) : startEditItem(item)
                                  }
                                  className="p-1.5 text-slate-500 hover:text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
                                  title="Editar cantidad, precio o cotización"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {verifiedMaterialEntries.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setApplyingMaterialItemId(
                                        applyingMaterialItemId === item.id ? null : item.id
                                      )
                                    }
                                    className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                                    title="Descontar material propio o recuperable verificado"
                                  >
                                    <PackageCheck className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Eliminar rubro"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Inline Editor Row */}
                          {isEditingThis && editDraft && (
                            <tr className="bg-purple-50/70">
                              <td colSpan={6} className="p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs items-end">
                                  <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">Concepto</label>
                                    <input
                                      type="text"
                                      value={editDraft.concept}
                                      onChange={(e) => setEditDraft({ ...editDraft, concept: e.target.value })}
                                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-slate-900"
                                    />
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-[10px] font-semibold text-slate-700">Cantidad ({editDraft.unit})</label>
                                      <label className="inline-flex items-center gap-1 text-[10px] text-amber-800 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(editDraft.quantityPending)}
                                          onChange={(e) =>
                                            setEditDraft({
                                              ...editDraft,
                                              quantityPending: e.target.checked,
                                              quantity: e.target.checked ? 0 : editDraft.quantity || 1,
                                              quantitySource: e.target.checked ? 'pendiente' : 'productor'
                                            })
                                          }
                                        />
                                        <span>Pend.</span>
                                      </label>
                                    </div>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      disabled={Boolean(editDraft.quantityPending)}
                                      value={editDraft.quantityPending ? '' : editDraft.quantity}
                                      onChange={(e) =>
                                        setEditDraft({
                                          ...editDraft,
                                          quantity: parseFloat(e.target.value) || 0,
                                          quantitySource: 'productor',
                                          quantityPending: false
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg font-mono text-slate-900 disabled:bg-slate-100"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">Origen del precio</label>
                                    <select
                                      value={editDraft.priceSource || 'cotizacion'}
                                      onChange={(e) => {
                                        const ps = e.target.value as BudgetPriceSource;
                                        setEditDraft({
                                          ...editDraft,
                                          priceSource: ps,
                                          unitCostPending: ps === 'pendiente'
                                        });
                                      }}
                                      className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-slate-900"
                                    >
                                      <option value="cotizacion">Cotización ingresada</option>
                                      <option value="precio_local">Precio local ingresado</option>
                                      <option value="calculo_unitario">Cálculo unitario</option>
                                      <option value="pendiente">Pendiente de cotizar</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">Valor Unitario ({currency})</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      disabled={Boolean(editDraft.unitCostPending || editDraft.priceSource === 'pendiente')}
                                      value={editDraft.unitCostPending || editDraft.priceSource === 'pendiente' ? '' : editDraft.unitCost}
                                      onChange={(e) =>
                                        setEditDraft({
                                          ...editDraft,
                                          unitCost: parseFloat(e.target.value) || 0,
                                          unitCostPending: false,
                                          priceSource:
                                            editDraft.priceSource === 'pendiente' || editDraft.priceSource === 'ejemplo_editable'
                                              ? 'cotizacion'
                                              : editDraft.priceSource || 'cotizacion'
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg font-mono text-slate-900 disabled:bg-slate-100"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">Proveedor / Referencia</label>
                                    <input
                                      type="text"
                                      value={editDraft.supplierOrRef || ''}
                                      onChange={(e) => setEditDraft({ ...editDraft, supplierOrRef: e.target.value })}
                                      placeholder="Proveedor / ref."
                                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-slate-900"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">Fecha cotiz.</label>
                                    <input
                                      type="date"
                                      value={editDraft.quoteDate || ''}
                                      onChange={(e) => setEditDraft({ ...editDraft, quoteDate: e.target.value })}
                                      className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-slate-900"
                                    />
                                  </div>

                                  <div className="sm:col-span-3">
                                    <label className="block text-[10px] font-semibold text-slate-700 mb-1">Notas / Detalle</label>
                                    <input
                                      type="text"
                                      value={editDraft.notes || ''}
                                      onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
                                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-slate-900"
                                    />
                                  </div>

                                  <div className="sm:col-span-2 flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingId(null);
                                        setEditDraft(null);
                                      }}
                                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={saveEditDraft}
                                      className="px-3.5 py-1.5 rounded-lg bg-purple-700 text-white font-bold hover:bg-purple-800 flex items-center gap-1"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Aplicar</span>
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Verified Material Application Row */}
                          {applyingMaterialItemId === item.id && (
                            <tr className="bg-emerald-50/70">
                              <td colSpan={6} className="p-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <span className="font-semibold text-emerald-950">
                                    Selecciona un material propio o recuperable verificado (unidad compatible con «{item.unit}»):
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {verifiedMaterialEntries.map((mat) => (
                                      <button
                                        key={mat.id}
                                        type="button"
                                        onClick={() => handleApplyMaterialToItem(item.id, mat.id)}
                                        className="px-3 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-semibold text-[11px]"
                                      >
                                        {mat.label || mat.materialId} ({mat.availableQuantity} {mat.unit}
                                        {mat.purchaseOrTransportCost ? `, costo local $${mat.purchaseOrTransportCost.toLocaleString()}` : ''}
                                        )
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => setApplyingMaterialItemId(null)}
                                      className="px-2 py-1 text-slate-500 hover:text-slate-800"
                                    >
                                      Cerrar
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-purple-50/80 border-t-2 border-purple-200 font-bold text-slate-900">
                    <tr>
                      <td colSpan={4} className="py-3 px-4 text-right uppercase text-[11px] tracking-wider text-purple-950">
                        Total Confirmado ({filteredItems.length} rubros mostrados):
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-sm text-purple-950">
                        {currency} $
                        {Number(
                          filteredItems.reduce((acc, it) => {
                            const n = normalizeBudgetItem(it);
                            return acc + (n.isConfirmedForTotals ? n.effectiveTotal : 0);
                          }, 0)
                        ).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL 2: OBSERVACIONES DEL PRODUCTOR (CON CONFIRMACIÓN EXPLÍCITA) */}
      {activeSubPanel === 'observaciones' && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-xs p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-purple-950">
              Observaciones del Productor y Alertas de Alcance
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              PorciPlan lee tus notas generales, detalles de infraestructura previa, otros materiales y notas técnicas como alertas. Ninguna nota modifica cantidades o costos automáticamente sin tu confirmación.
            </p>
          </div>

          {observations.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-purple-50/40 border border-purple-100 text-xs text-slate-500">
              No hay observaciones de texto registradas en Caracterización o Planificación Técnica para este proyecto.
            </div>
          ) : (
            <div className="space-y-3">
              {observations.map((obs) => (
                <div
                  key={obs.id}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    obs.status === 'confirmada'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : obs.status === 'descartada'
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{obs.sourceLabel}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
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
                        : 'Pendiente de confirmar'}
                    </span>
                  </div>

                  <p className="text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200/70 italic">
                    «{obs.excerpt}»
                  </p>
                  <p className="text-[11px] text-slate-600">{obs.detectedHint}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleObservationStatus(obs, 'confirmada')}
                      className={`px-3 py-1 rounded-lg font-semibold text-[11px] border transition-colors ${
                        obs.status === 'confirmada'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      Confirmar incidencia
                    </button>
                    <button
                      type="button"
                      onClick={() => handleObservationStatus(obs, 'descartada')}
                      className={`px-3 py-1 rounded-lg font-semibold text-[11px] border transition-colors ${
                        obs.status === 'descartada'
                          ? 'bg-slate-600 text-white border-slate-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      No aplica a rubros
                    </button>
                    {obs.status !== 'pendiente' && (
                      <button
                        type="button"
                        onClick={() => handleObservationStatus(obs, 'pendiente')}
                        className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-800"
                      >
                        Marcar pendiente
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PANEL 3: COMPARADOR DE ESCENARIOS (INFORMATIVO SIN MODIFICAR PROYECTO BASE) */}
      {activeSubPanel === 'escenarios' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-950 flex items-start gap-2">
            <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <strong>Comparación puramente informativa:</strong> estos tres escenarios recalculan áreas técnicas y limitaciones sin modificar la población, la configuración técnica ni el plano guardado del proyecto.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((sc) => (
              <div
                key={sc.id}
                className="bg-white rounded-2xl border border-purple-100 shadow-xs p-5 flex flex-col justify-between space-y-4 text-xs"
              >
                <div className="space-y-2">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[10px]">
                    Escenario {sc.id}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{sc.title}</h3>
                  <p className="text-[11px] text-slate-500">{sc.subtitle}</p>

                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1.5">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Población considerada:</span>
                      <span className="font-bold text-purple-950">{sc.projectedPopulationLabel}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Presupuesto / Inversión:</span>
                      <span className="font-bold font-mono text-slate-900">{sc.requiredBudgetLabel}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                      Impacto técnico recalculado:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-700 list-disc list-inside">
                      {sc.recalculatedAreasSummary.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {sc.limitations.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-900 block">
                      Limitaciones y salvedades:
                    </span>
                    <ul className="space-y-0.5 text-[10px] text-amber-900/90 list-disc list-inside">
                      {sc.limitations.map((lim, i) => (
                        <li key={i}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
