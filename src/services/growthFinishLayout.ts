import { 
  GrowthFinishUserConfig, 
  GrowthFinishCalculationResult, 
  SpatialRectangle, 
  SpatialOverlapReport,
  WaterSystemSpecs,
  FeedSystemSpecs,
  EffluentSystemSpecs
} from '../types/growthFinish';
import {
  WATER_SPECS_REFERENCE,
  LIGHTING_SPECS_REFERENCE,
  FEED_SPECS_REFERENCE,
  EFFLUENT_SPECS_REFERENCE,
  NORMATIVE_GROWTH_FINISH_MATRIX,
  DEFAULT_GROWTH_FINISH_CONFIG
} from '../constants/growthFinishMatrix';
import { findFreeSlotForModule, BoxRect, isInsideBounds, rectsOverlap } from './spatialPlacement';

/**
 * Calculates physical surfaces, auxiliary engineering systems and validates spatial placement
 * in the lot strictly upholding technical animal welfare surfaces without shrinking minimums.
 */
export function calculateGrowthFinishLayout(
  animalCount: number,
  terrain: { length: number; width: number },
  userConfig?: Partial<GrowthFinishUserConfig>
): GrowthFinishCalculationResult {
  const config: GrowthFinishUserConfig = {
    ...DEFAULT_GROWTH_FINISH_CONFIG,
    ...userConfig
  };

  const lotLength = Math.max(1, terrain?.length || 40);
  const lotWidth = Math.max(1, terrain?.width || 25);
  const lotArea = lotLength * lotWidth;

  const count = Math.max(1, animalCount || 1);

  // 1. Normative density lookup
  const normativeEntry = NORMATIVE_GROWTH_FINISH_MATRIX[config.weightRange][config.housingSystem];
  
  let appliedDensity = normativeEntry.minAreaPerPig;
  const pendingWarnings: string[] = [];

  if (!normativeEntry.isDefinitive) {
    if (config.customOver110Density && config.customOver110Density >= 1.0) {
      appliedDensity = config.customOver110Density;
    } else {
      pendingWarnings.push(
        normativeEntry.pendingNotice || 
        'Criterio técnico abierto (> 1,0 m² en más de 110 kg). Se aplica valor de guía técnica pendiente de verificación.'
      );
    }
  }

  // 2. Total Net Free Floor Area (Superficie libre de suelo requerida)
  // NEVER REDUCE THIS VALUE TO FORCE IT INTO LOT!
  const netFreeFloorArea = Number((count * appliedDensity).toFixed(2));

  // 3. Pens calculation (User configurable grouping)
  const pigsPerPen = Math.max(1, Math.min(count, Math.round(config.pigsPerPen || 12)));
  const pensCount = Math.max(1, Math.ceil(count / pigsPerPen));
  const netAreaPerPen = Number((netFreeFloorArea / pensCount).toFixed(2));

  // 4. Physical Pavilion (Nave) Dimensions (Metric)
  const aisleWidth = Math.max(0.7, Number((config.aisleWidth || 1.2).toFixed(2)));
  const penArrangement = config.penArrangement || 'two_rows';

  let pensPerRow = pensCount;
  let penLength = 3.5; // Profundidad de corral (m)
  let penWidth = 3.0; // Frente de corral (m)
  let pavilionLength = 10;
  let pavilionWidth = 6;

  if (penArrangement === 'two_rows') {
    pensPerRow = Math.ceil(pensCount / 2);
    // Diseñar corral con relación de aspecto cómoda (profundidad entre 3.0m y 5.5m)
    penLength = Math.max(3.0, Math.min(5.5, Number(Math.sqrt(netAreaPerPen * 1.2).toFixed(2))));
    penWidth = Number((netAreaPerPen / penLength).toFixed(2));
    if (penWidth < 2.0) {
      penWidth = 2.0;
      penLength = Number((netAreaPerPen / penWidth).toFixed(2));
    }
    pavilionLength = Number((pensPerRow * penWidth).toFixed(2));
    pavilionWidth = Number((2 * penLength + aisleWidth).toFixed(2));
  } else {
    // Single row
    pensPerRow = pensCount;
    penLength = Math.max(3.0, Math.min(6.0, Number(Math.sqrt(netAreaPerPen).toFixed(2))));
    penWidth = Number((netAreaPerPen / penLength).toFixed(2));
    pavilionLength = Number((pensCount * penWidth).toFixed(2));
    pavilionWidth = Number((penLength + aisleWidth).toFixed(2));
  }

  const aisleArea = Number((pavilionLength * aisleWidth).toFixed(2));
  const pavilionGrossArea = Number((pavilionLength * pavilionWidth).toFixed(2));

  // 5. Engineering Systems Calculations (Water, Feed, Effluent, Lighting)
  // Agua potable y bebederos según Res. 136/2020 Art. 8.4 y Manual Porkcolombia
  const minDrinkersTotal = Math.max(1, Math.ceil(count / WATER_SPECS_REFERENCE.drinkerRatio));
  const minDrinkersPerPen = Math.max(1, Math.ceil(pigsPerPen / WATER_SPECS_REFERENCE.drinkerRatio));
  const dailyWaterDemandLiters = Number((count * WATER_SPECS_REFERENCE.dailyIntakePerPig).toFixed(1));
  const tankReserveLiters = Number(
    (count * WATER_SPECS_REFERENCE.dailyIntakePerPig * WATER_SPECS_REFERENCE.autonomyDays * WATER_SPECS_REFERENCE.contingencyFactor).toFixed(0)
  );
  const tankReserveM3 = Number((tankReserveLiters / 1000).toFixed(2));

  const waterSystem: WaterSystemSpecs = {
    minDrinkersTotal,
    minDrinkersPerPen,
    drinkerFlowRate: WATER_SPECS_REFERENCE.drinkerFlowRate,
    dailyWaterDemandLiters,
    autonomyDays: WATER_SPECS_REFERENCE.autonomyDays,
    tankReserveLiters,
    tankReserveM3
  };

  // Bodega de alimento concentrado dimensionada dinámicamente según población
  const totalStockKg = Number((count * FEED_SPECS_REFERENCE.dailyIntakePerPigKg * FEED_SPECS_REFERENCE.safetyStockDays).toFixed(1));
  const totalStockTons = Number((totalStockKg / 1000).toFixed(2));
  const requiredStorageAreaM2 = Number(
    Math.max(8.0, totalStockTons * FEED_SPECS_REFERENCE.storageDensityM2PerTon + 3.0).toFixed(1)
  );

  const feedSystem: FeedSystemSpecs = {
    dailyIntakePerPigKg: FEED_SPECS_REFERENCE.dailyIntakePerPigKg,
    safetyStockDays: FEED_SPECS_REFERENCE.safetyStockDays,
    totalStockKg,
    totalStockTons,
    requiredStorageAreaM2
  };

  // Sistema de efluentes / estercolero dimensionado según producción y tiempo de retención
  const dailyEffluentPerPigLiters = config.housingSystem === 'cama_profunda' 
    ? 0.5 
    : EFFLUENT_SPECS_REFERENCE.dailyEffluentPerPigLiters;
  
  const pitVolumeM3 = Number(
    ((count * dailyEffluentPerPigLiters * EFFLUENT_SPECS_REFERENCE.retentionDays) / 1000).toFixed(2)
  );
  const pitSurfaceM2 = Number(
    Math.max(8.0, pitVolumeM3 / EFFLUENT_SPECS_REFERENCE.averageEffectiveDepthM).toFixed(1)
  );

  const effluentSystem: EffluentSystemSpecs = {
    dailyEffluentPerPigLiters,
    retentionDays: EFFLUENT_SPECS_REFERENCE.retentionDays,
    pitVolumeM3,
    pitSurfaceM2
  };

  const minLightingHours = LIGHTING_SPECS_REFERENCE.minHoursPerDay;

  // 6. Physical Placement in Lot with Scaled Modules
  const setback = Math.max(1.0, config.setbackDistance || 2.5);

  const pediluvioW = 3.5;
  const pediluvioH = 2.0;

  // Bodega dimensionada dinámicamente
  const bodegaW = Number(Math.max(3.5, Math.min(6.5, Math.sqrt(requiredStorageAreaM2 * 1.25))).toFixed(2));
  const bodegaH = Number(Math.max(2.5, Math.min(5.0, requiredStorageAreaM2 / bodegaW)).toFixed(2));

  // Tanque dimensionado dinámicamente según volumen m³
  let tanqueW = 2.0;
  let tanqueH = 2.0;
  if (tankReserveM3 > 8.0) {
    tanqueW = 3.2;
    tanqueH = 3.2;
  } else if (tankReserveM3 > 3.0) {
    tanqueW = 2.5;
    tanqueH = 2.5;
  }

  // Estercolero dimensionado dinámicamente según volumen de efluentes
  const estercoleroW = Number(Math.max(3.5, Math.min(7.5, Math.sqrt(pitSurfaceM2 * 1.25))).toFixed(2));
  const estercoleroH = Number(Math.max(2.5, Math.min(5.5, pitSurfaceM2 / estercoleroW)).toFixed(2));

  const auxTopRects: SpatialRectangle[] = [
    {
      id: 'pediluvio',
      name: 'Filtro Sanitario y Pediluvio',
      category: 'pediluvio',
      x: setback,
      y: setback,
      width: pediluvioW,
      height: pediluvioH,
      color: '#c084fc'
    },
    {
      id: 'bodega',
      name: `Bodega de Alimento (${requiredStorageAreaM2} m², ${totalStockTons} ton)`,
      category: 'bodega',
      x: Number((setback + pediluvioW + 1.2).toFixed(2)),
      y: setback,
      width: bodegaW,
      height: bodegaH,
      color: '#a855f7'
    },
    {
      id: 'tanque',
      name: `Tanque Hídrico (${tankReserveLiters.toLocaleString()} L, 3 días)`,
      category: 'tanque',
      x: Number((lotLength - setback - tanqueW).toFixed(2)),
      y: setback,
      width: tanqueW,
      height: tanqueH,
      color: '#60a5fa'
    }
  ];

  // Buscar la mejor ubicación para Nave + Estercolero dentro del lote sin reducir superficies
  const topAuxBottomY = Number((setback + Math.max(pediluvioH, bodegaH, tanqueH) + 1.2).toFixed(2));
  const candidatePavilionPositions: Array<{ x: number; y: number }> = [
    {
      x: Number(Math.max(setback, (lotLength - pavilionLength) / 2).toFixed(2)),
      y: Number(Math.max(topAuxBottomY, (lotWidth - pavilionWidth) / 2).toFixed(2))
    },
    {
      x: Number(Math.max(setback, (lotLength - pavilionLength) / 2).toFixed(2)),
      y: topAuxBottomY
    },
    {
      x: setback,
      y: topAuxBottomY
    },
    {
      x: setback,
      y: Number(Math.max(topAuxBottomY, (lotWidth - pavilionWidth) / 2).toFixed(2))
    },
    {
      x: setback,
      y: Number(Math.max(setback, lotWidth - setback - pavilionWidth).toFixed(2))
    }
  ];

  let chosenPavX = candidatePavilionPositions[0].x;
  let chosenPavY = candidatePavilionPositions[0].y;
  let chosenEstX = Number((lotLength - setback - estercoleroW).toFixed(2));
  let chosenEstY = Number((lotWidth - setback - estercoleroH).toFixed(2));
  let foundCleanLayout = false;

  for (const pavPos of candidatePavilionPositions) {
    const pavBox: BoxRect = { x: pavPos.x, y: pavPos.y, width: pavilionLength, height: pavilionWidth };
    const pavInside = isInsideBounds(pavBox, 0, 0, lotLength, lotWidth);
    const pavHitsAux = auxTopRects.some(a => rectsOverlap(pavBox, a, 0.3));
    if (!pavInside || pavHitsAux) continue;

    const obstacles: BoxRect[] = [...auxTopRects, pavBox];
    const freeEst = findFreeSlotForModule(
      estercoleroW,
      estercoleroH,
      lotLength,
      lotWidth,
      setback,
      obstacles,
      'bottom-right'
    );
    if (freeEst) {
      chosenPavX = pavPos.x;
      chosenPavY = pavPos.y;
      chosenEstX = freeEst.x;
      chosenEstY = freeEst.y;
      foundCleanLayout = true;
      break;
    }
  }

  // Si ningún candidato de nave permitió ubicar el estercolero limpio, intentar ubicar al menos el estercolero en zona libre con la posición base
  if (!foundCleanLayout) {
    const basePav: BoxRect = { x: chosenPavX, y: chosenPavY, width: pavilionLength, height: pavilionWidth };
    const freeEst = findFreeSlotForModule(
      estercoleroW,
      estercoleroH,
      lotLength,
      lotWidth,
      setback,
      [...auxTopRects, basePav],
      'bottom-right'
    );
    if (freeEst) {
      chosenEstX = freeEst.x;
      chosenEstY = freeEst.y;
    }
  }

  const rectangles: SpatialRectangle[] = [
    ...auxTopRects,
    {
      id: 'estercolero',
      name: `Fosa / Estercolero (${pitVolumeM3} m³, ${pitSurfaceM2} m²)`,
      category: 'estercolero',
      x: chosenEstX,
      y: chosenEstY,
      width: estercoleroW,
      height: estercoleroH,
      color: '#f97316'
    },
    {
      id: 'galpon_ceba',
      name: `Nave de Ceba (${pensCount} corrales, ${netFreeFloorArea} m² libres)`,
      category: 'galpon_ceba',
      x: chosenPavX,
      y: chosenPavY,
      width: pavilionLength,
      height: pavilionWidth,
      color: '#6b21a8'
    }
  ];

  // 6. Strict Spatial Validation: Boundary Containment & Overlap Detection
  const boundaryViolations: string[] = [];
  const overlaps: SpatialOverlapReport[] = [];

  // Boundary check
  rectangles.forEach(r => {
    if (r.x < 0 || r.y < 0) {
      boundaryViolations.push(`${r.name} se posiciona fuera del origen del terreno (x < 0 o y < 0).`);
    }
    if (r.x + r.width > lotLength) {
      const exceed = (r.x + r.width - lotLength).toFixed(2);
      boundaryViolations.push(`${r.name} sobrepasa el largo del lote por ${exceed} m (Largo disponible: ${lotLength} m, Extremo: ${(r.x + r.width).toFixed(2)} m).`);
    }
    if (r.y + r.height > lotWidth) {
      const exceed = (r.y + r.height - lotWidth).toFixed(2);
      boundaryViolations.push(`${r.name} sobrepasa el ancho del lote por ${exceed} m (Ancho disponible: ${lotWidth} m, Extremo: ${(r.y + r.height).toFixed(2)} m).`);
    }
  });

  // Overlap check (Axis-Aligned Bounding Box Collision)
  for (let i = 0; i < rectangles.length; i++) {
    for (let j = i + 1; j < rectangles.length; j++) {
      const rA = rectangles[i];
      const rB = rectangles[j];

      const overlapX = Math.max(0, Math.min(rA.x + rA.width, rB.x + rB.width) - Math.max(rA.x, rB.x));
      const overlapY = Math.max(0, Math.min(rA.y + rA.height, rB.y + rB.height) - Math.max(rA.y, rB.y));

      if (overlapX > 0.05 && overlapY > 0.05) {
        overlaps.push({
          installationA: rA.name,
          installationB: rB.name,
          description: `Superposición física de ${overlapX.toFixed(2)} m × ${overlapY.toFixed(2)} m entre "${rA.name}" y "${rB.name}".`
        });
      }
    }
  }

  const fitsInsideLot = boundaryViolations.length === 0;
  const isViable = fitsInsideLot && overlaps.length === 0;

  let feasibilityNotice = 'Distribución espacial viable y validada.';
  if (!isViable) {
    if (!fitsInsideLot && overlaps.length > 0) {
      feasibilityNotice = 'DISTRIBUCIÓN NO VIABLE: Las dimensiones calculadas de las instalaciones sobrepasan los límites del lote y presentan colisiones con otras áreas. La superficie mínima técnica no se reduce para forzar que el diseño quepa.';
    } else if (!fitsInsideLot) {
      feasibilityNotice = 'DISTRIBUCIÓN NO VIABLE: La nave de ceba o sus instalaciones anexas exceden las dimensiones del terreno. Amplíe el lote, ajuste la configuración de corrales o reduzca la población animal.';
    } else {
      feasibilityNotice = 'DISTRIBUCIÓN NO VIABLE: Existen superposiciones físicas entre instalaciones dentro del predio. Ajuste los retiros, el arreglo de filas o use el asistente de ajuste automático.';
    }
  }

  return {
    appliedDensity,
    densityUnit: normativeEntry.unit,
    normativeSource: normativeEntry.source,
    normativeClassification: normativeEntry.classification,
    isDefinitive: normativeEntry.isDefinitive,
    pendingWarnings,

    animalCount: count,
    netFreeFloorArea,
    pensCount,
    netAreaPerPen,
    pigsPerPen,

    pavilionLength,
    pavilionWidth,
    pavilionGrossArea,
    aisleWidth,
    aisleArea,
    pensPerRow,
    penWidth,
    penLength,

    // Auxiliary Engineering Systems
    waterSystem,
    feedSystem,
    effluentSystem,
    minLightingHours,

    rectangles,

    validation: {
      isViable,
      fitsInsideLot,
      lotLength,
      lotWidth,
      lotArea,
      overlaps,
      boundaryViolations,
      feasibilityNotice
    }
  };
}
