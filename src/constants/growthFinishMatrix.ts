import { 
  GrowthFinishWeightRange, 
  GrowthFinishHousingSystem, 
  GrowthFinishNormativeEntry,
  GrowthFinishUserConfig
} from '../types/growthFinish';

export const WEIGHT_RANGE_OPTIONS: Array<{
  id: GrowthFinishWeightRange;
  label: string;
  stageName: string;
  description: string;
}> = [
  {
    id: '31_a_50',
    label: '31 a 50 kg',
    stageName: 'Levante Inicial',
    description: 'Etapa de adaptación y desarrollo temprano posterior al precebo.'
  },
  {
    id: '51_a_85',
    label: '51 a 85 kg',
    stageName: 'Levante / Ceba Media',
    description: 'Etapa de máximo crecimiento óseo y muscular.'
  },
  {
    id: '86_a_110',
    label: '86 a 110 kg',
    stageName: 'Ceba Finalización (Estándar Colombia)',
    description: 'Peso comercial típico de salida a beneficio en el mercado colombiano.'
  },
  {
    id: 'mas_de_110',
    label: 'Más de 110 kg',
    stageName: 'Ceba Pesada / Extra',
    description: 'Animales con destino a desposte especializado o maduración cárnica prolongada.'
  }
];

export const HOUSING_SYSTEM_OPTIONS: Array<{
  id: GrowthFinishHousingSystem;
  label: string;
  description: string;
  technicalDetails: string;
}> = [
  {
    id: 'convencional',
    label: 'Piso Convencional (Concreto / Slats)',
    description: 'Pisos rígidos lavables en concreto con estrías antideslizantes o piso ranurado plástico/concreto (slats).',
    technicalDetails: 'Requiere lavado periódico y canaletas de desagüe conectadas al sistema de efluentes.'
  },
  {
    id: 'cama_profunda',
    label: 'Cama Profunda (Cascarilla / Viruta)',
    description: 'Sistema alternativo sobre sustrato vegetal absorbente (cascarilla de arroz, viruta de madera o paja picada).',
    technicalDetails: 'Demanda mayor superficie libre por animal para compostaje in situ y absorción de excretas.'
  }
];

/**
 * Matriz de superficie libre mínima de suelo por rango de peso y tipo de piso
 * basada en criterios técnicos de bienestar animal y diseño porcícola.
 */
export const NORMATIVE_GROWTH_FINISH_MATRIX: Record<
  GrowthFinishWeightRange,
  Record<GrowthFinishHousingSystem, GrowthFinishNormativeEntry>
