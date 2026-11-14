import {
  BudgetCategory,
  BudgetItem,
  BudgetPriceSource,
  BudgetQuantitySource,
  MaterialConditionStatus,
  MaterialInventoryEntry,
  PorciProject,
  ProducerObservationDecision
} from '../types/project';
import { GrowthFinishHousingSystem } from '../types/growthFinish';
import { calculateGrowthFinishLayout } from './growthFinishLayout';
import { calculateBreedingLayout, resolveBreedingConfig } from './breedingLayout';
import { MATERIAL_OPTIONS } from './storage';
import { DEFAULT_GROWTH_FINISH_CONFIG } from '../constants/growthFinishMatrix';

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  obras_civiles: 'Obras Civiles y Estructura',
  divisiones_corrales: 'Divisiones y Corrales',
  equipamiento: 'Equipos Productivos',
  hidraulico_electrico: 'Instalaciones Hidráulicas y Eléctricas',
  bioseguridad_ambiental: 'Bioseguridad y Manejo Ambiental',
  transporte_mano_obra: 'Transporte y Mano de Obra',
  imprevistos: 'Imprevistos (Reserva Opcional)'
};

export const QUANTITY_SOURCE_LABELS: Record<BudgetQuantitySource, string> = {
  calculada: 'Calculada (motor técnico)',
  productor: 'Ingresada por productor',
  sugerida: 'Sugerida (referencia)',
  pendiente: 'Pendiente de definir'
};

export const PRICE_SOURCE_LABELS: Record<BudgetPriceSource, string> = {
  cotizacion: 'Cotización ingresada',
  precio_local: 'Precio local ingresado',
  calculo_unitario: 'Cálculo (cant. × valor unit.)',
  pendiente: 'Pendiente de cotizar',
  ejemplo_editable: 'Ejemplo editable (sin validez)'
};

export const MATERIAL_CONDITION_LABELS: Record<MaterialConditionStatus, string> = {
  pendiente_verificar: 'Pendiente de verificar',
  bueno: 'Bueno (aprovechable)',
  regular_aprovechable: 'Regular (aprovechable)',
  no_apto: 'No apto'
};

export interface NormalizedBudgetItem {
  raw: BudgetItem;
  quantitySource: BudgetQuantitySource;
  priceSource: BudgetPriceSource;
  isQuantityPending: boolean;
  isPricePending: boolean;
  isTemplateExample: boolean;
  effectiveTotal: number; // 0 if quantity or price is pending
  isConfirmedForTotals: boolean;
  isEssential: boolean;
}

export function normalizeBudgetItem(item: BudgetItem): NormalizedBudgetItem {
  const isTemplate = Boolean(item.isTemplateExample || item.priceSource === 'ejemplo_editable');
  const isFullyCoveredByMaterial =
    Boolean(Number(item.discountedQuantity) > 0) &&
    !item.quantityPending &&
    Number(item.quantity) === 0;

  const isQtyPending = Boolean(
    item.quantityPending ||
      (!isFullyCoveredByMaterial && (!Number.isFinite(item.quantity) || item.quantity <= 0))
  );

  let resolvedPriceSource: BudgetPriceSource = item.priceSource || 'calculo_unitario';
  if (isTemplate) {
    resolvedPriceSource = 'ejemplo_editable';
  } else if (item.unitCostPending || item.priceSource === 'pendiente') {
    resolvedPriceSource = 'pendiente';
  } else if (!item.priceSource && (!Number.isFinite(item.unitCost) || item.unitCost <= 0)) {
    // Legacy item with 0 unit cost and no explicit zero-cost explanation
    resolvedPriceSource =
      item.discountedQuantity && item.discountedQuantity > 0 ? 'calculo_unitario' : 'pendiente';
  }

  const isPricePending = resolvedPriceSource === 'pendiente' || Boolean(item.unitCostPending);

  const resolvedQtySource: BudgetQuantitySource = isQtyPending
    ? 'pendiente'
    : item.quantitySource || 'productor';

  const qty = isQtyPending ? 0 : Math.max(0, Number(item.quantity) || 0);
  const unitCost = isPricePending ? 0 : Math.max(0, Number(item.unitCost) || 0);
  const localCost = Math.max(0, Number(item.localMaterialCost) || 0);
  const effectiveTotal =
    isQtyPending || isPricePending
      ? 0
      : Number((qty * unitCost + localCost).toFixed(2));
  const isConfirmedForTotals = !isQtyPending && !isPricePending && !isTemplate;

  return {
    raw: item,
    quantitySource: resolvedQtySource,
    priceSource: resolvedPriceSource,
    isQuantityPending: isQtyPending,
    isPricePending,
    isTemplateExample: isTemplate,
    effectiveTotal,
    isConfirmedForTotals,
    isEssential: item.isEssential !== false && item.category !== 'imprevistos'
  };
}

export function computeItemTotal(
  quantity: number,
  unitCost: number,
  qtyPending?: boolean,
  pricePending?: boolean,
  localMaterialCost?: number
): number {
  if (qtyPending || pricePending || quantity < 0 || unitCost < 0) return 0;
  const extra = Math.max(0, Number(localMaterialCost) || 0);
  if (quantity === 0 && extra === 0) return 0;
  return Number((quantity * unitCost + extra).toFixed(2));
}

export type BudgetEvaluationStatus =
  | 'dentro_del_monto'
  | 'deficit_estimado'
  | 'evaluacion_incompleta';

export interface CategoryBreakdownEntry {
  category: BudgetCategory;
  label: string;
  itemCount: number;
  confirmedTotal: number;
  pendingCount: number;
}

export interface BudgetEvaluationSummary {
  availableBudget: number;
  confirmedSubtotal: number; // Rubros con cantidad y precio confirmados (excl. imprevistos y ejemplos)
  confirmedContingency: number; // Imprevistos confirmados por separado
  confirmedGrandTotal: number; // confirmedSubtotal + confirmedContingency
  exampleTemplateSubtotal: number; // Monto de plantilla editable si existe
  partialDisplayedTotal: number; // Suma visual de totales ingresados (confirmados + ejemplo si aplica)
  balance: number; // availableBudget - confirmedGrandTotal
  status: BudgetEvaluationStatus;
  statusLabel: string;
  statusDetail: string;
  canDeclareViable: boolean;
  viabilityBlockers: string[];

  totalItems: number;
  confirmedItemsCount: number;
  pendingPriceCount: number;
  pendingQuantityCount: number;
  templateExampleCount: number;
  essentialPendingCount: number;

  topContributors: Array<{ id: string; concept: string; category: BudgetCategory; totalCost: number; sharePct: number }>;
  categoryBreakdown: CategoryBreakdownEntry[];

  materialCoverage: {
    checkedMaterialsCount: number;
    verifiedMaterialEntriesCount: number;
    unverifiedMaterialsCount: number;
    appliedDiscountItemsCount: number;
    totalUnitsDiscountedText: string[];
  };
}

