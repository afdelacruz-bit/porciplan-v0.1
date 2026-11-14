import {
  BreedingCalculationResult,
  BreedingSpatialOverlapReport,
  BreedingSpatialRectangle,
  BreedingUserConfig
} from '../types/breeding';
import {
  BOAR_PEN_REFERENCE,
  BREEDING_AISLE_REFERENCE,
  BREEDING_WATER_REFERENCE,
  BREEDING_WELFARE_REFERENCE,
  DEFAULT_BREEDING_CONFIG,
  FARROWING_REFERENCE,
  GESTATION_CRATE_REFERENCE,
  getGroupGestationDensity
} from '../constants/breedingMatrix';
import { findFreeSlotForModule } from './spatialPlacement';

const round2 = (n: number): number => Number(n.toFixed(2));

/**
 * Resuelve la configuración de cría con valores predeterminados seguros
 * para conservar retrocompatibilidad con proyectos antiguos sin `breedingConfig`.
 */
export function resolveBreedingConfig(
  userConfig?: Partial<BreedingUserConfig>
): BreedingUserConfig {
  const merged = {
    ...DEFAULT_BREEDING_CONFIG,
    ...userConfig
  };

  return {
    sowsCount: Math.max(0, Math.round(Number(merged.sowsCount) || 0)),
    boarsCount: Math.max(0, Math.round(Number(merged.boarsCount) || 0)),
    farrowingPlacesCount: Math.max(0, Math.round(Number(merged.farrowingPlacesCount) || 0)),
    farrowingRoomsCount: Math.max(1, Math.round(Number(merged.farrowingRoomsCount) || 1)),

    gestationHousing: merged.gestationHousing === 'jaula' ? 'jaula' : 'grupal',
    gestationSowCategory: merged.gestationSowCategory === 'joven' ? 'joven' : 'adulta',
    gestationGroupSize: Math.max(1, Math.round(Number(merged.gestationGroupSize) || 10)),
    gestationCrateLength: Math.max(
      1.8,
      Math.min(3.0, Number(merged.gestationCrateLength) || GESTATION_CRATE_REFERENCE.defaultLengthM)
    ),
    gestationCrateWidth: Math.max(
      0.55,
      Math.min(1.0, Number(merged.gestationCrateWidth) || GESTATION_CRATE_REFERENCE.defaultWidthM)
    ),

    farrowingPlaceLength: Math.max(
      1.8,
      Math.min(3.2, Number(merged.farrowingPlaceLength) || FARROWING_REFERENCE.defaultLengthM)
    ),
    farrowingPlaceWidth: Math.max(
      1.4,
      Math.min(3.0, Number(merged.farrowingPlaceWidth) || FARROWING_REFERENCE.recommendedTotalWidthM)
    ),

    boarPenArea: Math.max(
      BOAR_PEN_REFERENCE.normativeMinAreaM2,
      Number(merged.boarPenArea) || BOAR_PEN_REFERENCE.recommendedAreaM2
    ),

    aisleWidth: Math.max(0.7, Math.min(2.5, Number(merged.aisleWidth) || 0.9)),
    setbackDistance: Math.max(1.0, Math.min(15.0, Number(merged.setbackDistance) || 2.5))
  };
}

/**
 * Motor único geométrico y normativo para explotaciones de Cría.
 * Consumido simultáneamente por Planificación Técnica, Diseño Esquemático 2D y Resultados.
 *
 * Principio estricto:
 * - Nunca reduce áreas mínimas ni comprime módulos para forzar que quepan en el lote.
 * - Si faltan dimensiones válidas del terreno o datos poblacionales obligatorios,
 *   reporta que la validación espacial está pendiente y NO marca la distribución como viable.
 */