> = {
  '31_a_50': {
    convencional: {
      weightRange: '31_a_50',
      housingSystem: 'convencional',
      minAreaPerPig: 0.50,
      unit: 'm²/animal',
      source: 'Manual Técnico de Construcciones Porcícolas (Criterios de Bienestar)',
      classification: 'Superficie de suelo libre mínima recomendada',
      isDefinitive: true,
      notes: 'Superficie neta sin computar espacio ocupado por comederos o bebederos.'
    },
    cama_profunda: {
      weightRange: '31_a_50',
      housingSystem: 'cama_profunda',
      minAreaPerPig: 0.75,
      unit: 'm²/animal',
      source: 'Manual Técnico de Construcciones Porcícolas (Criterios de Bienestar)',
      classification: 'Superficie de suelo libre mínima recomendada',
      isDefinitive: true,
      notes: 'Sustrato vegetal absorbente con remoción y aireación periódica.'
    }
  },
  '51_a_85': {
    convencional: {
      weightRange: '51_a_85',
      housingSystem: 'convencional',
      minAreaPerPig: 0.72,
      unit: 'm²/animal',
      source: 'Manual Técnico de Construcciones Porcícolas (Criterios de Bienestar)',
      classification: 'Superficie de suelo libre mínima recomendada',
      isDefinitive: true,
      notes: 'Garantiza espacio simultáneo para descanso de todos los animales echados de costado.'
    },
    cama_profunda: {
      weightRange: '51_a_85',
      housingSystem: 'cama_profunda',
      minAreaPerPig: 1.82,
      unit: 'm²/animal',
      source: 'Matriz Técnica PorciPlan (Cama Profunda)',
      classification: 'Superficie de suelo libre mínima recomendada',
      isDefinitive: true,
      notes: 'Área libre requerida en cama profunda según matriz técnica de referencia (1,82 m²/cerdo).'
    }
  },
  '86_a_110': {
    convencional: {
      weightRange: '86_a_110',
      housingSystem: 'convencional',
      minAreaPerPig: 1.00,
      unit: 'm²/animal',
      source: 'Manual Técnico de Construcciones Porcícolas (Criterios de Bienestar)',
      classification: 'Superficie de suelo libre mínima recomendada',
      isDefinitive: true,
      notes: 'Estándar para finalización típica de cerdos comerciales (100-110 kg).'
    },
    cama_profunda: {
      weightRange: '86_a_110',
      housingSystem: 'cama_profunda',
      minAreaPerPig: 1.50,
      unit: 'm²/animal',
      source: 'Manual Técnico de Construcciones Porcícolas (Criterios de Bienestar)',
      classification: 'Superficie de suelo libre mínima recomendada',
      isDefinitive: true,
      notes: 'Área libre requerida en cama profunda para finalización de ceba.'
    }
  },
  'mas_de_110': {
    convencional: {
      weightRange: 'mas_de_110',
      housingSystem: 'convencional',
      minAreaPerPig: 1.15,
      unit: 'm²/animal',
      source: 'Guía Técnica de Construcciones Porcícolas (> 1,0 m² mínimo, guía 1,15 m²)',
      classification: 'Referencia técnica ajustable para ceba pesada',
      isDefinitive: false,
      pendingNotice: 'Para pesos superiores a 110 kg se requiere superar 1,00 m²/animal; se aplica la referencia técnica de 1,15 m²/cerdo sujeta al peso final estimado.',
      notes: 'Para pesos superiores a 110 kg se debe evitar el sobrecalentamiento y estrés calórico.'
    },
    cama_profunda: {
      weightRange: 'mas_de_110',
      housingSystem: 'cama_profunda',
      minAreaPerPig: 1.65,
      unit: 'm²/animal',
      source: 'Guía Técnica de Construcciones Porcícolas (> 1,50 m² mínimo, guía 1,65 m²)',
      classification: 'Referencia técnica ajustable para ceba pesada',
      isDefinitive: false,
      pendingNotice: 'Para cama profunda sobre 110 kg se requiere superar 1,50 m²/animal; se aplica la referencia técnica de 1,65 m²/cerdo sujeta al peso de salida.',
      notes: 'Espacio ampliado para permitir el levantamiento y descanso sin interferencias de la cama profunda.'
    }
  }
};

export const DEFAULT_GROWTH_FINISH_CONFIG: GrowthFinishUserConfig = {
  weightRange: '86_a_110',
  housingSystem: 'convencional',
  pigsPerPen: 12,
  aisleWidth: 1.2,
  penArrangement: 'two_rows',
  setbackDistance: 2.5
};

/**
 * Criterios técnicos de ingeniería y bienestar animal según Matriz Técnica de Referencia
 */
export const WATER_SPECS_REFERENCE = {
  drinkerRatio: 10, // 1 chupón por cada 10 cerdos
  drinkerFlowRate: '1,0 – 1,5 L/min', // Caudal recomendado para cerdos de 20 a 100 kg
  dailyIntakePerPig: 8, // Litros/animal/día en levante-ceba
  autonomyDays: 3, // Autonomía mínima recomendada de almacenamiento de 3 días
  contingencyFactor: 1.20 // +20% margen de contingencia técnica
};

export const LIGHTING_SPECS_REFERENCE = {
  minHoursPerDay: 8, // Mínimo 8 horas de luz natural o artificial al día
  source: 'Estándar Técnico de Bienestar Animal'
};

export const FEED_SPECS_REFERENCE = {
  dailyIntakePerPigKg: 2.5,
  safetyStockDays: 15,
  storageDensityM2PerTon: 1.8
};

export const EFFLUENT_SPECS_REFERENCE = {
  dailyEffluentPerPigLiters: 5.5,
  retentionDays: 30,
  averageEffectiveDepthM: 1.3
};

export const COLOMBIAN_REGULATORY_FRAMEWORK = [
  {
    code: 'Bienestar',
    authority: 'Alojamiento',
    title: 'Superficie Libre, Agua e Iluminación',
    scope: 'Superficie libre adecuada, bebederos suficientes (1/10 cerdos, caudal 1,0-1,5 L/min), iluminación mín. 8h/día, zonas seca/húmeda.'
  },
  {
    code: 'Bioseguridad',
    authority: 'Sanidad',
    title: 'Control de Acceso y Flujo Limpio-Sucio',
    scope: 'Delimitación perimetral, pediluvio de ingreso y separación de áreas productivas.'
  },
  {
    code: 'Efluentes',
    authority: 'Ambiente',
    title: 'Gestión Segura de la Porcinaza',
    scope: 'Impermeabilización de estercoleros/fosas y manejo sin descargas directas a fuentes de agua.'
  }
];