export function evaluateProjectBudget(
  project: PorciProject,
  rawItems: BudgetItem[]
): BudgetEvaluationSummary {
  const availableBudget = Math.max(0, Number(project.characterization.availableBudget) || 0);
  const normalized = rawItems.map(normalizeBudgetItem);

  let confirmedSubtotal = 0;
  let confirmedContingency = 0;
  let exampleTemplateSubtotal = 0;
  let confirmedItemsCount = 0;
  let pendingPriceCount = 0;
  let pendingQuantityCount = 0;
  let templateExampleCount = 0;
  let essentialPendingCount = 0;

  const categoryMap = new Map<BudgetCategory, CategoryBreakdownEntry>();
  (Object.keys(BUDGET_CATEGORY_LABELS) as BudgetCategory[]).forEach((cat) => {
    categoryMap.set(cat, {
      category: cat,
      label: BUDGET_CATEGORY_LABELS[cat],
      itemCount: 0,
      confirmedTotal: 0,
      pendingCount: 0
    });
  });

  normalized.forEach((n) => {
    const catEntry = categoryMap.get(n.raw.category);
    if (catEntry) {
      catEntry.itemCount += 1;
    }

    if (n.isQuantityPending) pendingQuantityCount += 1;
    if (n.isPricePending) pendingPriceCount += 1;
    if (n.isTemplateExample) {
      templateExampleCount += 1;
      const tplVal = !n.isQuantityPending && !n.isPricePending ? n.raw.quantity * n.raw.unitCost : 0;
      exampleTemplateSubtotal += tplVal;
      if (catEntry) catEntry.pendingCount += 1;
    } else if (n.isConfirmedForTotals) {
      confirmedItemsCount += 1;
      if (n.raw.category === 'imprevistos') {
        confirmedContingency += n.effectiveTotal;
      } else {
        confirmedSubtotal += n.effectiveTotal;
      }
      if (catEntry) catEntry.confirmedTotal += n.effectiveTotal;
    } else {
      if (catEntry) catEntry.pendingCount += 1;
    }

    if (n.isEssential && (n.isQuantityPending || n.isPricePending || n.isTemplateExample)) {
      essentialPendingCount += 1;
    }
  });

  confirmedSubtotal = Number(confirmedSubtotal.toFixed(2));
  confirmedContingency = Number(confirmedContingency.toFixed(2));
  exampleTemplateSubtotal = Number(exampleTemplateSubtotal.toFixed(2));
  const confirmedGrandTotal = Number((confirmedSubtotal + confirmedContingency).toFixed(2));
  const partialDisplayedTotal = Number((confirmedGrandTotal + exampleTemplateSubtotal).toFixed(2));
  const balance = Number((availableBudget - confirmedGrandTotal).toFixed(2));

  const viabilityBlockers: string[] = [];
  if (rawItems.length === 0) {
    viabilityBlockers.push('No hay rubros registrados en el presupuesto.');
  }
  if (pendingQuantityCount > 0) {
    viabilityBlockers.push(`Hay ${pendingQuantityCount} rubro(s) con cantidad pendiente de definir.`);
  }
  if (pendingPriceCount > 0) {
    viabilityBlockers.push(`Hay ${pendingPriceCount} rubro(s) pendientes de cotización o precio unitario.`);
  }
  if (templateExampleCount > 0) {
    viabilityBlockers.push(`Existen ${templateExampleCount} rubro(s) de ejemplo editable sin validez de cotización real.`);
  }
  if (availableBudget <= 0) {
    viabilityBlockers.push('El presupuesto disponible en Caracterización es $0.');
  }
  if (confirmedGrandTotal > availableBudget) {
    viabilityBlockers.push('El costo confirmado supera el presupuesto disponible registrado.');
  }

  let status: BudgetEvaluationStatus;
  let statusLabel: string;
  let statusDetail: string;

  if (
    rawItems.length === 0 ||
    essentialPendingCount > 0 ||
    pendingPriceCount > 0 ||
    pendingQuantityCount > 0 ||
    templateExampleCount > 0
  ) {
    if (confirmedGrandTotal > availableBudget && availableBudget > 0) {
      status = 'deficit_estimado';
      statusLabel = 'Déficit estimado (con rubros aún pendientes)';
      statusDetail =
        'Incluso con los costos confirmados hasta ahora ya se supera el presupuesto disponible, y además existen rubros sin cantidad o cotización que incrementarán el total final.';
    } else {
      status = 'evaluacion_incompleta';
      statusLabel = 'Evaluación incompleta por costos o cantidades pendientes';
      statusDetail =
        'No es posible garantizar viabilidad financiera mientras existan rubros esenciales pendientes de cantidad, cotización real o marcados como ejemplo editable.';
    }
  } else if (confirmedGrandTotal > availableBudget) {
    status = 'deficit_estimado';
    statusLabel = 'Déficit estimado frente al presupuesto disponible';
    statusDetail =
      'Con las cantidades y precios confirmados, el alcance planificado supera el presupuesto disponible registrado en Caracterización.';
  } else {
    status = 'dentro_del_monto';
    statusLabel = 'Dentro del monto con los datos ingresados';
    statusDetail =
      availableBudget > 0
        ? 'Con las cantidades y precios ingresados, el costo confirmado se mantiene dentro del presupuesto disponible registrado.'
        : 'Rubros completos, pero el presupuesto disponible está en $0; verifica tu capacidad financiera en Caracterización.';
  }

  const canDeclareViable =
    status === 'dentro_del_monto' &&
    availableBudget > 0 &&
    confirmedItemsCount > 0 &&
    essentialPendingCount === 0 &&
    pendingPriceCount === 0 &&
    pendingQuantityCount === 0 &&
    templateExampleCount === 0;

  const topContributors = normalized
    .filter((n) => n.isConfirmedForTotals && n.effectiveTotal > 0)
    .sort((a, b) => b.effectiveTotal - a.effectiveTotal)
    .slice(0, 5)
    .map((n) => ({
      id: n.raw.id,
      concept: n.raw.concept,
      category: n.raw.category,
      totalCost: n.effectiveTotal,
      sharePct:
        confirmedGrandTotal > 0
          ? Number(((n.effectiveTotal / confirmedGrandTotal) * 100).toFixed(1))
          : 0
    }));

  // Material coverage summary
  const materialDetails = project.characterization.materialDetails || [];
  const checkedMaterialsCount = project.characterization.availableMaterials.length;
  const verifiedMaterialEntries = materialDetails.filter(
    (m) =>
      (m.usableCondition === 'bueno' || m.usableCondition === 'regular_aprovechable') &&
      Number(m.availableQuantity) > 0
  );
  const unverifiedMaterialsCount = Math.max(
    0,
    checkedMaterialsCount -
      materialDetails.filter(
        (m) => m.sourceKind === 'predio_zona' && Number(m.availableQuantity) > 0 && m.usableCondition !== 'pendiente_verificar'
      ).length
  );

  const discountedItems = rawItems.filter((it) => Number(it.discountedQuantity) > 0);
  const totalUnitsDiscountedText = discountedItems.map(
    (it) => `${it.concept.split('(')[0].trim()}: -${it.discountedQuantity} ${it.unit}`
  );

  return {
    availableBudget,
    confirmedSubtotal,
    confirmedContingency,
    confirmedGrandTotal,
    exampleTemplateSubtotal,
    partialDisplayedTotal,
    balance,
    status,
    statusLabel,
    statusDetail,
    canDeclareViable,
    viabilityBlockers,
    totalItems: rawItems.length,
    confirmedItemsCount,
    pendingPriceCount,
    pendingQuantityCount,
    templateExampleCount,
    essentialPendingCount,
    topContributors,
    categoryBreakdown: Array.from(categoryMap.values()).filter((c) => c.itemCount > 0),
    materialCoverage: {
      checkedMaterialsCount,
      verifiedMaterialEntriesCount: verifiedMaterialEntries.length,
      unverifiedMaterialsCount,
      appliedDiscountItemsCount: discountedItems.length,
      totalUnitsDiscountedText
    }
  };
}

/**
 * Normalizes units gently for compatible material inventory discount checks.
 */
function normalizeUnitToken(u: string): string {
  return u.trim().toLowerCase().replace('m2', 'm²').replace('metros', 'm').replace('unidades', 'unidad');
}

/**
 * Applies a verified local or recoverable material entry to a budget item.
 * Only computes discount when quantity > 0, usableCondition is bueno/regular_aprovechable, and unit is compatible.
 */
export function applyMaterialEntryToBudgetItem(
  item: BudgetItem,
  entry: MaterialInventoryEntry
): { ok: boolean; updatedItem?: BudgetItem; reason?: string } {
  if (entry.usableCondition === 'no_apto' || entry.usableCondition === 'pendiente_verificar') {
    return {
      ok: false,
      reason: 'El material debe tener estado verificado (Bueno o Regular aprovechable) antes de descontarlo.'
    };
  }
  const availQty = Number(entry.availableQuantity) || 0;
  if (availQty <= 0) {
    return {
      ok: false,
      reason: 'El material no tiene una cantidad disponible mayor a cero.'
    };
  }
  if (item.quantityPending || item.quantity <= 0) {
    return {
      ok: false,
      reason: 'Define primero la cantidad requerida del rubro antes de aplicar un descuento de material.'
    };
  }
  if (normalizeUnitToken(entry.unit) !== normalizeUnitToken(item.unit)) {
    return {
      ok: false,
      reason: `Unidades incompatibles: el rubro usa "${item.unit}" y el material reporta "${entry.unit}". Ajusta la unidad para evitar conversiones supuestas.`
    };
  }

  const baseQty = item.originalQuantity && item.originalQuantity > 0 ? item.originalQuantity : item.quantity;
  const coveredQty = Number(Math.min(baseQty, availQty).toFixed(2));
  const netQtyToBuy = Number(Math.max(0, baseQty - coveredQty).toFixed(2));
  const extraCost = Math.max(0, Number(entry.purchaseOrTransportCost) || 0);

  const explanationParts = [
    `Cant. original: ${baseQty} ${item.unit}`,
    `Descontado (${entry.label}): -${coveredQty} ${item.unit} (${MATERIAL_CONDITION_LABELS[entry.usableCondition]})`,
    `Por adquirir: ${netQtyToBuy} ${item.unit}`
  ];
  if (extraCost > 0) {
    explanationParts.push(`Costo local/flete reportado: $${extraCost.toLocaleString()}`);
  }

  // If 100% covered and user reported transport/purchase cost, preserve total carefully without hiding freight
  const updatedUnitCost = item.unitCostPending ? 0 : item.unitCost;
  const computedTotal = item.unitCostPending
    ? extraCost > 0 && netQtyToBuy === 0
      ? extraCost
      : 0
    : Number((netQtyToBuy * updatedUnitCost + extraCost).toFixed(2));

  const updatedItem: BudgetItem = {
    ...item,
    originalQuantity: baseQty,
    discountedQuantity: coveredQty,
    quantity: netQtyToBuy,
    quantityPending: false,
    linkedMaterialEntryId: entry.id,
    localMaterialCost: extraCost > 0 ? extraCost : undefined,
    discountExplanation: explanationParts.join(' · '),
    unitCostPending: netQtyToBuy === 0 ? false : item.unitCostPending,
    priceSource:
      netQtyToBuy === 0
        ? 'precio_local'
        : item.priceSource,
    totalCost: computedTotal
  };

  return { ok: true, updatedItem };
}

/**
 * Generates a project-tailored budget proposal reflecting real orientation, layout engine metrics,
 * configured modules, and avoiding duplication or unverified assumptions.
 */
