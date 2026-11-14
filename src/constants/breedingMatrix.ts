import {
  BreedingGroupSizeBand,
  BreedingSowCategory,
  BreedingUserConfig
} from '../types/breeding';

/**
 * Parámetros técnicos de referencia para instalaciones de Cría
 * (Gestación, Maternidad y Reproductores).
 */

export const DEFAULT_BREEDING_CONFIG: BreedingUserConfig = {
  sowsCount: 20,
  boarsCount: 1,
  farrowingPlacesCount: 6,
  farrowingRoomsCount: 2,

  gestationHousing: 'grupal',
  gestationSowCategory: 'adulta',
  gestationGroupSize: 10,
  gestationCrateLength: 2.20,
  gestationCrateWidth: 0.65,

  farrowingPlaceLength: 2.30,
  farrowingPlaceWidth: 2.00,

  boarPenArea: 7.0,

  aisleWidth: 0.90,
  setbackDistance: 2.5
};

export const GROUP_GESTATION_DENSITY_MATRIX: Record<
  BreedingGroupSizeBand,
  {
    label: string;
    joven: number;
    adulta: number;
    source: string;
    classification: 'Criterio técnico de bienestar';
  }
> = {
  menor_6: {
    label: 'Grupo menor a 6 cerdas (< 6)',
    joven: 1.81,
    adulta: 2.48,
    source: 'Guía Técnica de Bienestar Animal Porcino',
    classification: 'Criterio técnico de bienestar'
  },
  de_6_a_39: {
    label: 'Grupo de 6 a 39 cerdas (6–39)',
    joven: 1.64,
    adulta: 2.25,
    source: 'Guía Técnica de Bienestar Animal Porcino',
    classification: 'Criterio técnico de bienestar'
  },
  de_40_o_mas: {
    label: 'Grupo de 40 o más cerdas (≥ 40)',
    joven: 1.49,
    adulta: 2.05,
    source: 'Guía Técnica de Bienestar Animal Porcino',
    classification: 'Criterio técnico de bienestar'
  }
};

export function resolveGroupSizeBand(groupSize: number): {
  band: BreedingGroupSizeBand;
  entry: (typeof GROUP_GESTATION_DENSITY_MATRIX)[BreedingGroupSizeBand];
} {
  if (groupSize < 6) {
    return { band: 'menor_6', entry: GROUP_GESTATION_DENSITY_MATRIX.menor_6 };
  }
  if (groupSize <= 39) {
    return { band: 'de_6_a_39', entry: GROUP_GESTATION_DENSITY_MATRIX.de_6_a_39 };
  }
  return { band: 'de_40_o_mas', entry: GROUP_GESTATION_DENSITY_MATRIX.de_40_o_mas };
}

export function getGroupGestationDensity(
  groupSize: number,
  sowCategory: BreedingSowCategory
): {
  areaPerSow: number;
  bandLabel: string;
  source: string;
  classification: 'Criterio técnico de bienestar';
} {
  const { entry } = resolveGroupSizeBand(groupSize);
  return {
    areaPerSow: entry[sowCategory],
    bandLabel: entry.label,
    source: entry.source,
    classification: entry.classification
  };
}

export const GESTATION_CRATE_REFERENCE = {
  minLengthM: 2.10,
  maxLengthM: 2.40,
  defaultLengthM: 2.20,
  minWidthM: 0.60,
  maxWidthM: 0.70,
  defaultWidthM: 0.65,
  source: 'Manual Técnico de Construcciones Porcícolas',
  classification: 'Recomendación técnica / referencia de bienestar' as const,
  warningNote:
    'Dimensión referencial. Se recomienda priorizar alojamiento grupal cuando el lote y el manejo lo permitan.'
};

export const FARROWING_REFERENCE = {
  sowCrateEffectiveWidthM: 0.70,
  pigletStripEachSideM: 0.65,
  recommendedTotalWidthM: 2.00,
  minLengthM: 2.20,
  maxLengthM: 2.40,
  defaultLengthM: 2.30,
  source: 'Manual Técnico de Construcciones Porcícolas',
  classification: 'Criterio funcional + parámetro configurable' as const,
  note:
    'No existe una superficie numérica única fija para lactancia; se dimensiona permitiendo postura cómoda y resguardo térmico para lechones (referencia: 0,70 m jaula + 0,65 m por lado).'
};

export const BOAR_PEN_REFERENCE = {
  normativeMinAreaM2: 6.0,
  normativeMinWidthM: 2.20,
  recommendedAreaM2: 7.0,
  recommendedFenceHeightM: 1.20,
  crateAlternative: '2,40 × 0,70 m',
  source: 'Manual Técnico de Construcciones Porcícolas',
  classification: 'Criterio técnico + recomendación de diseño' as const,
  note:
    'Superficie mínima recomendada: ≥ 6 m² con ancho ≥ 2,20 m (se sugieren ≥ 7 m² y cerramiento de 1,20 m para mayor comodidad).'
};

export const BREEDING_AISLE_REFERENCE = {
  feedAisleM: 0.70,
  sowAccessAisleM: 0.90,
  source: 'Manual Técnico de Construcciones Porcícolas',
  classification: 'Recomendación técnica' as const,
  note:
    'Referencia de 0,90 m para circulación de cerdas y 0,70 m para pasillo de alimentación, con piso antideslizante y sin encharcamientos.'
};

export const BREEDING_WATER_REFERENCE = {
  gestationLitersPerDay: 18,
  lactationLitersPerDay: 22,
  pigletNursingLitersPerDay: 0.6,
  boarLitersPerDay: 16,
  drinkerFlowRate: '1,5 – 2,0 L/min',
  autonomyDays: 3,
  contingencyFactor: 1.20,
  sourceDemand: 'Manual Técnico de Construcciones Porcícolas',
  sourceFlow: 'Criterios Técnicos de Hidratación Porcina'
};

export const BREEDING_WELFARE_REFERENCE = {
  minLightingHoursPerDay: 8,
  lightingSource: 'Estándar Técnico de Bienestar Animal',
  pigletHeatingRule:
    'Proveer fuente de calor suplementario para lechones durante la lactancia cuando las condiciones climáticas locales lo requieran.',
  pigletHeatingSource: 'Criterios Técnicos de Manejo Térmico'
};