export function calculateBreedingLayout(
  terrain: { length: number; width: number },
  userConfig?: Partial<BreedingUserConfig>
): BreedingCalculationResult {
  const config = resolveBreedingConfig(userConfig);
  const pendingInputs: string[] = [];

  const rawLength = Number(terrain?.length || 0);
  const rawWidth = Number(terrain?.width || 0);
  const hasValidTerrain = rawLength > 0 && rawWidth > 0;

  if (!hasValidTerrain) {
    pendingInputs.push(
      'Faltan dimensiones válidas del terreno (largo y ancho > 0 m) en Caracterización para validar la cabida espacial.'
    );
  }
  if (config.sowsCount <= 0) {
    pendingInputs.push('Debe registrar al menos 1 cerda de gestación / pie de cría.');
  }
  if (config.farrowingPlacesCount <= 0) {
    pendingInputs.push('Debe registrar al menos 1 plaza o paridera de maternidad.');
  }

  // Referencia de dibujo si el terreno aún está en 0 (no implica viabilidad!)
  const lotLength = hasValidTerrain ? rawLength : 40;
  const lotWidth = hasValidTerrain ? rawWidth : 25;
  const lotArea = round2(lotLength * lotWidth);

  const effectiveSows = Math.max(1, config.sowsCount);
  const effectivePlaces = Math.max(1, config.farrowingPlacesCount);
  const aisleWidth = round2(config.aisleWidth);
  const setback = round2(config.setbackDistance);

  // =========================================================================
  // 1. GESTACIÓN
  // =========================================================================
  let gestationResult: BreedingCalculationResult['gestation'];

  if (config.gestationHousing === 'grupal') {
    const effectiveGroupSize = Math.min(effectiveSows, config.gestationGroupSize);
    const density = getGroupGestationDensity(effectiveGroupSize, config.gestationSowCategory);
    const unitsCount = Math.max(1, Math.ceil(effectiveSows / effectiveGroupSize));
    const netArea = round2(effectiveSows * density.areaPerSow);
    const areaPerPen = round2(netArea / unitsCount);

    const rowsCount = unitsCount >= 4 ? 2 : 1;
    const unitsPerRow = Math.ceil(unitsCount / rowsCount);

    // Profundidad cómoda de corral (m) manteniendo estrictamente areaPerPen sin comprimir
    const unitLength = round2(Math.max(2.6, Math.min(5.0, Math.sqrt(areaPerPen * 1.15))));
    const unitWidth = round2(Math.max(2.0, areaPerPen / unitLength));
    // Reajustar unitLength si unitWidth se elevó a mínimo 2.0m para garantizar área >= areaPerPen
    const verifiedUnitLength =
      unitWidth * unitLength < areaPerPen ? round2(areaPerPen / unitWidth) : unitLength;

    const pavilionLength = round2(unitsPerRow * unitWidth);
    const pavilionWidth = round2(rowsCount * verifiedUnitLength + aisleWidth);
    const pavilionGrossArea = round2(pavilionLength * pavilionWidth);

    gestationResult = {
      sowsCount: config.sowsCount,
      housing: 'grupal',
      sowCategory: config.gestationSowCategory,
      groupSize: effectiveGroupSize,
      groupBandLabel: density.bandLabel,
      appliedAreaPerSow: density.areaPerSow,
      unitLabel: 'm² libres / cerda',
      unitsCount,
      unitsPerRow,
      rowsCount,
      unitWidth,
      unitLength: verifiedUnitLength,
      netArea,
      aisleWidth,
      pavilionLength,
      pavilionWidth,
      pavilionGrossArea,
      source: density.source,
      classification: density.classification,
      note: `Alojamiento en ${unitsCount} corral(es) grupal(es) (~${effectiveGroupSize} cerdas/grupo) para cerdas ${
        config.gestationSowCategory === 'joven' ? 'jóvenes' : 'adultas'
      }.`
    };
  } else {
    // Jaula de gestación (Recomendación técnica / referencia de bienestar)
    const crateLength = round2(config.gestationCrateLength);
    const crateWidth = round2(config.gestationCrateWidth);
    const areaPerCrate = round2(crateLength * crateWidth);
    const netArea = round2(effectiveSows * areaPerCrate);

    const rowsCount = effectiveSows >= 4 ? 2 : 1;
    const unitsPerRow = Math.ceil(effectiveSows / rowsCount);

    const pavilionLength = round2(unitsPerRow * crateWidth);
    const pavilionWidth = round2(rowsCount * crateLength + aisleWidth);
    const pavilionGrossArea = round2(pavilionLength * pavilionWidth);

    gestationResult = {
      sowsCount: config.sowsCount,
      housing: 'jaula',
      sowCategory: config.gestationSowCategory,
      groupSize: 1,
      groupBandLabel: 'Individual en jaula',
      appliedAreaPerSow: areaPerCrate,
      unitLabel: 'm² / jaula',
      unitsCount: config.sowsCount,
      unitsPerRow,
      rowsCount,
      unitWidth: crateWidth,
      unitLength: crateLength,
      netArea,
      aisleWidth,
      pavilionLength,
      pavilionWidth,
      pavilionGrossArea,
      source: GESTATION_CRATE_REFERENCE.source,
      classification: GESTATION_CRATE_REFERENCE.classification,
      note: GESTATION_CRATE_REFERENCE.warningNote
    };
  }

  // =========================================================================
  // 2. MATERNIDAD / LACTANCIA
  // =========================================================================
  const roomsCount = Math.min(effectivePlaces, Math.max(1, config.farrowingRoomsCount));
  const placesPerRoom = Math.ceil(effectivePlaces / roomsCount);
  const placeLength = round2(config.farrowingPlaceLength);
  const placeWidth = round2(config.farrowingPlaceWidth);
  const areaPerPlace = round2(placeLength * placeWidth);
  const netPlacesArea = round2(effectivePlaces * areaPerPlace);

  const rowsPerRoom = placesPerRoom >= 4 ? 2 : 1;
  const placesPerRowInRoom = Math.ceil(placesPerRoom / rowsPerRoom);
  // Margen mínimo perimetral operativo interno de sala (0.40 m en cabeceras)
  const roomLength = round2(placesPerRowInRoom * placeWidth + 0.6);
  const roomWidth = round2(rowsPerRoom * placeLength + aisleWidth + 0.4);
  const roomGrossArea = round2(roomLength * roomWidth);
  const totalFarrowingGrossArea = round2(roomGrossArea * roomsCount);

  const farrowingResult: BreedingCalculationResult['farrowing'] = {
    totalPlaces: config.farrowingPlacesCount,
    roomsCount,
    placesPerRoom,
    placeLength,
    placeWidth,
    areaPerPlace,
    netPlacesArea,
    rowsPerRoom,
    placesPerRowInRoom,
    roomLength,
    roomWidth,
    roomGrossArea,
    totalGrossArea: totalFarrowingGrossArea,
    aisleWidth,
    source: FARROWING_REFERENCE.source,
    classification: FARROWING_REFERENCE.classification,
    note: FARROWING_REFERENCE.note
  };

  // =========================================================================
  // 3. VERRACOS / REPRODUCTORES (condicional: 0 = no aplica)
  // =========================================================================
  const hasBoars = config.boarsCount > 0;
  const boarAreaPerPen = round2(Math.max(BOAR_PEN_REFERENCE.normativeMinAreaM2, config.boarPenArea));
  const boarPenWidth = round2(Math.max(BOAR_PEN_REFERENCE.normativeMinWidthM, 2.5));
  const boarPenLength = round2(boarAreaPerPen / boarPenWidth);
  const boarTotalWidth = hasBoars ? round2(config.boarsCount * boarPenWidth) : 0;
  const boarTotalLength = hasBoars ? round2(boarPenLength + 0.8) : 0; // incluye franja de servicio 0.8 m
  const boarGrossArea = hasBoars ? round2(boarTotalWidth * boarTotalLength) : 0;

  const boarsResult: BreedingCalculationResult['boars'] = {
    enabled: hasBoars,
    boarsCount: config.boarsCount,
    areaPerPen: boarAreaPerPen,
    penWidth: boarPenWidth,
    penLength: boarPenLength,
    totalGrossArea: boarGrossArea,
    meetsNormativeMinimum:
      !hasBoars ||
      (boarAreaPerPen >= BOAR_PEN_REFERENCE.normativeMinAreaM2 &&
        boarPenWidth >= BOAR_PEN_REFERENCE.normativeMinWidthM),
    source: BOAR_PEN_REFERENCE.source,
    classification: BOAR_PEN_REFERENCE.classification,
    note: hasBoars
      ? BOAR_PEN_REFERENCE.note
      : 'Sin verracos en predio (manejo 100% por inseminación artificial con semen externo).'
  };

  // =========================================================================
  // 4. AGUA, ILUMINACIÓN Y CALEFACCIÓN
  // =========================================================================
  const gestationDailyLiters = round2(
    config.sowsCount * BREEDING_WATER_REFERENCE.gestationLitersPerDay
  );
  const lactationDailyLiters = round2(
    config.farrowingPlacesCount * BREEDING_WATER_REFERENCE.lactationLitersPerDay
  );
  const boarDailyLiters = round2(config.boarsCount * BREEDING_WATER_REFERENCE.boarLitersPerDay);
  const totalDailyLiters = round2(
    gestationDailyLiters + lactationDailyLiters + boarDailyLiters
  );
  const tankReserveLiters = Math.round(
    totalDailyLiters *
      BREEDING_WATER_REFERENCE.autonomyDays *
      BREEDING_WATER_REFERENCE.contingencyFactor
  );
  const tankReserveM3 = round2(tankReserveLiters / 1000);

  const waterSystem: BreedingCalculationResult['waterSystem'] = {
    gestationDailyLiters,
    lactationDailyLiters,
    boarDailyLiters,
    totalDailyLiters,
    autonomyDays: BREEDING_WATER_REFERENCE.autonomyDays,
    contingencyFactor: BREEDING_WATER_REFERENCE.contingencyFactor,
    tankReserveLiters,
    tankReserveM3,
    drinkerFlowRate: BREEDING_WATER_REFERENCE.drinkerFlowRate,
    source: `${BREEDING_WATER_REFERENCE.sourceDemand}; ${BREEDING_WATER_REFERENCE.sourceFlow}`,
    classification: 'Recomendación técnica (demanda) + parámetro hidráulico (aforo)'
  };

  // =========================================================================
  // 5. POSICIONAMIENTO MÉTRICO EN EL LOTE (SIN COMPRIMIR ÁREAS)
  // =========================================================================
  const pediluvioW = 3.5;
  const pediluvioH = 2.0;

  // Tanque según volumen calculado
  let tanqueW = 2.0;
  let tanqueH = 2.0;
  if (tankReserveM3 > 8.0) {
    tanqueW = 3.2;
    tanqueH = 3.2;
  } else if (tankReserveM3 > 3.0) {
    tanqueW = 2.5;
    tanqueH = 2.5;
  }

  // Bodega y Estercolero referenciales configurables para cría (sin fórmula cerrada en matriz)
  const herdUnits = Math.max(1, config.sowsCount + config.farrowingPlacesCount + config.boarsCount);
  const bodegaAreaRef = round2(Math.max(8.0, Math.min(28.0, herdUnits * 0.35 + 4.0)));
  const bodegaW = round2(Math.max(3.2, Math.min(6.0, Math.sqrt(bodegaAreaRef * 1.25))));
  const bodegaH = round2(Math.max(2.5, bodegaAreaRef / bodegaW));

  const estercoleroAreaRef = round2(Math.max(8.0, Math.min(32.0, herdUnits * 0.45 + 4.0)));
  const estercoleroW = round2(Math.max(3.2, Math.min(6.5, Math.sqrt(estercoleroAreaRef * 1.25))));
  const estercoleroH = round2(Math.max(2.5, estercoleroAreaRef / estercoleroW));

  const rectangles: BreedingSpatialRectangle[] = [
    {
      id: 'pediluvio',
      name: 'Filtro Sanitario y Pediluvio',
      category: 'pediluvio',
      x: setback,
      y: setback,
      width: pediluvioW,
      height: pediluvioH,
      color: '#c084fc',
      source: 'Guía Técnica de Bioseguridad Porcina',
      classification: 'Recomendación técnica de bioseguridad',
      details: 'Control de ingreso limpio-sucio y desinfección de calzado.'
    },
    {
      id: 'bodega',
      name: `Bodega de Alimento e Insumos (${round2(bodegaW * bodegaH)} m²)`,
      category: 'bodega',
      x: round2(setback + pediluvioW + 1.2),
      y: setback,
      width: bodegaW,
      height: bodegaH,
      color: '#a855f7',
      source: 'Parámetro referencial configurable (cría)',
      classification: 'Parámetro configurable / referencial',
      details: 'Almacenamiento sobre estibas separado de áreas húmedas.'
    },
    {
      id: 'tanque',
      name: `Tanque Hídrico (${tankReserveLiters.toLocaleString()} L, 3 días +20%)`,
      category: 'tanque',
      x: round2(lotLength - setback - tanqueW),
      y: setback,
      width: tanqueW,
      height: tanqueH,
      color: '#60a5fa',
      source: BREEDING_WATER_REFERENCE.sourceDemand,
      classification: 'Recomendación técnica de almacenamiento',
      details: `Demanda diaria: ${totalDailyLiters} L/día; reserva 3 días + 20% contingencia.`
    }
  ];

  // Franja superior libre debajo de auxiliares (pediluvio / bodega / tanque)
  const topAuxBottomY = round2(setback + Math.max(pediluvioH, bodegaH, tanqueH) + 1.5);
  const moduleGap = 1.5;

  // Nave de Gestación (arriba izquierda de la zona productiva, eje E-O)
  const gestationX = setback;
  const gestationY = topAuxBottomY;
  rectangles.push({
    id: 'nave_gestacion',
    name:
      config.gestationHousing === 'grupal'
        ? `Nave de Gestación Grupal (${gestationResult.unitsCount} corrales, ${gestationResult.netArea} m² libres)`
        : `Nave de Gestación en Jaulas (${config.sowsCount} jaulas)`,
    category: 'gestacion',
    x: gestationX,
    y: gestationY,
    width: gestationResult.pavilionLength,
    height: gestationResult.pavilionWidth,
    color: '#6b21a8',
    source: gestationResult.source,
    classification: gestationResult.classification,
    details: gestationResult.note
  });

  // Corral de Verracos (si boarsCount > 0), ubicado a la derecha de Gestación o en espacio libre cercano
  let boarPlacedRightOfGestation = false;
  if (hasBoars) {
    const preferredBoarX = round2(gestationX + gestationResult.pavilionLength + moduleGap);
    const preferredBoarY = gestationY;
    let boarX = preferredBoarX;
    let boarY = preferredBoarY;

    if (preferredBoarX + boarTotalWidth <= lotLength - setback + 0.01) {
      boarPlacedRightOfGestation = true;
    } else {
      const altBoarSlot = findFreeSlotForModule(
        boarTotalWidth,
        boarTotalLength,
        lotLength,
        lotWidth,
        setback,
        rectangles,
        'top-right'
      );
      if (altBoarSlot) {
        boarX = altBoarSlot.x;
        boarY = altBoarSlot.y;
      }
    }

    rectangles.push({
      id: 'corral_verracos',
      name: `Corral de Verraco${config.boarsCount > 1 ? 's' : ''} (${config.boarsCount} plaza${
        config.boarsCount > 1 ? 's' : ''
      }, ${boarAreaPerPen} m² c/u)`,
      category: 'verracos',
      x: boarX,
      y: boarY,
      width: boarTotalWidth,
      height: boarTotalLength,
      color: '#7e22ce',
      source: boarsResult.source,
      classification: boarsResult.classification,
      details: boarsResult.note
    });
  }

  // Salas de Maternidad debajo de Gestación (y debajo de Verracos si está en esa fila)
  const row1MaxBottomY = round2(
    Math.max(
      gestationY + gestationResult.pavilionWidth,
      hasBoars && boarPlacedRightOfGestation ? gestationY + boarTotalLength : gestationY
    ) + moduleGap
  );

  // Disponer las salas de maternidad en filas de hasta 3 salas para mantener legibilidad
  const maxRoomsPerRow = Math.min(3, roomsCount);
  for (let i = 0; i < roomsCount; i++) {
    const colIdx = i % maxRoomsPerRow;
    const rowIdx = Math.floor(i / maxRoomsPerRow);
    const salaX = round2(setback + colIdx * (roomLength + 1.2));
    const salaY = round2(row1MaxBottomY + rowIdx * (roomWidth + 1.2));

    rectangles.push({
      id: `sala_maternidad_${i + 1}`,
      name: `Sala de Maternidad ${i + 1} (${roomLength}m × ${roomWidth}m)`,
      category: 'maternidad',
      x: salaX,
      y: salaY,
      width: roomLength,
      height: roomWidth,
      color: '#a21caf',
      source: farrowingResult.source,
      classification: farrowingResult.classification,
      details: `Hasta ${placesPerRoom} parideras (${placeWidth}m × ${placeLength}m c/u) + pasillo ${aisleWidth}m.`
    });
  }

  // Estercolero ubicado en zona libre (priorizando esquina inferior derecha, sin superponerse si existe espacio)
  const freeEstercolero = findFreeSlotForModule(
    estercoleroW,
    estercoleroH,
    lotLength,
    lotWidth,
    setback,
    rectangles,
    'bottom-right'
  );
  rectangles.push({
    id: 'estercolero',
    name: `Estercolero / Fosa de Efluentes (${round2(estercoleroW * estercoleroH)} m²)`,
    category: 'estercolero',
    x: freeEstercolero ? freeEstercolero.x : round2(lotLength - setback - estercoleroW),
    y: freeEstercolero ? freeEstercolero.y : round2(lotWidth - setback - estercoleroH),
    width: estercoleroW,
    height: estercoleroH,
    color: '#f97316',
    source: 'Parámetro referencial configurable de efluentes',
    classification: 'Parámetro configurable / referencial',
    details: 'Depósito impermeabilizado ubicado en cota baja y sotavento.'
  });

  // =========================================================================
  // 6. VALIDACIÓN ESPACIAL ESTRICTA (LÍMITES Y SUPERPOSICIONES)
  // =========================================================================
  const boundaryViolations: string[] = [];
  const overlaps: BreedingSpatialOverlapReport[] = [];

  if (hasValidTerrain) {
    rectangles.forEach((r) => {
      if (r.x < 0 || r.y < 0) {
        boundaryViolations.push(`${r.name} se posiciona fuera del origen del terreno.`);
      }
      if (r.x + r.width > lotLength) {
        const exceed = round2(r.x + r.width - lotLength);
        boundaryViolations.push(
          `${r.name} sobrepasa el largo del lote por ${exceed} m (Largo disponible: ${lotLength} m, Extremo: ${round2(
            r.x + r.width
          )} m).`
        );
      }
      if (r.y + r.height > lotWidth) {
        const exceed = round2(r.y + r.height - lotWidth);
        boundaryViolations.push(
          `${r.name} sobrepasa el ancho del lote por ${exceed} m (Ancho disponible: ${lotWidth} m, Extremo: ${round2(
            r.y + r.height
          )} m).`
        );
      }
    });
  }

  for (let i = 0; i < rectangles.length; i++) {
    for (let j = i + 1; j < rectangles.length; j++) {
      const rA = rectangles[i];
      const rB = rectangles[j];

      const overlapX = Math.max(
        0,
        Math.min(rA.x + rA.width, rB.x + rB.width) - Math.max(rA.x, rB.x)
      );
      const overlapY = Math.max(
        0,
        Math.min(rA.y + rA.height, rB.y + rB.height) - Math.max(rA.y, rB.y)
      );

      if (overlapX > 0.05 && overlapY > 0.05) {
        overlaps.push({
          installationA: rA.name,
          installationB: rB.name,
          description: `Superposición física de ${overlapX.toFixed(2)} m × ${overlapY.toFixed(
            2
          )} m entre "${rA.name}" y "${rB.name}".`
        });
      }
    }
  }

  const fitsInsideLot = hasValidTerrain && boundaryViolations.length === 0;
  const isViable =
    hasValidTerrain &&
    pendingInputs.length === 0 &&
    fitsInsideLot &&
    overlaps.length === 0;

  let feasibilityNotice = 'Distribución espacial de Cría viable y validada en el lote.';
  if (!hasValidTerrain) {
    feasibilityNotice =
      'VALIDACIÓN ESPACIAL PENDIENTE: Faltan dimensiones válidas del terreno (largo y ancho > 0 m) en Caracterización. No es posible confirmar que las instalaciones de cría quepan en el predio.';
  } else if (pendingInputs.length > 0) {
    feasibilityNotice =
      'DATOS PENDIENTES: Complete las cantidades reproductivas requeridas (cerdas y plazas de maternidad) para confirmar la viabilidad.';
  } else if (!fitsInsideLot && overlaps.length > 0) {
    feasibilityNotice =
      'DISTRIBUCIÓN NO VIABLE: Las áreas de gestación, maternidad o anexos sobrepasan los límites del lote y presentan superposiciones. Las superficies mínimas calculadas no se comprimen para forzar cabida.';
  } else if (!fitsInsideLot) {
    feasibilityNotice =
      'DISTRIBUCIÓN NO VIABLE: Las dimensiones calculadas de cría exceden el largo o ancho del terreno actual. Amplíe el lote en Caracterización o ajuste el número de plazas/salas.';
  } else if (overlaps.length > 0) {
    feasibilityNotice =
      'DISTRIBUCIÓN NO VIABLE: Existen colisiones físicas entre módulos dentro del lote. Ajuste el retiro perimetral o amplíe el terreno.';
  }

  const totalProductiveGrossArea = round2(
    gestationResult.pavilionGrossArea + farrowingResult.totalGrossArea + boarGrossArea
  );
  const totalOccupiedFootprintArea = round2(
    rectangles.reduce((acc, r) => acc + r.width * r.height, 0)
  );

  const normativeNotes = [
    {
      component:
        config.gestationHousing === 'grupal'
          ? 'Gestación grupal'
          : 'Jaula de gestación',
      value: `${gestationResult.appliedAreaPerSow} ${gestationResult.unitLabel}`,
      classification: gestationResult.classification,
      source: gestationResult.source
    },
    {
      component: 'Paridera / Área de lactancia',
      value: `${placeLength} m × ${placeWidth} m (${areaPerPlace} m²/plaza)`,
      classification: farrowingResult.classification,
      source: farrowingResult.source
    },
    {
      component: 'Corral de reproductor / verraco',
      value: hasBoars ? `${boarAreaPerPen} m²/corral (ancho ${boarPenWidth} m)` : 'No aplica (0 verracos)',
      classification: boarsResult.classification,
      source: boarsResult.source
    },
    {
      component: 'Pasillos de circulación',
      value: `${aisleWidth} m`,
      classification: BREEDING_AISLE_REFERENCE.classification,
      source: BREEDING_AISLE_REFERENCE.source
    },
    {
      component: 'Aforo e hidratación (bebederos)',
      value: `${waterSystem.drinkerFlowRate} · Reserva ${tankReserveLiters.toLocaleString()} L`,
      classification: waterSystem.classification,
      source: waterSystem.source
    },
    {
      component: 'Iluminación mínima',
      value: `≥ ${BREEDING_WELFARE_REFERENCE.minLightingHoursPerDay} horas/día`,
      classification: 'Criterio técnico de bienestar',
      source: BREEDING_WELFARE_REFERENCE.lightingSource
    }
  ];

  return {
    config,
    gestation: gestationResult,
    farrowing: farrowingResult,
    boars: boarsResult,
    waterSystem,
    lightingHoursMin: BREEDING_WELFARE_REFERENCE.minLightingHoursPerDay,
    pigletHeatingNote: BREEDING_WELFARE_REFERENCE.pigletHeatingRule,
    totalProductiveGrossArea,
    totalOccupiedFootprintArea,
    pendingInputs,
    normativeNotes,
    rectangles,
    validation: {
      hasValidTerrain,
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