export function generateProjectBudgetProposal(
  project: PorciProject,
  confirmedObsIds: Set<string> = new Set()
): BudgetItem[] {
  const char = project.characterization;
  const orientation = char.orientation;
  const terrain = char.terrain;
  const materials = char.availableMaterials || [];
  const matLabels = materials
    .map((id) => MATERIAL_OPTIONS.find((m) => m.id === id)?.label.split('(')[0].trim() || id)
    .join(', ');
  const materialHint =
    materials.length > 0
      ? `Materiales marcados en caracterización (${matLabels}): cantidad aprovechable y costo de transporte pendientes de confirmar.`
      : 'Sin materiales locales marcados en caracterización.';

  const pendingNote = (base: string) =>
    `${base} ${char.hasExistingInfrastructure ? 'Verificar si infraestructura existente reduce obra.' : ''}`.trim();

  // Check if confirmed observations mention specific reuse
  const obsList = extractProducerObservations(project);
  const confirmedText = obsList
    .filter((o) => o.status === 'confirmada' || confirmedObsIds.has(o.id))
    .map((o) => `${o.excerpt} ${o.actionNote || ''}`.toLowerCase())
    .join(' | ');

  const confirmedWaterReuse =
    confirmedText.includes('acometida') || confirmedText.includes('red de agua') || confirmedText.includes('acueducto');
  const confirmedFloorPartial =
    confirmedText.includes('piso de concreto') || confirmedText.includes('piso existente');

  const items: BudgetItem[] = [];
  const stamp = Date.now();
  let seq = 1;
  const nextId = (prefix: string) => `prop_${prefix}_${stamp}_${seq++}`;

  const addSharedFacilities = (
    storageAreaM2: number,
    storageOrigin: string,
    storageSource: BudgetQuantitySource,
    tankReserveLiters: number,
    tankOrigin: string,
    pitSurfaceM2: number,
    pitOrigin: string,
    pitSource: BudgetQuantitySource,
    minLightingHours: number,
    isDeepLitterCeba: boolean = false
  ) => {
    // Bodega de alimento
    items.push({
      id: nextId('bodega'),
      category: 'obras_civiles',
      stageTag: 'compartido',
      concept: 'Bodega techada para almacenamiento de alimento sobre estibas',
      unit: 'm²',
      quantity: storageAreaM2,
      originalQuantity: storageAreaM2,
      quantitySource: storageSource,
      quantityOrigin: storageOrigin,
      quantityPending: storageAreaM2 <= 0,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: false,
      notes: materialHint
    });

    // Tanque hídrico
    items.push({
      id: nextId('tanque'),
      category: 'hidraulico_electrico',
      stageTag: 'compartido',
      concept: `Tanque de almacenamiento de agua (${tankReserveLiters > 0 ? `${tankReserveLiters.toLocaleString()} L` : 'capacidad por definir'})`,
      unit: 'unidad',
      quantity: tankReserveLiters > 0 ? 1 : 0,
      originalQuantity: tankReserveLiters > 0 ? 1 : 0,
      quantitySource: tankReserveLiters > 0 ? 'calculada' : 'pendiente',
      quantityOrigin: tankOrigin,
      quantityPending: tankReserveLiters <= 0,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true
    });

    // Red hidráulica (depende de longitud real desde fuente)
    items.push({
      id: nextId('red_hidraulica'),
      category: 'hidraulico_electrico',
      stageTag: 'compartido',
      concept: `Red hidráulica en tubería PVC desde fuente (${char.waterSource.replace('_', ' ')})`,
      unit: 'ml',
      quantity: 0,
      quantitySource: 'pendiente',
      quantityOrigin: 'Pendiente: definir distancia real en metros desde la fuente de agua hasta tanque y naves.',
      quantityPending: true,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true,
      notes: confirmedWaterReuse
        ? 'Observación confirmada: existe acometida previa; cotizar únicamente tramos de ampliación interna.'
        : undefined
    });

    // Red eléctrica e iluminación (solo si cuenta con electricidad o requiere alternativa)
    items.push({
      id: nextId('red_electrica'),
      category: 'hidraulico_electrico',
      stageTag: 'compartido',
      concept: char.hasElectricity
        ? `Instalación eléctrica y luminarias (meta ≥ ${minLightingHours} h/día)`
        : 'Sistema de iluminación autónomo / solar (predio sin red eléctrica)',
      unit: 'global',
      quantity: 0,
      quantitySource: 'pendiente',
      quantityOrigin: 'Pendiente: definir puntos de iluminación, cableado y protecciones según distancia al tablero.',
      quantityPending: true,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: false
    });

    // Estercolero / fosa
    items.push({
      id: nextId('estercolero'),
      category: 'bioseguridad_ambiental',
      stageTag: 'compartido',
      concept: isDeepLitterCeba
        ? 'Área de acopio y compostaje de cama usada / lixiviados impermeabilizada'
        : 'Estercolero / fosa de manejo de efluentes impermeabilizada',
      unit: 'm²',
      quantity: pitSurfaceM2,
      originalQuantity: pitSurfaceM2,
      quantitySource: pitSource,
      quantityOrigin: pitOrigin,
      quantityPending: pitSurfaceM2 <= 0,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true,
      notes: isDeepLitterCeba
        ? 'En cama profunda el efluente líquido es mínimo (0.5 L/cerdo/día); dimensionado para manejo y compostaje de sustrato.'
        : materials.includes('plastico_geomembrana')
        ? 'Geomembrana marcada en caracterización: verificar m² disponibles y excavación.'
        : 'Definir impermeabilización en concreto hidrófugo o geomembrana.'
    });

    // Pediluvio (7 m² según módulo 3.5m × 2.0m del esquema 2D)
    items.push({
      id: nextId('pediluvio'),
      category: 'bioseguridad_ambiental',
      stageTag: 'compartido',
      concept: 'Filtro sanitario y pediluvio de acceso (3.5m × 2.0m)',
      unit: 'unidad',
      quantity: 1,
      originalQuantity: 1,
      quantitySource: 'calculada',
      quantityOrigin: 'Módulo sanitario estándar incluido en el plano 2D (3.5m × 2.0m = 7 m²).',
      quantityPending: false,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true
    });

    // Cerramiento perimetral si terreno tiene dimensiones válidas
    const hasLot = terrain.length > 0 && terrain.width > 0;
    const perimeterM = hasLot ? Number((2 * (terrain.length + terrain.width)).toFixed(1)) : 0;
    items.push({
      id: nextId('cerramiento'),
      category: 'bioseguridad_ambiental',
      stageTag: 'compartido',
      concept: 'Cerramiento perimetral de bioseguridad del lote',
      unit: 'ml',
      quantity: perimeterM,
      originalQuantity: perimeterM,
      quantitySource: hasLot ? 'calculada' : 'pendiente',
      quantityOrigin: hasLot
        ? `Perímetro del lote registrado (${terrain.length}m × ${terrain.width}m)`
        : 'Pendiente: registra largo y ancho del terreno en Caracterización.',
      quantityPending: !hasLot,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: false,
      notes: materials.includes('malla_eslabonada')
        ? 'Malla eslabonada marcada en caracterización: verificar metros lineales y postes disponibles.'
        : undefined
    });
  };

  if (orientation === 'ceba') {
    const layout = calculateGrowthFinishLayout(char.animalCount, terrain, project.growthFinishConfig);
    const isDeepLitter = (project.growthFinishConfig?.housingSystem || DEFAULT_GROWTH_FINISH_CONFIG.housingSystem) === 'cama_profunda';

    items.push({
      id: nextId('piso_ceba'),
      category: 'obras_civiles',
      stageTag: 'ceba',
      concept: isDeepLitter
        ? 'Sustrato vegetal de cama profunda (cascarilla / viruta, 40–50 cm) y base compactada para nave de ceba'
        : 'Piso de concreto antideslizante (pendiente 2.5–3%) y canaleta para nave de ceba',
      unit: 'm²',
      quantity: layout.pavilionGrossArea,
      originalQuantity: layout.pavilionGrossArea,
      quantitySource: 'calculada',
      quantityOrigin: `Nave de ceba (${layout.pavilionLength}m × ${layout.pavilionWidth}m; ${layout.netFreeFloorArea} m² libres a ${layout.appliedDensity} m²/cerdo + pasillo ${layout.aisleWidth}m)`,
      quantityPending: false,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true,
      notes: isDeepLitter
        ? 'Sistema en cama profunda (sin losa de concreto en corrales): cotizar acondicionamiento de suelo compactado y sustrato absorbente.'
        : confirmedFloorPartial
        ? 'Observación confirmada: existe piso previo; descontar m² aprovechables tras verificación técnica.'
        : pendingNote(materialHint)
    });

    items.push({
      id: nextId('techo_ceba'),
      category: 'obras_civiles',
      stageTag: 'ceba',
      concept: 'Estructura de cubierta y techo para nave de levante y ceba',
      unit: 'm²',
      quantity: layout.pavilionGrossArea,
      originalQuantity: layout.pavilionGrossArea,
      quantitySource: 'calculada',
      quantityOrigin: `Área bruta en planta de la nave (${layout.pavilionLength}m × ${layout.pavilionWidth}m). Ajustar si se agregan aleros amplios.`,
      quantityPending: false,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true,
      notes: materialHint
    });

    // Divisiones entre corrales (derivación geométrica explícita)
    const rows = project.growthFinishConfig?.penArrangement === 'single_row' ? 1 : 2;
    const divLinearM = Number(
      (
        layout.pensCount * layout.penWidth +
        (layout.pensPerRow + rows) * layout.penLength
      ).toFixed(1)
    );
    items.push({
      id: nextId('div_ceba'),
      category: 'divisiones_corrales',
      stageTag: 'ceba',
      concept: `Muros bajos / divisiones y puertas de corrales (${layout.pensCount} corrales de ${layout.penWidth}m × ${layout.penLength}m)`,
      unit: 'ml',
      quantity: divLinearM,
      originalQuantity: divLinearM,
      quantitySource: 'sugerida',
      quantityOrigin: `Estimación geométrica de frentes y tabiques para ${layout.pensCount} corrales (${layout.pensPerRow}/fila). Confirmar altura y tipo de material.`,
      quantityPending: false,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true,
      notes: materialHint
    });

    items.push({
      id: nextId('comederos_ceba'),
      category: 'equipamiento',
      stageTag: 'ceba',
      concept: `Comederos tipo tolva para ${layout.pensCount} corrales de levante-ceba`,
      unit: 'unidad',
      quantity: 0,
      quantitySource: 'pendiente',
      quantityOrigin: `Pendiente: el motor calcula ${layout.pensCount} corrales (${layout.pigsPerPen} cerdos/corral), pero el número de comederos depende del modelo/bocas elegido.`,
      quantityPending: true,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true
    });

    items.push({
      id: nextId('bebederos_ceba'),
      category: 'equipamiento',
      stageTag: 'ceba',
      concept: 'Bebederos tipo chupón regulables con soporte hidráulico',
      unit: 'unidad',
      quantity: layout.waterSystem.minDrinkersTotal,
      originalQuantity: layout.waterSystem.minDrinkersTotal,
      quantitySource: 'calculada',
      quantityOrigin: `1 bebedero / 10 cerdos para ${char.animalCount} cerdos (mín. ${layout.waterSystem.minDrinkersPerPen}/corral, aforo ${layout.waterSystem.drinkerFlowRate})`,
      quantityPending: false,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true
    });

    addSharedFacilities(
      layout.feedSystem.requiredStorageAreaM2,
      `Calculado para 15 días de stock (${layout.feedSystem.totalStockTons} ton) de ${char.animalCount} cerdos`,
      'calculada',
      layout.waterSystem.tankReserveLiters,
      `Autonomía 3 días + 20% (${layout.waterSystem.tankReserveM3} m³ para ${layout.waterSystem.dailyWaterDemandLiters} L/día)`,
      layout.effluentSystem.pitSurfaceM2,
      `Fosa de ${layout.effluentSystem.pitVolumeM3} m³ (retención ${layout.effluentSystem.retentionDays} días a ${layout.effluentSystem.dailyEffluentPerPigLiters} L/cerdo/d)`,
      'calculada',
      layout.minLightingHours,
      isDeepLitter
    );
  } else if (orientation === 'cria') {
    const cfg = resolveBreedingConfig(project.breedingConfig);
    const breeding = calculateBreedingLayout(terrain, cfg);

    // Gestación
    items.push({
      id: nextId('civil_gest'),
      category: 'obras_civiles',
      stageTag: 'gestacion',
      concept: `Obra civil nave de gestación (${breeding.gestation.housing === 'grupal' ? 'corrales grupales' : 'jaulas'}) — piso y cubierta`,
      unit: 'm²',
      quantity: breeding.gestation.pavilionGrossArea,
      originalQuantity: breeding.gestation.pavilionGrossArea,
      quantitySource: breeding.gestation.sowsCount > 0 ? 'calculada' : 'pendiente',
      quantityOrigin: `Nave gestación ${breeding.gestation.pavilionLength}m × ${breeding.gestation.pavilionWidth}m (${breeding.gestation.sowsCount} cerdas; ${breeding.gestation.netArea} m² útiles)`,
      quantityPending: breeding.gestation.sowsCount <= 0,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true,
      notes: materialHint
    });

    items.push({
      id: nextId('struct_gest'),
      category: 'divisiones_corrales',
      stageTag: 'gestacion',
      concept:
        breeding.gestation.housing === 'grupal'
          ? `Divisiones para corrales grupales de gestación (${breeding.gestation.groupBandLabel})`
          : `Jaulas individuales de gestación (${breeding.gestation.unitLength}m × ${breeding.gestation.unitWidth}m)`,
      unit: breeding.gestation.housing === 'grupal' ? 'corral' : 'jaula',
      quantity: breeding.gestation.unitsCount,
      originalQuantity: breeding.gestation.unitsCount,
      quantitySource: breeding.gestation.sowsCount > 0 ? 'calculada' : 'pendiente',
      quantityOrigin: `${breeding.gestation.unitsCount} unidades para ${breeding.gestation.sowsCount} cerdas en gestación`,
      quantityPending: breeding.gestation.sowsCount <= 0,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true
    });

    // Maternidad
    items.push({
      id: nextId('civil_mat'),
      category: 'obras_civiles',
      stageTag: 'maternidad',
      concept: `Obra civil salas de maternidad (${breeding.farrowing.roomsCount} sala(s) de ${breeding.farrowing.roomLength}m × ${breeding.farrowing.roomWidth}m)`,
      unit: 'm²',
      quantity: breeding.farrowing.totalGrossArea,
      originalQuantity: breeding.farrowing.totalGrossArea,
      quantitySource: breeding.farrowing.totalPlaces > 0 ? 'calculada' : 'pendiente',
      quantityOrigin: `${breeding.farrowing.roomsCount} sala(s) × ${breeding.farrowing.roomGrossArea} m² brutos c/sala`,
      quantityPending: breeding.farrowing.totalPlaces <= 0,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true,
      notes: materialHint
    });

    items.push({
      id: nextId('parideras_mat'),
      category: 'equipamiento',
      stageTag: 'maternidad',
      concept: `Jaulas / cunas parideras completas (${breeding.farrowing.placeWidth}m × ${breeding.farrowing.placeLength}m)`,
      unit: 'plaza',
      quantity: breeding.farrowing.totalPlaces,
      originalQuantity: breeding.farrowing.totalPlaces,
      quantitySource: breeding.farrowing.totalPlaces > 0 ? 'calculada' : 'pendiente',
      quantityOrigin: `Plazas de lactancia registradas en Planificación Técnica (${breeding.farrowing.placesPerRoom}/sala)`,
      quantityPending: breeding.farrowing.totalPlaces <= 0,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true
    });

    items.push({
      id: nextId('calef_mat'),
      category: 'equipamiento',
      stageTag: 'maternidad',
      concept: 'Equipos de calefacción / microclima en lechoneras de maternidad',
      unit: 'punto térmico',
      quantity: breeding.farrowing.totalPlaces,
      originalQuantity: breeding.farrowing.totalPlaces,
      quantitySource: breeding.farrowing.totalPlaces > 0 ? 'sugerida' : 'pendiente',
      quantityOrigin: `Sugerido 1 punto térmico por paridera (${breeding.farrowing.totalPlaces} plazas)`,
      quantityPending: breeding.farrowing.totalPlaces <= 0,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true
    });

    // Verracos (SOLO si está habilitado en configuración)
    if (breeding.boars.enabled) {
      items.push({
        id: nextId('verracos'),
        category: 'divisiones_corrales',
        stageTag: 'verracos',
        concept: `Corral(es) y zona de servicio para verracos (${breeding.boars.boarsCount} plaza(s))`,
        unit: 'm²',
        quantity: breeding.boars.totalGrossArea,
        originalQuantity: breeding.boars.totalGrossArea,
        quantitySource: 'calculada',
        quantityOrigin: `${breeding.boars.boarsCount} corral(es) de ${breeding.boars.penWidth}m × ${breeding.boars.penLength}m (${breeding.boars.areaPerPen} m² útiles c/u) + franja de servicio`,
        quantityPending: false,
        unitCost: 0,
        unitCostPending: true,
        priceSource: 'pendiente',
        totalCost: 0,
        isEssential: true
      });
    }

    // Bebederos cría
    const totalBreedingDrinkers =
      breeding.gestation.sowsCount + breeding.farrowing.totalPlaces + breeding.boars.boarsCount;
    items.push({
      id: nextId('bebederos_cria'),
      category: 'equipamiento',
      stageTag: 'compartido',
      concept: 'Bebederos tipo chupón para gestación, maternidad y verracos',
      unit: 'unidad',
      quantity: totalBreedingDrinkers,
      originalQuantity: totalBreedingDrinkers,
      quantitySource: totalBreedingDrinkers > 0 ? 'sugerida' : 'pendiente',
      quantityOrigin: `1 chupón por plaza (${breeding.gestation.sowsCount} gest. + ${breeding.farrowing.totalPlaces} parideras + ${breeding.boars.boarsCount} verracos; aforo ${breeding.waterSystem.drinkerFlowRate})`,
      quantityPending: totalBreedingDrinkers <= 0,
      unitCost: 0,
      unitCostPending: true,
      priceSource: 'pendiente',
      totalCost: 0,
      isEssential: true
    });

    const bodegaRect = breeding.rectangles.find((r) => r.id === 'bodega');
    const estRect = breeding.rectangles.find((r) => r.id === 'estercolero');
    const bodegaArea = bodegaRect ? Number((bodegaRect.width * bodegaRect.height).toFixed(1)) : 0;
    const estArea = estRect ? Number((estRect.width * estRect.height).toFixed(1)) : 0;

    addSharedFacilities(
      bodegaArea,
      'Huella referencial configurable del motor de cría; validar capacidad real de bodega según rotación de concentrado.',
      bodegaArea > 0 ? 'sugerida' : 'pendiente',
      breeding.waterSystem.tankReserveLiters,
      `Demanda cría (${breeding.waterSystem.totalDailyLiters} L/día) × 3 días + 20%`,
      estArea,
      'Huella referencial configurable del motor de cría; verificar volumen definitivo con diseño hidráulico.',
      estArea > 0 ? 'sugerida' : 'pendiente',
      breeding.lightingHoursMin
    );
  } else {
    // CICLO COMPLETO: inspeccionar únicamente etapas realmente configuradas sin duplicar compartidos
    const hasBreedingCfg = Boolean(
      project.breedingConfig &&
        (project.breedingConfig.sowsCount > 0 || project.breedingConfig.farrowingPlacesCount > 0)
    );
    const hasGrowthCfg = Boolean(project.growthFinishConfig && char.animalCount > 0);
    const hasPreceboNote = Boolean(project.technicalNotes?.zone_precebo_destete?.trim());

    let sharedStorage = 0;
    let sharedTankLiters = 0;
    let sharedPitArea = 0;

    if (hasBreedingCfg && project.breedingConfig) {
      const br = calculateBreedingLayout(terrain, project.breedingConfig);
      items.push({
        id: nextId('cc_gest'),
        category: 'obras_civiles',
        stageTag: 'gestacion',
        concept: `Módulo de Gestación (${br.gestation.sowsCount} cerdas · ${br.gestation.housing})`,
        unit: 'm²',
        quantity: br.gestation.pavilionGrossArea,
        originalQuantity: br.gestation.pavilionGrossArea,
        quantitySource: 'calculada',
        quantityOrigin: `Configuración de cría guardada (${br.gestation.pavilionLength}m × ${br.gestation.pavilionWidth}m)`,
        quantityPending: false,
        unitCost: 0,
        unitCostPending: true,
        priceSource: 'pendiente',
        totalCost: 0,
        isEssential: true
      });
      items.push({
        id: nextId('cc_mat'),
        category: 'obras_civiles',
        stageTag: 'maternidad',
        concept: `Salas y Parideras de Maternidad (${br.farrowing.totalPlaces} plazas)`,
        unit: 'm²',
        quantity: br.farrowing.totalGrossArea,
        originalQuantity: br.farrowing.totalGrossArea,
        quantitySource: 'calculada',
        quantityOrigin: `${br.farrowing.roomsCount} sala(s) configurada(s)`,
        quantityPending: false,
        unitCost: 0,
        unitCostPending: true,
        priceSource: 'pendiente',
        totalCost: 0,
        isEssential: true
      });
      if (br.boars.enabled) {
        items.push({
          id: nextId('cc_verr'),
          category: 'divisiones_corrales',
          stageTag: 'verracos',
          concept: `Corral(es) de Verraco (${br.boars.boarsCount} plaza(s))`,
          unit: 'm²',
          quantity: br.boars.totalGrossArea,
          originalQuantity: br.boars.totalGrossArea,
          quantitySource: 'calculada',
          quantityOrigin: 'Configuración de verracos habilitada',
          quantityPending: false,
          unitCost: 0,
          unitCostPending: true,
          priceSource: 'pendiente',
          totalCost: 0,
          isEssential: true
        });
      }
      sharedTankLiters += br.waterSystem.tankReserveLiters;
    }

    if (hasGrowthCfg && project.growthFinishConfig) {
      const gf = calculateGrowthFinishLayout(char.animalCount, terrain, project.growthFinishConfig);
      items.push({
        id: nextId('cc_ceba'),
        category: 'obras_civiles',
        stageTag: 'ceba',
        concept: `Nave de Levante y Ceba (${gf.pensCount} corrales · ${char.animalCount} cerdos)`,
        unit: 'm²',
        quantity: gf.pavilionGrossArea,
        originalQuantity: gf.pavilionGrossArea,
        quantitySource: 'calculada',
        quantityOrigin: `Configuración levante-ceba guardada (${gf.pavilionLength}m × ${gf.pavilionWidth}m)`,
        quantityPending: false,
        unitCost: 0,
        unitCostPending: true,
        priceSource: 'pendiente',
        totalCost: 0,
        isEssential: true
      });
      sharedStorage = gf.feedSystem.requiredStorageAreaM2;
      sharedTankLiters += gf.waterSystem.tankReserveLiters;
      sharedPitArea = gf.effluentSystem.pitSurfaceM2;
    }

    if (hasPreceboNote) {
      items.push({
        id: nextId('cc_prec'),
        category: 'obras_civiles',
        stageTag: 'precebo',
        concept: 'Módulo de Precebo / Destete (definir área y jaulas elevadas)',
        unit: 'm²',
        quantity: 0,
        quantitySource: 'pendiente',
        quantityOrigin: 'Pendiente: existen notas de precebo, pero el motor técnico actual no calcula área automática de precebo.',
        quantityPending: true,
        unitCost: 0,
        unitCostPending: true,
        priceSource: 'pendiente',
        totalCost: 0,
        isEssential: true
      });
    }

    if (!hasBreedingCfg && !hasGrowthCfg) {
      items.push({
        id: nextId('cc_pendiente'),
        category: 'obras_civiles',
        stageTag: 'general',
        concept: 'Obra civil por etapas de Ciclo Completo (definir dimensiones de gestación, maternidad, precebo y ceba)',
        unit: 'm²',
        quantity: 0,
        quantitySource: 'pendiente',
        quantityOrigin: 'Pendiente: ciclo completo requiere definir explícitamente cada etapa para no suponer áreas ni duplicar instalaciones.',
        quantityPending: true,
        unitCost: 0,
        unitCostPending: true,
        priceSource: 'pendiente',
        totalCost: 0,
        isEssential: true
      });
    }

    addSharedFacilities(
      sharedStorage,
      sharedStorage > 0 ? 'Calculada una única vez para instalaciones compartidas' : 'Pendiente: definir área de bodega consolidada',
      sharedStorage > 0 ? 'calculada' : 'pendiente',
      sharedTankLiters,
      sharedTankLiters > 0 ? 'Suma consolidada de reserva de las etapas configuradas' : 'Pendiente: definir capacidad de reserva según etapas activas',
      sharedPitArea,
      sharedPitArea > 0 ? 'Espejo superficial calculado sin duplicar' : 'Pendiente: definir área de estercolero según etapas activas',
      sharedPitArea > 0 ? 'calculada' : 'pendiente',
      8
    );
  }

  // Transporte y mano de obra (pendiente hasta cotización local)
  items.push({
    id: nextId('transp_mo'),
    category: 'transporte_mano_obra',
    stageTag: 'compartido',
    concept: 'Mano de obra constructiva y transporte / fletes de materiales al predio',
    unit: 'global',
    quantity: 0,
    quantitySource: 'pendiente',
    quantityOrigin: 'Pendiente: depende de jornales locales, accesos del predio y distancia a proveedores.',
    quantityPending: true,
    unitCost: 0,
    unitCostPending: true,
    priceSource: 'pendiente',
    totalCost: 0,
    isEssential: false,
    notes: char.otherMaterials
      ? `Revisar observación de materiales/fletes: "${char.otherMaterials}"`
      : undefined
  });

  // Imprevistos separados y opcionales
  items.push({
    id: nextId('imprev'),
    category: 'imprevistos',
    stageTag: 'compartido',
    concept: 'Reserva opcional para imprevistos constructivos (ej. 5%–10% del subtotal confirmado)',
    unit: 'global',
    quantity: 1,
    originalQuantity: 1,
    quantitySource: 'sugerida',
    quantityOrigin: 'Partida opcional separada; no sustituye rubros ni precios faltantes.',
    quantityPending: false,
    unitCost: 0,
    unitCostPending: true,
    priceSource: 'pendiente',
    totalCost: 0,
    isEssential: false
  });

  return items;
}

