/**
 * Types and models for PorciPlan
 */

import { GrowthFinishUserConfig } from './growthFinish';
import { BreedingUserConfig } from './breeding';

export type ProductiveOrientation = 'cria' | 'ceba' | 'ciclo_completo';


export type TopographyType = 'plano' | 'leve_pendiente' | 'ondulado';

export type WaterSourceType = 'acueducto' | 'pozo_profundo' | 'quebrada_rio' | 'reservorio_lluvia';

export type BudgetCategory =
  | 'obras_civiles'
  | 'divisiones_corrales'
  | 'equipamiento'
  | 'hidraulico_electrico'
  | 'bioseguridad_ambiental'
  | 'transporte_mano_obra'
  | 'imprevistos';

export type BudgetQuantitySource = 'calculada' | 'productor' | 'sugerida' | 'pendiente';

export type BudgetPriceSource =
  | 'cotizacion'
  | 'precio_local'
  | 'calculo_unitario'
  | 'pendiente'
  | 'ejemplo_editable';

export type BudgetStageTag =
  | 'ceba'
  | 'gestacion'
  | 'maternidad'
  | 'verracos'
  | 'precebo'
  | 'compartido'
  | 'general';

export interface BudgetItem {
  id: string;
  category: BudgetCategory;
  concept: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string;

  // Provenance, verifiability & backwards-compatible optional fields
  quantitySource?: BudgetQuantitySource;
  quantityOrigin?: string;
  quantityPending?: boolean;
  originalQuantity?: number;
  discountedQuantity?: number;
  discountExplanation?: string;

  priceSource?: BudgetPriceSource;
  unitCostPending?: boolean;
  supplierOrRef?: string;
  quoteDate?: string;

  stageTag?: BudgetStageTag;
  isEssential?: boolean;
  isTemplateExample?: boolean;
  linkedMaterialEntryId?: string;
  localMaterialCost?: number;
}

export type MaterialConditionStatus =
  | 'pendiente_verificar'
  | 'bueno'
  | 'regular_aprovechable'
  | 'no_apto';

export interface MaterialInventoryEntry {
  id: string;
  materialId: string;
  label: string;
  sourceKind: 'predio_zona' | 'recuperable_infra';
  availableQuantity?: number;
  unit: string;
  usableCondition: MaterialConditionStatus;
  intendedUse: string;
  purchaseOrTransportCost?: number;
  notes?: string;
}

export interface ProducerObservationDecision {
  id: string;
  sourceField: 'notes' | 'existingInfraDetails' | 'otherMaterials' | 'technicalNotes';
  sourceLabel: string;
  excerpt: string;
  detectedHint: string;
  status: 'pendiente' | 'confirmada' | 'descartada';
  affectedBudgetItemId?: string;
  actionNote?: string;
}

export interface ProjectCharacterization {
  id: string;
  name: string;
  producerName: string;
  location: string;
  orientation: ProductiveOrientation;
  animalCount: number;
  terrain: {
    length: number; // metros
    width: number;  // metros
    totalArea: number; // m2 (length * width)
    topography: TopographyType;
  };
  hasExistingInfrastructure: boolean;
  existingInfraDetails: string;
  availableBudget: number;
  currency: string;
  availableMaterials: string[];
  otherMaterials: string;
  materialDetails?: MaterialInventoryEntry[];
  waterSource: WaterSourceType;
  hasElectricity: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicalZoneSpec {
  id: string;
  name: string;
  category: 'produccion' | 'almacen' | 'sanidad_ambiental' | 'circulacion';
  description: string;
  orientationSuitability: ProductiveOrientation[];
  recommendedFloor: string;
  ventilationNotes: string;
  waterDrainageNotes: string;
  userCustomNotes?: string;
}

export interface PorciProject {
  characterization: ProjectCharacterization;
  budgetItems: BudgetItem[];
  technicalNotes: Record<string, string>;
  growthFinishConfig?: GrowthFinishUserConfig;
  breedingConfig?: BreedingUserConfig;
  observationDecisions?: ProducerObservationDecision[];
  status: 'borrador' | 'en_planificacion' | 'validado';
}

