/**
 * Types and interfaces for Cría (Gestación, Maternidad y Reproductores)
 * technical planning and 2D spatial layout.
 * Strictly based on verified parameters from Resolución 136 de 2020
 * and Manual de Construcciones Porcícolas Porkcolombia (2023 / 2026).
 */

export type BreedingGestationHousing = 'grupal' | 'jaula';

export type BreedingSowCategory = 'joven' | 'adulta';

export type BreedingGroupSizeBand = 'menor_6' | 'de_6_a_39' | 'de_40_o_mas';

export type BreedingClassification =
  | 'Criterio técnico de bienestar'
  | 'Criterio funcional + parámetro configurable'
  | 'Recomendación técnica'
  | 'Recomendación técnica / referencia de bienestar'
  | 'Criterio técnico + recomendación de diseño'
  | 'Parámetro configurable / referencial';

export interface BreedingUserConfig {
  // Explicit reproductive population (never auto-inferred from general animalCount)
  sowsCount: number; // Cerdas en gestación / pie de cría
  boarsCount: number; // Verracos reproductores / receladores (0 = sin verraco / IA)
  farrowingPlacesCount: number; // Plazas o jaulas parideras totales en maternidad
  farrowingRoomsCount: number; // Salas independientes de maternidad

  // Gestation configuration
  gestationHousing: BreedingGestationHousing;
  gestationSowCategory: BreedingSowCategory;
  gestationGroupSize: number; // Tamaño de grupo en gestación grupal
  gestationCrateLength: number; // Largo de jaula gestación (m) - ref 2.10–2.40 m
  gestationCrateWidth: number; // Ancho de jaula gestación (m) - ref 0.60–0.70 m

  // Farrowing / Lactation configuration (configurable, no numeric legal minimum in Res. 136/2020)
  farrowingPlaceLength: number; // Largo de paridera (m) - ref Manual 2026: 2.20–2.40 m
  farrowingPlaceWidth: number; // Ancho total de paridera incl. franja lechones (m) - ref Manual 2026: 2.00 m (0.70 + 2*0.65)

  // Boar pen configuration (Res. 136: >= 6 m², width >= 2.20 m; Manual 2023: >= 7 m²)
  boarPenArea: number; // m² por corral de verraco

  // Circulation & Perimeter
  aisleWidth: number; // Ancho de corredor/pasillo (m) - ref Manual 2026: 0.70 aliment. / 0.90 acceso cerdas
  setbackDistance: number; // Retiro perimetral en el lote (m)
}

export interface BreedingSpatialRectangle {
  id: string;
  name: string;
  category:
    | 'gestacion'
    | 'maternidad'
    | 'verracos'
    | 'bodega'
    | 'pediluvio'
    | 'estercolero'
    | 'tanque';
  x: number; // metros desde origen (0,0) del lote
  y: number;
  width: number; // metros (eje X / Este-Oeste)
  height: number; // metros (eje Y / Norte-Sur)
  color: string;
  source: string;
  classification: string;
  details?: string;
}

export interface BreedingSpatialOverlapReport {
  installationA: string;
  installationB: string;
  description: string;
}

export interface BreedingWaterSpecs {
  gestationDailyLiters: number; // 18 L/cerda/día (Manual Porkcolombia 2023)
  lactationDailyLiters: number; // 22 L/cerda/día (Manual Porkcolombia 2023)
  boarDailyLiters: number; // 16 L/verraco/día (Manual Porkcolombia 2023)
  totalDailyLiters: number;
  autonomyDays: number; // 3 días (Manual Porkcolombia 2026)
  contingencyFactor: number; // +20% (Manual Porkcolombia 2026)
  tankReserveLiters: number;
  tankReserveM3: number;
  drinkerFlowRate: string; // 1,5 - 2,0 L/min (Res. 136/2020 apart. 8.4)
  source: string;
  classification: string;
}

export interface BreedingCalculationResult {
  config: BreedingUserConfig;

  // 1. Gestación
  gestation: {
    sowsCount: number;
    housing: BreedingGestationHousing;
    sowCategory: BreedingSowCategory;
    groupSize: number;
    groupBandLabel: string;
    appliedAreaPerSow: number; // m²/cerda (grupal) o m²/jaula
    unitLabel: string;
    unitsCount: number; // Corrales grupales o jaulas individuales
    unitsPerRow: number;
    rowsCount: number;
    unitWidth: number; // m
    unitLength: number; // m
    netArea: number; // m² netos de alojamiento
    aisleWidth: number; // m
    pavilionLength: number; // m
    pavilionWidth: number; // m
    pavilionGrossArea: number; // m²
    source: string;
    classification: BreedingClassification;
    note: string;
  };

  // 2. Maternidad / Lactancia
  farrowing: {
    totalPlaces: number;
    roomsCount: number;
    placesPerRoom: number;
    placeLength: number; // m
    placeWidth: number; // m
    areaPerPlace: number; // m²
    netPlacesArea: number; // m² solo plazas
    rowsPerRoom: number;
    placesPerRowInRoom: number;
    roomLength: number; // m
    roomWidth: number; // m
    roomGrossArea: number; // m² por sala
    totalGrossArea: number; // m² todas las salas
    aisleWidth: number; // m
    source: string;
    classification: BreedingClassification;
    note: string;
  };

  // 3. Verracos / Reproductores (0 = no aplica)
  boars: {
    enabled: boolean;
    boarsCount: number;
    areaPerPen: number; // m²
    penWidth: number; // m (>= 2.20 m normativo cuando aplica)
    penLength: number; // m
    totalGrossArea: number; // m²
    meetsNormativeMinimum: boolean;
    source: string;
    classification: BreedingClassification;
    note: string;
  };

  // 4. Sistemas complementarios verificados
  waterSystem: BreedingWaterSpecs;
  lightingHoursMin: number; // 8 horas/día (Res. 136/2020 apart. 8.2)
  pigletHeatingNote: string; // Res. 136/2020 apart. 8.7

  // 5. Totales constructivos y advertencias de datos
  totalProductiveGrossArea: number; // m² (Gestación + Maternidad + Verracos)
  totalOccupiedFootprintArea: number; // m² (incluye auxiliares en plano)
  pendingInputs: string[];
  normativeNotes: Array<{
    component: string;
    value: string;
    classification: string;
    source: string;
  }>;

  // 6. Plano geométrico compartido (en metros reales)
  rectangles: BreedingSpatialRectangle[];

  // 7. Validación espacial estricta
  validation: {
    hasValidTerrain: boolean;
    isViable: boolean;
    fitsInsideLot: boolean;
    lotLength: number;
    lotWidth: number;
    lotArea: number;
    overlaps: BreedingSpatialOverlapReport[];
    boundaryViolations: string[];
    feasibilityNotice: string;
  };
}