/**
 * Editable template explicitly marked without quote validity.
 */
export function buildEditableExampleTemplate(project?: PorciProject): BudgetItem[] {
  const stamp = Date.now();
  const isDeepLitter =
    project?.characterization.orientation === 'ceba' &&
    project?.growthFinishConfig?.housingSystem === 'cama_profunda';

  return [
    {
      id: `tpl_ex_1_${stamp}`,
      category: 'obras_civiles',
      concept: isDeepLitter
        ? '[Ejemplo] Sustrato de cama profunda (cascarilla / viruta 40–50 cm) y base compactada'
        : '[Ejemplo] Pisos de concreto afinado con pendiente del 3%',
      unit: 'm²',
      quantity: isDeepLitter ? 110 : 80,
      quantitySource: 'sugerida',
      quantityOrigin: 'Ejemplo ilustrativo genérico (no corresponde al cálculo real del proyecto)',
      unitCost: isDeepLitter ? 24000 : 65000,
      priceSource: 'ejemplo_editable',
      totalCost: isDeepLitter ? 2640000 : 5200000,
      isTemplateExample: true,
      notes: 'Ejemplo editable sin validez de cotización. Reemplazar por valores reales.'
    },
    {
      id: `tpl_ex_2_${stamp}`,
      category: 'obras_civiles',
      concept: '[Ejemplo] Cubierta liviana y muros bajos perimetrales',
      unit: 'm²',
      quantity: isDeepLitter ? 110 : 80,
      quantitySource: 'sugerida',
      quantityOrigin: 'Ejemplo ilustrativo genérico',
      unitCost: 72000,
      priceSource: 'ejemplo_editable',
      totalCost: (isDeepLitter ? 110 : 80) * 72000,
      isTemplateExample: true,
      notes: 'Ejemplo editable sin validez de cotización.'
    },
    {
      id: `tpl_ex_3_${stamp}`,
      category: 'equipamiento',
      concept: '[Ejemplo] Bebederos tipo chupón y comederos de referencia',
      unit: 'global',
      quantity: 1,
      quantitySource: 'sugerida',
      quantityOrigin: 'Ejemplo ilustrativo genérico',
      unitCost: 1850000,
      priceSource: 'ejemplo_editable',
      totalCost: 1850000,
      isTemplateExample: true,
      notes: 'Ejemplo editable sin validez de cotización.'
    }
  ];
}

