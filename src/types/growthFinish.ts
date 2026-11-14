/**
 * Types and interfaces for Levante-Ceba technical calculations
 * based on Resolución 136 de 2020 (MinAgricultura) & Porkcolombia Manual 2026.
 */

export type GrowthFinishWeightRange = 
  | '31_a_50'
  | '51_a_85'
  | '86_a_110'
  | 'mas_de_110';

export type GrowthFinishHousingSystem = 
  | 'convencional'
  | 'cama_profunda';

export interface GrowthFinishNormativeEntry {
  weightRange: GrowthFinishWeightRange;
  housingSystem: GrowthFinishHousingSystem;
  minAreaPerPig: number; // m²/animal
  unit: string;
  source: string;
  classification: string;
  isDefinitive: boolean;
  notes?: string;
  pendingNotice?: string;
}

export interface GrowthFinishUserConfig {
  weightRange: GrowthFinishWeightRange;
  housingSystem: GrowthFinishHousingSystem;
  customOver110Density?: number; // Only if weightRange === 'mas_de_110'
  pigsPerPen: number; // Configurable choice by producer, NOT a legal mandate
  aisleWidth: number; // Configurable aisle width in meters (e.g. 1.2m), NOT a legal mandate
  penArrangement: 'two_rows' | 'single_row'; // Configurable layout choice
  setbackDistance: number; // Retiro perimetral configurable en metros (ej. 2.5m)
}

export interface SpatialRectangle {
  id: string;
  name: string;
  category: 'galpon_ceba' | 'bodega' | 'pediluvio' | 'estercolero' | 'tanque';
  x: number; // metros desde el origen (0,0) del lote
  y: number;
  width: number; // metros
  height: number; // metros
  color: string;
}

export interface SpatialOverlapReport {
  installationA: string;
  installationB: string;
  description: string;
}

export interface WaterSystemSpecs {
  minDrinkersTotal: number; // Mínimo 1 bebedero por cada 10 cerdos (Res. 136/2020)
  minDrinkersPerPen: number; // Mínimo por corral
  drinkerFlowRate: string; // Caudal obligatorio: 1,0–1,5 L/min (Res. 136/2020)
  dailyWaterDemandLiters: number; // 8 L/cerdo/día (Manual Porkcolombia)
  autonomyDays: number; // 3 días recomendados (Manual Porkcolombia 2026)
  tankReserveLiters: number; // Litros necesarios con +20% contingencia
  tankReserveM3: number; // m³ de reserva
}

export interface FeedSystemSpecs {
  dailyIntakePerPigKg: number; // ~2.5 kg/cerdo/día en ceba
  safetyStockDays: number; // 15 días de reserva
  totalStockKg: number; // kg de alimento en bodega
  totalStockTons: number; // Toneladas
  requiredStorageAreaM2: number; // m² calculados según estibado (1.8 m²/ton + maniobra)
}

export interface EffluentSystemSpecs {
  dailyEffluentPerPigLiters: number; // ~5.5 L/cerdo/día
  retentionDays: number; // 30 días de estabilización
  pitVolumeM3: number; // m³ requeridos
  pitSurfaceM2: number; // m² de espejo superficial calculado
}

export interface GrowthFinishCalculationResult {
  // Normative parameters applied
  appliedDensity: number; // m²/animal
  densityUnit: string;
  normativeSource: string;
  normativeClassification: string;
  isDefinitive: boolean;
  pendingWarnings: string[];

  // Surface calculations (metric)
  animalCount: number;
  netFreeFloorArea: number; // m² (Superficie libre de suelo exigida normativamente)
  pensCount: number;
  netAreaPerPen: number; // m² por corral
  pigsPerPen: number;
  
  // Dimensions of Swine Pavilion (Nave)
  pavilionLength: number; // metros
  pavilionWidth: number; // metros
  pavilionGrossArea: number; // m² (incluye pasillo y muros)
  aisleWidth: number; // metros
  aisleArea: number; // m²
  pensPerRow: number;
  penWidth: number; // metros
  penLength: number; // metros

  // Auxiliary Engineering Systems (Coherent with Colombian matrix)
  waterSystem: WaterSystemSpecs;
  feedSystem: FeedSystemSpecs;
  effluentSystem: EffluentSystemSpecs;
  minLightingHours: number; // 8 horas mínimas de luz (Res. 136/2020)

  // Facilities spatial placement in lot
  rectangles: SpatialRectangle[];
  
  // Spatial validation
  validation: {
    isViable: boolean;
    fitsInsideLot: boolean;
    lotLength: number;
    lotWidth: number;
    lotArea: number;
    overlaps: SpatialOverlapReport[];
    boundaryViolations: string[];
    feasibilityNotice: string;
  };
}