function isCebaConcreteFloorItem(item: BudgetItem): boolean {
  if (item.category !== 'obras_civiles') return false;
  if (item.stageTag && item.stageTag !== 'ceba' && item.stageTag !== 'general') return false;
  const low = item.concept.toLowerCase();
  return low.includes('piso') && low.includes('concreto') && !low.includes('bodega');
}

function isCebaDeepLitterFloorItem(item: BudgetItem): boolean {
  if (item.category !== 'obras_civiles') return false;
  const low = item.concept.toLowerCase();
  return low.includes('cama profunda');
}

/**
 * Returns any budget items that explicitly refer to concrete floors in the ceba pavilion
 * while the user has selected cama_profunda.
 */
export function findConcreteFloorConflictItems(
  project: PorciProject,
  items: BudgetItem[]
): BudgetItem[] {
  if (
    project.characterization.orientation !== 'ceba' ||
    project.growthFinishConfig?.housingSystem !== 'cama_profunda'
  ) {
    return [];
  }
  return items.filter(isCebaConcreteFloorItem);
}

/**
 * Synchronizes generated/sample/template floor and area-dependent budget items
 * when the user switches housingSystem (e.g. convencional <-> cama_profunda) in Ceba,
 * preventing concrete floor rubros from remaining active under Cama Profunda.
 */
export function syncBudgetItemsWithHousingSystem(
  project: PorciProject,
  nextHousing: GrowthFinishHousingSystem
): BudgetItem[] {
  const items = project.budgetItems || [];
  if (project.characterization.orientation !== 'ceba' || items.length === 0) {
    return items;
  }

  const layout = calculateGrowthFinishLayout(
    project.characterization.animalCount,
    project.characterization.terrain,
    { ...project.growthFinishConfig, housingSystem: nextHousing }
  );
  const rows = project.growthFinishConfig?.penArrangement === 'single_row' ? 1 : 2;
  const divLinearM = Number(
    (
      layout.pensCount * layout.penWidth +
      (layout.pensPerRow + rows) * layout.penLength
    ).toFixed(1)
  );

  return items.map((item) => {
    const isManagedFloorItem =
      item.id.startsWith('prop_piso_ceba_') ||
      item.id === 'b_01' ||
      item.id.startsWith('tpl_ex_1_') ||
      isCebaConcreteFloorItem(item) ||
      isCebaDeepLitterFloorItem(item);

    if (isManagedFloorItem) {
      if (nextHousing === 'cama_profunda') {
        const isTemplate = Boolean(item.isTemplateExample || item.id.startsWith('tpl_ex_1_'));
        if (isTemplate) {
          const qty = layout.pavilionGrossArea > 0 ? layout.pavilionGrossArea : item.quantity;
          return {
            ...item,
            concept: '[Ejemplo] Sustrato de cama profunda (cascarilla / viruta 40–50 cm) y base compactada',
            quantity: qty,
            totalCost: computeItemTotal(qty, item.unitCost, item.quantityPending, item.unitCostPending)
          };
        }

        const wasConcrete = isCebaConcreteFloorItem(item);
        const nextQty = layout.pavilionGrossArea;
        const resetPrice = wasConcrete;
        const nextUnitCost = resetPrice ? 0 : item.unitCost;
        const nextPricePending = resetPrice ? true : item.unitCostPending;

        return {
          ...item,
          stageTag: 'ceba',
          concept:
            'Sustrato vegetal de cama profunda (cascarilla / viruta, 40–50 cm) y base compactada para nave de ceba',
          unit: 'm²',
          quantity: nextQty,
          originalQuantity: nextQty,
          discountedQuantity: undefined,
          discountExplanation: undefined,
          linkedMaterialEntryId: undefined,
          localMaterialCost: undefined,
          quantitySource: 'calculada',
          quantityOrigin: `Nave de ceba en cama profunda (${layout.pavilionLength}m × ${layout.pavilionWidth}m; ${layout.netFreeFloorArea} m² libres a ${layout.appliedDensity} m²/cerdo + pasillo ${layout.aisleWidth}m)`,
          quantityPending: false,
          unitCost: nextUnitCost,
          unitCostPending: nextPricePending,
          priceSource: resetPrice ? 'pendiente' : item.priceSource,
          supplierOrRef: resetPrice ? undefined : item.supplierOrRef,
          quoteDate: resetPrice ? undefined : item.quoteDate,
          totalCost: computeItemTotal(nextQty, nextUnitCost, false, nextPricePending),
          notes:
            'Sistema en cama profunda (sin losa de concreto en corrales): cotizar acondicionamiento de suelo compactado y sustrato absorbente.'
        };
      } else {
        // Switching back to convencional
        const isTemplate = Boolean(item.isTemplateExample || item.id.startsWith('tpl_ex_1_'));
        if (isTemplate) {
          return {
            ...item,
            concept: '[Ejemplo] Pisos de concreto afinado con pendiente del 3%',
            totalCost: computeItemTotal(item.quantity, item.unitCost, item.quantityPending, item.unitCostPending)
          };
        }
        if (item.id.startsWith('prop_piso_ceba_') || isCebaDeepLitterFloorItem(item)) {
          const wasDeepLitter = isCebaDeepLitterFloorItem(item);
          const nextQty = layout.pavilionGrossArea;
          const resetPrice = wasDeepLitter;
          const nextUnitCost = resetPrice ? 0 : item.unitCost;
          const nextPricePending = resetPrice ? true : item.unitCostPending;

          return {
            ...item,
            stageTag: 'ceba',
            concept: 'Piso de concreto antideslizante (pendiente 2.5–3%) y canaleta para nave de ceba',
            unit: 'm²',
            quantity: nextQty,
            originalQuantity: nextQty,
            discountedQuantity: undefined,
            discountExplanation: undefined,
            linkedMaterialEntryId: undefined,
            localMaterialCost: undefined,
            quantitySource: 'calculada',
            quantityOrigin: `Nave de ceba (${layout.pavilionLength}m × ${layout.pavilionWidth}m; ${layout.netFreeFloorArea} m² libres a ${layout.appliedDensity} m²/cerdo + pasillo ${layout.aisleWidth}m)`,
            quantityPending: false,
            unitCost: nextUnitCost,
            unitCostPending: nextPricePending,
            priceSource: resetPrice ? 'pendiente' : item.priceSource,
            supplierOrRef: resetPrice ? undefined : item.supplierOrRef,
            quoteDate: resetPrice ? undefined : item.quoteDate,
            totalCost: computeItemTotal(nextQty, nextUnitCost, false, nextPricePending),
            notes: undefined
          };
        }
      }
    }

    // Sync calculated roof, pen dividers and effluent areas when housing system changes
    if (item.id.startsWith('prop_techo_ceba_') && item.quantitySource === 'calculada' && !item.discountedQuantity) {
      return {
        ...item,
        quantity: layout.pavilionGrossArea,
        originalQuantity: layout.pavilionGrossArea,
        quantityOrigin: `Área bruta en planta de la nave (${layout.pavilionLength}m × ${layout.pavilionWidth}m). Ajustar si se agregan aleros amplios.`,
        totalCost: computeItemTotal(layout.pavilionGrossArea, item.unitCost, item.quantityPending, item.unitCostPending, item.localMaterialCost)
      };
    }

    if (item.id.startsWith('prop_div_ceba_') && (item.quantitySource === 'sugerida' || item.quantitySource === 'calculada') && !item.discountedQuantity) {
      return {
        ...item,
        concept: `Muros bajos / divisiones y puertas de corrales (${layout.pensCount} corrales de ${layout.penWidth}m × ${layout.penLength}m)`,
        quantity: divLinearM,
        originalQuantity: divLinearM,
        quantityOrigin: `Estimación geométrica de frentes y tabiques para ${layout.pensCount} corrales (${layout.pensPerRow}/fila). Confirmar altura y tipo de material.`,
        totalCost: computeItemTotal(divLinearM, item.unitCost, item.quantityPending, item.unitCostPending, item.localMaterialCost)
      };
    }

    if (item.id.startsWith('prop_estercolero_') && item.quantitySource === 'calculada' && !item.discountedQuantity) {
      const isDeep = nextHousing === 'cama_profunda';
      return {
        ...item,
        concept: isDeep
          ? 'Área de acopio y compostaje de cama usada / lixiviados impermeabilizada'
          : 'Estercolero / fosa de manejo de efluentes impermeabilizada',
        quantity: layout.effluentSystem.pitSurfaceM2,
        originalQuantity: layout.effluentSystem.pitSurfaceM2,
        quantityOrigin: `Fosa de ${layout.effluentSystem.pitVolumeM3} m³ (retención ${layout.effluentSystem.retentionDays} días a ${layout.effluentSystem.dailyEffluentPerPigLiters} L/cerdo/d)`,
        totalCost: computeItemTotal(layout.effluentSystem.pitSurfaceM2, item.unitCost, item.quantityPending, item.unitCostPending, item.localMaterialCost),
        notes: isDeep
          ? 'En cama profunda el efluente líquido es mínimo (0.5 L/cerdo/día); dimensionado para manejo y compostaje de sustrato.'
          : 'Definir impermeabilización en concreto hidrófugo o geomembrana.'
      };
    }

    return item;
  });
}

/**
 * Reads producer text observations from Characterization & Technical Planning
 * and merges with saved confirmation status so notes are NEVER converted silently into costs/quantities.
 */
export function extractProducerObservations(
  project: PorciProject
): ProducerObservationDecision[] {
  const char = project.characterization;
  const saved = project.observationDecisions || [];
  const savedMap = new Map(saved.map((d) => [d.id, d]));

  const detected: ProducerObservationDecision[] = [];

  const pushIfText = (
    id: string,
    sourceField: ProducerObservationDecision['sourceField'],
    sourceLabel: string,
    text: string,
    hintBuilder: (txt: string) => string
  ) => {
    const clean = (text || '').trim();
    if (!clean) return;
    const prev = savedMap.get(id);
    detected.push({
      id,
      sourceField,
      sourceLabel,
      excerpt: clean,
      detectedHint: hintBuilder(clean),
      status: prev?.status || 'pendiente',
      affectedBudgetItemId: prev?.affectedBudgetItemId,
      actionNote: prev?.actionNote
    });
  };

  if (char.hasExistingInfrastructure) {
    pushIfText(
      'obs_existing_infra',
      'existingInfraDetails',
      'Infraestructura previa (Caracterización)',
      char.existingInfraDetails,
      (t) => {
        const low = t.toLowerCase();
        const hints: string[] = [];
        if (low.includes('piso') || low.includes('concreto') || low.includes('losa')) {
          hints.push('posible reaprovechamiento parcial de piso previo (verificar m² y estado estructural)');
        }
        if (low.includes('agua') || low.includes('acometida') || low.includes('acueducto')) {
          hints.push('posible aprovechamiento de acometida de agua existente');
        }
        if (low.includes('galpón') || low.includes('galpon') || low.includes('techo')) {
          hints.push('posible reutilización de cubierta o estructura previa');
        }
        return hints.length > 0
          ? `Alerta detectada: ${hints.join('; ')}. Requiere confirmación del productor antes de descontar rubros.`
          : 'Infraestructura previa reportada: confirma qué rubros de obra civil o hidráulica cubre realmente.';
      }
    );
  }

  pushIfText(
    'obs_other_materials',
    'otherMaterials',
    'Otros materiales locales (Caracterización)',
    char.otherMaterials,
    (t) => {
      const low = t.toLowerCase();
      if (low.includes('sin costo') || low.includes('flete') || low.includes('arena') || low.includes('grava') || low.includes('madera')) {
        return 'Se mencionan materiales o fletes locales en texto libre: confirma cantidad, unidad y costo real antes de aplicarlo como ahorro.';
      }
      return 'Material adicional descrito en notas: confirma en qué rubro influye si deseas descontarlo o ajustar precio unitario.';
    }
  );

  pushIfText(
    'obs_general_notes',
    'notes',
    'Observaciones generales del predio (Caracterización)',
    char.notes,
    (t) => {
      const low = t.toLowerCase();
      const alerts: string[] = [];
      if (low.includes('viento') || low.includes('cortina') || low.includes('clima')) {
        alerts.push('considerar cortinas o protección bioclimática en equipamiento/obra');
      }
      if (low.includes('acceso') || low.includes('camion') || low.includes('camión') || low.includes('vía') || low.includes('via')) {
        alerts.push('validar impacto de acceso vehicular en costo de fletes y descarga de materiales');
      }
      return alerts.length > 0
        ? `Sugerencia contextual: ${alerts.join('; ')}.`
        : 'Nota de contexto del predio: revisa si requiere ajuste de alcance o fletes en presupuesto.';
    }
  );

  Object.entries(project.technicalNotes || {}).forEach(([key, val]) => {
    pushIfText(
      `obs_tech_${key}`,
      'technicalNotes',
      `Nota técnica (${key.replace(/^zone_/, '').replace(/_/g, ' ')})`,
      val,
      () => 'Especificación técnica del módulo: confirma si modifica materiales, equipos o precio unitario del rubro asociado.'
    );
  });

  return detected;
}

export interface BudgetScenarioComparison {
  id: 'A' | 'B' | 'C';
  title: string;
  subtitle: string;
  canEvaluateQuantitatively: boolean;
  projectedPopulationLabel: string;
  requiredBudgetLabel: string;
  recalculatedAreasSummary: string[];
  limitations: string[];
}

/**
 * Computes three purely informational comparative scenarios (A, B, C) without mutating the base project.
 */
export function buildBudgetScenarios(
  project: PorciProject,
  items: BudgetItem[],
  evaluation: BudgetEvaluationSummary
): BudgetScenarioComparison[] {
  const char = project.characterization;
  const currency = char.currency || 'COP';
  const isCeba = char.orientation === 'ceba';
  const isCria = char.orientation === 'cria';

  const hasEnoughConfirmedBase = evaluation.confirmedGrandTotal > 0;
  const hasCompleteData = evaluation.pendingPriceCount === 0 && evaluation.pendingQuantityCount === 0 && evaluation.templateExampleCount === 0 && evaluation.totalItems > 0;

  // Scenario A: Keep population, adjust budget to estimated cost
  const deltaBudget = Math.max(0, Number((evaluation.confirmedGrandTotal - evaluation.availableBudget).toFixed(2)));
  const scenarioALimitations: string[] = [];
  if (!hasCompleteData) {
    scenarioALimitations.push(
      `Faltan ${evaluation.pendingPriceCount + evaluation.pendingQuantityCount} dato(s) por definir/cotizar y/o ${evaluation.templateExampleCount} ejemplo(s); el monto requerido es parcial y aumentará al cotizar lo pendiente.`
    );
  }
  const cebaLayoutNow = isCeba
    ? calculateGrowthFinishLayout(char.animalCount, char.terrain, project.growthFinishConfig)
    : null;
  const criaLayoutNow = isCria
    ? calculateBreedingLayout(char.terrain, project.breedingConfig)
    : null;

  const scenarioA: BudgetScenarioComparison = {
    id: 'A',
    title: 'Escenario A · Mantener población y ampliar presupuesto',
    subtitle: 'Conserva íntegro el alcance técnico actual y estima el financiamiento faltante.',
    canEvaluateQuantitatively: hasEnoughConfirmedBase,
    projectedPopulationLabel: isCria
      ? `${criaLayoutNow?.gestation.sowsCount || 0} cerdas · ${criaLayoutNow?.farrowing.totalPlaces || 0} parideras`
      : `${char.animalCount} animales`,
    requiredBudgetLabel: hasEnoughConfirmedBase
      ? `${currency} $${evaluation.confirmedGrandTotal.toLocaleString()} (${
          deltaBudget > 0
            ? `+$${deltaBudget.toLocaleString()} adicionales`
            : 'cubierto con datos ingresados'
        })`
      : 'No calculable (sin costos confirmados)',
    recalculatedAreasSummary: isCeba && cebaLayoutNow
      ? [
          `Superficie libre mínima: ${cebaLayoutNow.netFreeFloorArea} m² (${cebaLayoutNow.appliedDensity} m²/cerdo)`,
          `Nave: ${cebaLayoutNow.pavilionLength}m × ${cebaLayoutNow.pavilionWidth}m (${cebaLayoutNow.pensCount} corrales)`
        ]
      : isCria && criaLayoutNow
      ? [
          `Gestación: ${criaLayoutNow.gestation.pavilionGrossArea} m² · Maternidad: ${criaLayoutNow.farrowing.totalGrossArea} m²`,
          `Ocupación productiva total: ${criaLayoutNow.totalProductiveGrossArea} m²`
        ]
      : ['Mantiene la configuración actual de etapas registradas.'],
    limitations: scenarioALimitations
  };

  // Scenario B: Keep budget, explore reduced population with real recalculated layout
  let scenarioB: BudgetScenarioComparison;
  if (!hasEnoughConfirmedBase || evaluation.availableBudget <= 0 || (!isCeba && !isCria)) {
    scenarioB = {
      id: 'B',
      title: 'Escenario B · Conservar presupuesto y explorar menor población',
      subtitle: 'Estima proporcionalmente cuántos animales podrían alojarse dentro del monto disponible.',
      canEvaluateQuantitatively: false,
      projectedPopulationLabel: 'No verificable aún',
      requiredBudgetLabel: `${currency} $${evaluation.availableBudget.toLocaleString()} (presupuesto actual)`,
      recalculatedAreasSummary: [
        'Requiere presupuesto disponible > $0 y costos confirmados para estimar proporción por animal.'
      ],
      limitations: [
        'Sin costos confirmados suficientes ni presupuesto disponible mayor a cero no se puede proyectar reducción de población con rigor.'
      ]
    };
  } else {
    const ratio = Math.min(1, evaluation.availableBudget / evaluation.confirmedGrandTotal);
    const bLimitations: string[] = [
      'Estimación lineal proporcional referencial: los costos fijos (tanque, pediluvio, fosa mínima) no bajan exactamente en la misma proporción que los animales.',
      'La densidad mínima técnica por animal se mantiene estricta sin compresión.'
    ];
    if (!hasCompleteData) {
      bLimitations.push('Cálculo basado únicamente en costos parciales confirmados hasta el momento.');
    }

    if (isCeba && cebaLayoutNow) {
      const reducedAnimals = Math.max(1, Math.floor(char.animalCount * ratio));
      const reducedLayout = calculateGrowthFinishLayout(
        reducedAnimals,
        char.terrain,
        project.growthFinishConfig
      );
      scenarioB = {
        id: 'B',
        title: 'Escenario B · Conservar presupuesto y explorar menor población',
        subtitle:
          ratio < 1
            ? `Ajuste informativo manteniendo el presupuesto disponible (${currency} $${evaluation.availableBudget.toLocaleString()}).`
            : 'El presupuesto disponible ya cubre el costo confirmado actual; no requiere reducir población.',
        canEvaluateQuantitatively: true,
        projectedPopulationLabel: `${reducedAnimals} cerdos (de ${char.animalCount})`,
        requiredBudgetLabel: `~${currency} $${Math.round(evaluation.confirmedGrandTotal * (reducedAnimals / Math.max(1, char.animalCount))).toLocaleString()} estimados`,
        recalculatedAreasSummary: [
          `Superficie libre mínima: ${reducedLayout.netFreeFloorArea} m² (${reducedLayout.appliedDensity} m²/cerdo)`,
          `Nave recalculada: ${reducedLayout.pavilionLength}m × ${reducedLayout.pavilionWidth}m (${reducedLayout.pensCount} corrales)`,
          `Bebederos mín.: ${reducedLayout.waterSystem.minDrinkersTotal} · Reserva tanque: ${reducedLayout.waterSystem.tankReserveLiters.toLocaleString()} L`,
          `Viabilidad espacial en lote: ${reducedLayout.validation.isViable ? 'Viable' : 'Requiere ajuste de lote/configuración'}`
        ],
        limitations: bLimitations
      };
    } else {
      const cfg = resolveBreedingConfig(project.breedingConfig);
      const reducedSows = Math.max(1, Math.floor(cfg.sowsCount * ratio));
      const reducedPlaces = Math.max(
        1,
        Math.round((reducedSows / Math.max(1, cfg.sowsCount)) * cfg.farrowingPlacesCount)
      );
      const reducedCfg = resolveBreedingConfig({
        ...cfg,
        sowsCount: reducedSows,
        farrowingPlacesCount: reducedPlaces,
        gestationGroupSize: Math.min(cfg.gestationGroupSize, reducedSows)
      });
      const reducedBreeding = calculateBreedingLayout(char.terrain, reducedCfg);
      scenarioB = {
        id: 'B',
        title: 'Escenario B · Conservar presupuesto y explorar menor población',
        subtitle:
          ratio < 1
            ? `Ajuste informativo de pie de cría manteniendo el presupuesto (${currency} $${evaluation.availableBudget.toLocaleString()}).`
            : 'El presupuesto disponible cubre el costo confirmado actual; no requiere reducir cerdas.',
        canEvaluateQuantitatively: true,
        projectedPopulationLabel: `${reducedSows} cerdas · ${reducedPlaces} parideras (de ${cfg.sowsCount} / ${cfg.farrowingPlacesCount})`,
        requiredBudgetLabel: `~${currency} $${Math.round(evaluation.confirmedGrandTotal * (reducedSows / Math.max(1, cfg.sowsCount))).toLocaleString()} estimados`,
        recalculatedAreasSummary: [
          `Gestación recalculada: ${reducedBreeding.gestation.pavilionLength}m × ${reducedBreeding.gestation.pavilionWidth}m (${reducedBreeding.gestation.pavilionGrossArea} m²)`,
          `Maternidad recalculada: ${reducedBreeding.farrowing.totalGrossArea} m² brutos (${reducedPlaces} parideras)`,
          `Viabilidad espacial en lote: ${reducedBreeding.validation.isViable ? 'Viable' : 'Pendiente / requiere ajuste de terreno'}`
        ],
        limitations: bLimitations
      };
    }
  }

  // Scenario C: Explore constructive/material alternatives without altering base project
  const altChanges: string[] = [];
  const altLimitations: string[] = [
    'No modifica automáticamente el diseño actual ni asume precios no cotizados.',
    'Cualquier alternativa requiere cotización real en tu zona antes de validar presupuesto.'
  ];

  if (isCeba) {
    const currentSys = project.growthFinishConfig?.housingSystem || DEFAULT_GROWTH_FINISH_CONFIG.housingSystem;
    const altSys = currentSys === 'convencional' ? 'cama_profunda' : 'convencional';
    const altLayout = calculateGrowthFinishLayout(char.animalCount, char.terrain, {
      ...project.growthFinishConfig,
      housingSystem: altSys
    });
    altChanges.push(
      altSys === 'cama_profunda'
        ? `Sistema alternativo Cama Profunda: exige ${altLayout.appliedDensity} m²/cerdo (${altLayout.netFreeFloorArea} m² libres, nave ${altLayout.pavilionLength}m × ${altLayout.pavilionWidth}m), reduce concreto de piso y reduce efluente líquido a ${altLayout.effluentSystem.pitVolumeM3} m³.`
        : `Sistema alternativo Piso Convencional: exige ${altLayout.appliedDensity} m²/cerdo (${altLayout.netFreeFloorArea} m² libres, nave ${altLayout.pavilionLength}m × ${altLayout.pavilionWidth}m), mayor obra civil en piso y fosa de ${altLayout.effluentSystem.pitVolumeM3} m³.`
    );
    if (!altLayout.validation.isViable) {
      altLimitations.push('Nota: en este lote la alternativa de sistema cambia el área requerida y no cabe sin ajustar la configuración.');
    }
  } else if (isCria) {
    const cfg = resolveBreedingConfig(project.breedingConfig);
    if (cfg.boarsCount > 0) {
      const noBoarLayout = calculateBreedingLayout(char.terrain, { ...cfg, boarsCount: 0 });
      altChanges.push(
        `Uso de inseminación artificial externa (0 verracos): libera ${breedingDiffText(criaLayoutNow, noBoarLayout)} en obra civil/corral y evita costos de verraco.`
      );
    }
    if (cfg.gestationHousing === 'jaula') {
      altChanges.push(
        'Alternativa de gestación grupal en corrales: reduce necesidad de jaulas metálicas individuales, aunque incrementa superficie libre por cerda.'
      );
    } else {
      altChanges.push(
        'Evaluar cubiertas y divisiones en materiales locales disponibles (guadua/madera tratada) manteniendo piso higiénico antideslizante.'
      );
    }
  }

  if (evaluation.materialCoverage.unverifiedMaterialsCount > 0) {
    altChanges.push(
      `Tienes ${evaluation.materialCoverage.unverifiedMaterialsCount} material(es) local(es) marcado(s) sin cantidad ni estado verificado; registrar sus cantidades reales en Caracterización permite descontar compras duplicadas.`
    );
  }
  if (altChanges.length === 0) {
    altChanges.push('Comparar cotizaciones locales por fases constructivas (primero nave principal y bioseguridad, luego anexos).');
  }

  const scenarioC: BudgetScenarioComparison = {
    id: 'C',
    title: 'Escenario C · Alternativas constructivas y materiales locales',
    subtitle: 'Explora cambios de sistema constructivo o aprovechamiento de materiales verificados.',
    canEvaluateQuantitatively: false,
    projectedPopulationLabel: isCria
      ? `${criaLayoutNow?.gestation.sowsCount || 0} cerdas · ${criaLayoutNow?.farrowing.totalPlaces || 0} parideras`
      : `${char.animalCount} animales`,
    requiredBudgetLabel: 'Pendiente de cotizar alternativa',
    recalculatedAreasSummary: altChanges,
    limitations: altLimitations
  };

  return [scenarioA, scenarioB, scenarioC];
}

function breedingDiffText(
  before: ReturnType<typeof calculateBreedingLayout> | null,
  after: ReturnType<typeof calculateBreedingLayout>
): string {
  if (!before) return 'área de reproductores';
  const diff = Number((before.totalProductiveGrossArea - after.totalProductiveGrossArea).toFixed(2));
  return diff > 0 ? `${diff} m² brutos` : 'área de verracos';
}

/**
 * Generates concrete recommendations strictly derived from observed budget & project gaps.
 * Never fabricates market prices or claims AI market analysis.
 */
export function buildBudgetRecommendations(
  project: PorciProject,
  evaluation: BudgetEvaluationSummary,
  observations: ProducerObservationDecision[]
): string[] {
  const recs: string[] = [];

  if (evaluation.totalItems === 0) {
    recs.push(
      'Genera la propuesta de rubros vinculada a tu planificación técnica para obtener cantidades trazables antes de estimar inversión.'
    );
    return recs;
  }

  if (evaluation.templateExampleCount > 0) {
    recs.push(
      `Reemplaza los ${evaluation.templateExampleCount} rubro(s) de ejemplo editable con precios cotizados reales en tu localidad; actualmente no constituyen un presupuesto válido de obra.`
    );
  }

  if (evaluation.pendingQuantityCount > 0) {
    recs.push(
      `Completa la cantidad manual de ${evaluation.pendingQuantityCount} rubro(s) pendientes (como longitudes reales de red hidráulica o número de comederos).`
    );
  }

  if (evaluation.pendingPriceCount > 0) {
    recs.push(
      `Registra cotización o precio unitario local para los ${evaluation.pendingPriceCount} rubro(s) sin valor confirmado antes de tomar decisiones financieras definitivas.`
    );
  }

  if (evaluation.status === 'deficit_estimado' && evaluation.topContributors.length > 0) {
    const top = evaluation.topContributors[0];
    const deficit = Math.abs(evaluation.balance);
    recs.push(
      `Existe un déficit confirmado de ${project.characterization.currency} $${deficit.toLocaleString()}. El rubro de mayor peso es "${top.concept}" (${top.sharePct}% del costo confirmado); revisa alternativas constructivas o financiamiento en escenarios.`
    );
  }

  if (evaluation.materialCoverage.unverifiedMaterialsCount > 0) {
    recs.push(
      `Marcaste ${evaluation.materialCoverage.checkedMaterialsCount} material(es) disponible(s) en caracterización, pero ${evaluation.materialCoverage.unverifiedMaterialsCount} aún no tienen cantidad y estado aprovechable verificados para calcular un ahorro real.`
    );
  }

  const pendingObs = observations.filter((o) => o.status === 'pendiente');
  if (pendingObs.length > 0) {
    recs.push(
      `Hay ${pendingObs.length} observación(es) del productor pendientes de confirmar; revísalas para decidir si modifican alcances o rubros.`
    );
  }

  if (recs.length === 0 && evaluation.canDeclareViable) {
    recs.push(
      'Todos los rubros esenciales tienen cantidad y fuente de precio registradas dentro del presupuesto disponible. Verifica cotizaciones vigentes antes de iniciar compras.'
    );
  }

  return recs;
}
