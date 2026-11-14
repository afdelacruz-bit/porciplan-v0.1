import { PorciProject } from '../types/project';
import { GrowthFinishUserConfig } from '../types/growthFinish';
import { BreedingUserConfig } from '../types/breeding';
import { DEFAULT_GROWTH_FINISH_CONFIG } from '../constants/growthFinishMatrix';
import { calculateGrowthFinishLayout } from './growthFinishLayout';
import { calculateBreedingLayout, resolveBreedingConfig } from './breedingLayout';

export interface AutoPlanningResult {
  growthConfig?: GrowthFinishUserConfig;
  breedingConfig?: BreedingUserConfig;
  technicalNotes: Record<string, string>;
  summaryBullets: string[];
}

/**
 * Rellena automáticamente la planificación técnica a partir de la caracterización inicial
 * (orientación productiva, cantidad de animales, dimensiones del terreno y materiales).
 */
export function buildAutoPlanningFromCharacterization(
  project: PorciProject
): AutoPlanningResult {
  const char = project.characterization;
  const count = Math.max(1, char.animalCount || 30);
  const terrain = char.terrain;
  const hasTerrain = terrain.length > 0 && terrain.width > 0;
  const hasConcretoOrSlats =
    char.availableMaterials.includes('concreto') ||
    char.availableMaterials.includes('piso_plastico_slat');
  const hasCamaMaterial =
    char.availableMaterials.includes('guadua_bambu') ||
    char.availableMaterials.includes('madera_inmunizada');

  const notes: Record<string, string> = { ...project.technicalNotes };

  if (char.orientation === 'cria') {
    const sowsCount = count <= 10 ? Math.max(2, count) : Math.max(4, Math.round(count * 0.65));
    const farrowingPlacesCount = Math.max(2, Math.ceil(sowsCount * 0.25));
    const farrowingRoomsCount = farrowingPlacesCount >= 6 ? 2 : 1;
    const boarsCount = sowsCount >= 15 ? 1 : 0;
    const gestationGroupSize = Math.min(sowsCount, sowsCount >= 12 ? 8 : Math.max(4, sowsCount));
    const initialSetback = hasTerrain && (terrain.length < 26 || terrain.width < 20) ? 1.5 : 2.5;

    let candidate = resolveBreedingConfig({
      sowsCount,
      farrowingPlacesCount,
      farrowingRoomsCount,
      boarsCount,
      gestationHousing: 'grupal',
      gestationSowCategory: 'adulta',
      gestationGroupSize,
      farrowingPlaceLength: 2.3,
      farrowingPlaceWidth: 2.0,
      boarPenArea: 7.0,
      aisleWidth: 0.9,
      setbackDistance: initialSetback
    });

    if (hasTerrain) {
      let check = calculateBreedingLayout(terrain, candidate);
      if (!check.validation.isViable) {
        for (const rooms of [1, farrowingRoomsCount]) {
          for (const sb of [initialSetback, 1.5, 1.0]) {
            const attempt = resolveBreedingConfig({
              ...candidate,
              farrowingRoomsCount: rooms,
              setbackDistance: sb
            });
            check = calculateBreedingLayout(terrain, attempt);
            if (check.validation.isViable) {
              candidate = attempt;
              break;
            }
          }
          if (check.validation.isViable) break;
        }
      }
    }

    notes.zone_galpon_principal = `Salas de maternidad con ${candidate.farrowingPlacesCount} parideras en ${candidate.farrowingRoomsCount} sala(s) y zona térmica protegida para lechones.`;
    notes.zone_gestacion_reproduccion = `Gestación grupal para ${candidate.sowsCount} cerdas (grupos de ~${candidate.gestationGroupSize} cerdas)${candidate.boarsCount > 0 ? ` y ${candidate.boarsCount} corral de verraco` : ' con inseminación artificial externa'}.`;
    notes.zone_bodega_alimento = 'Almacenamiento sobre estibas separado de paredes y con control de humedad.';
    notes.zone_bioseguridad_filtro = 'Pediluvio de acceso y cambio de calzado antes de ingresar a salas de maternidad y gestación.';
    notes.zone_manejo_porcinaza = char.availableMaterials.includes('plastico_geomembrana')
      ? 'Estercolero / fosa impermeabilizada con geomembrana plástica en la cota más baja del predio.'
      : 'Estercolero impermeabilizado con concreto hidrófugo en la cota baja del predio.';

    return {
      breedingConfig: candidate,
      technicalNotes: notes,
      summaryBullets: [
        `Población reproductiva sugerida según escala inicial (${count} animales): ${candidate.sowsCount} cerdas en gestación, ${candidate.farrowingPlacesCount} parideras en ${candidate.farrowingRoomsCount} sala(s) y ${candidate.boarsCount} verraco(s).`,
        `Alojamiento en gestación grupal (${candidate.gestationGroupSize} cerdas/corral) con pasillo de ${candidate.aisleWidth} m y retiro de ${candidate.setbackDistance} m.`,
        'Notas constructivas generadas automáticamente según los materiales disponibles en caracterización.'
      ]
    };
  }

  // Orientación Levante / Ceba
  const housingSystem: GrowthFinishUserConfig['housingSystem'] =
    !hasConcretoOrSlats && hasCamaMaterial ? 'cama_profunda' : 'convencional';

  let pigsPerPen = 12;
  if (count <= 10) pigsPerPen = count;
  else if (count <= 30) pigsPerPen = 10;
  else if (count <= 80) pigsPerPen = 12;
  else pigsPerPen = 15;

  let penArrangement: GrowthFinishUserConfig['penArrangement'] =
    Math.ceil(count / pigsPerPen) >= 2 ? 'two_rows' : 'single_row';
  let aisleWidth = 1.2;
  let setbackDistance = hasTerrain && (terrain.length < 24 || terrain.width < 18) ? 1.5 : 2.5;

  let candidate: GrowthFinishUserConfig = {
    ...DEFAULT_GROWTH_FINISH_CONFIG,
    weightRange: '86_a_110',
    housingSystem,
    pigsPerPen,
    aisleWidth,
    penArrangement,
    setbackDistance
  };

  if (hasTerrain) {
    let check = calculateGrowthFinishLayout(count, terrain, candidate);
    if (!check.validation.isViable) {
      const arrangements: Array<'two_rows' | 'single_row'> = ['two_rows', 'single_row'];
      const penSizes = [pigsPerPen, Math.min(count, 15), Math.min(count, 20)];
      const aisles = [1.2, 0.9];
      const setbacks = [setbackDistance, 1.5, 1.0];

      outer: for (const arr of arrangements) {
        for (const ppp of penSizes) {
          for (const aw of aisles) {
            for (const sb of setbacks) {
              const attempt: GrowthFinishUserConfig = {
                ...candidate,
                penArrangement: arr,
                pigsPerPen: ppp,
                aisleWidth: aw,
                setbackDistance: sb
              };
              const res = calculateGrowthFinishLayout(count, terrain, attempt);
              if (res.validation.isViable) {
                candidate = attempt;
                break outer;
              }
            }
          }
        }
      }
    }
  }

  notes.zone_galpon_principal =
    candidate.housingSystem === 'cama_profunda'
      ? `Corrales en cama profunda (${candidate.pigsPerPen} cerdos/corral) sobre base firme con sustrato absorbente de 40–50 cm.`
      : `Corrales colectivos en piso convencional (${candidate.pigsPerPen} cerdos/corral) con pendiente de 2.5% a 3% hacia canaleta posterior.`;
  notes.zone_bodega_alimento = 'Alimento concentrado sobre estibas, separado 20 cm de muros y libre de humedad.';
  notes.zone_bioseguridad_filtro = 'Pediluvio desinfectante en puerta principal y delimitación perimetral.';
  notes.zone_manejo_porcinaza = char.availableMaterials.includes('plastico_geomembrana')
    ? 'Fosa o estercolero recubierto con geomembrana en zona baja a sotavento.'
    : 'Fosa impermeabilizada en concreto para estabilización de porcinaza.';

  return {
    growthConfig: candidate,
    technicalNotes: notes,
    summaryBullets: [
      `Rango de finalización estándar (86–110 kg) y sistema ${
        candidate.housingSystem === 'cama_profunda' ? 'Cama Profunda' : 'Piso Convencional'
      } según tus materiales.`,
      `Distribución automática: lotes de ${candidate.pigsPerPen} cerdos/corral (${
        candidate.penArrangement === 'two_rows' ? '2 filas con pasillo central' : '1 fila lateral'
      }), pasillo de ${candidate.aisleWidth} m y retiro de ${candidate.setbackDistance} m.`,
      'Especificaciones base redactadas en los módulos funcionales.'
    ]
  };
}

export interface LayoutAdjustmentProposal {
  canBeSolved: boolean;
  problemsDetected: string[];
  correctionsSummary: string[];
  proposedGrowthConfig?: GrowthFinishUserConfig;
  proposedBreedingConfig?: BreedingUserConfig;
  proposedAnimalCount?: number;
  resultingNotice: string;
}

/**
 * Propone ajustes mínimos reales sobre los valores de planificación para obtener un plano 2D válido
 * (sin superposiciones ni desbordes fuera del lote).
 */
export function proposeValidLayoutAdjustment(
  project: PorciProject
): LayoutAdjustmentProposal {
  const char = project.characterization;
  const terrain = char.terrain;

  if (!terrain || terrain.length <= 0 || terrain.width <= 0) {
    return {
      canBeSolved: false,
      problemsDetected: ['El terreno no tiene largo y ancho válidos mayores a 0 m en Caracterización.'],
      correctionsSummary: [],
      resultingNotice: 'Primero debes registrar el largo y ancho reales del lote en el Paso 02 (Caracterización).'
    };
  }

  if (char.orientation === 'cria') {
    const current = resolveBreedingConfig(project.breedingConfig);
    const currentRes = calculateBreedingLayout(terrain, current);
    const problems = [
      ...currentRes.validation.boundaryViolations,
      ...currentRes.validation.overlaps.map((o) => o.description)
    ];

    const aisleCandidates = Array.from(new Set([current.aisleWidth, 0.9, 0.7]));
    const setbackCandidates = Array.from(new Set([current.setbackDistance, 2.0, 1.5, 1.0]));
    const roomsCandidates = Array.from(
      new Set([current.farrowingRoomsCount, Math.max(1, current.farrowingRoomsCount - 1), 1])
    );
    const groupSizeCandidates = Array.from(
      new Set([
        current.gestationGroupSize,
        Math.min(current.sowsCount, Math.max(6, current.gestationGroupSize + 4)),
        Math.max(1, current.sowsCount)
      ])
    );
    const boarCandidates = current.boarsCount > 0 ? [current.boarsCount, 0] : [0];

    // 1. Intentar conservar exactamente la población reproductiva actual
    for (const boars of boarCandidates) {
      for (const rooms of roomsCandidates) {
        for (const groupSize of groupSizeCandidates) {
          for (const aw of aisleCandidates) {
            for (const sb of setbackCandidates) {
              const candidate = resolveBreedingConfig({
                ...current,
                boarsCount: boars,
                farrowingRoomsCount: rooms,
                gestationGroupSize: groupSize,
                aisleWidth: aw,
                setbackDistance: sb
              });
              const res = calculateBreedingLayout(terrain, candidate);
              if (res.validation.isViable) {
                const changes: string[] = [];
                if (candidate.farrowingRoomsCount !== current.farrowingRoomsCount) {
                  changes.push(
                    `Salas de maternidad: ${current.farrowingRoomsCount} → ${candidate.farrowingRoomsCount} sala(s)`
                  );
                }
                if (candidate.gestationGroupSize !== current.gestationGroupSize) {
                  changes.push(
                    `Cerdas por grupo en gestación: ${current.gestationGroupSize} → ${candidate.gestationGroupSize}`
                  );
                }
                if (candidate.boarsCount !== current.boarsCount) {
                  changes.push(
                    `Corral de verraco: ${current.boarsCount} → 0 (usar inseminación artificial externa para liberar espacio)`
                  );
                }
                if (candidate.aisleWidth !== current.aisleWidth) {
                  changes.push(`Ancho de pasillo: ${current.aisleWidth} m → ${candidate.aisleWidth} m`);
                }
                if (candidate.setbackDistance !== current.setbackDistance) {
                  changes.push(`Retiro perimetral: ${current.setbackDistance} m → ${candidate.setbackDistance} m`);
                }
                if (changes.length === 0) {
                  changes.push('Reordenamiento geométrico automático dentro del lote.');
                }
                return {
                  canBeSolved: true,
                  problemsDetected: problems,
                  correctionsSummary: changes,
                  proposedBreedingConfig: candidate,
                  resultingNotice:
                    'Se encontró una distribución viable conservando todas tus cerdas y parideras.'
                };
              }
            }
          }
        }
      }
    }

    // 2. Si el lote es físicamente menor que el área mínima requerida, ajustar escala de población proporcionalmente
    for (let sows = Math.max(1, current.sowsCount - 1); sows >= 1; sows--) {
      const places = Math.max(
        1,
        Math.min(current.farrowingPlacesCount, Math.ceil((sows / Math.max(1, current.sowsCount)) * current.farrowingPlacesCount))
      );
      const candidate = resolveBreedingConfig({
        ...current,
        sowsCount: sows,
        farrowingPlacesCount: places,
        farrowingRoomsCount: 1,
        boarsCount: 0,
        gestationGroupSize: sows,
        aisleWidth: 0.7,
        setbackDistance: 1.0
      });
      const res = calculateBreedingLayout(terrain, candidate);
      if (res.validation.isViable) {
        const changes: string[] = [
          `Ajuste de capacidad al lote disponible: ${current.sowsCount} cerdas / ${current.farrowingPlacesCount} parideras → ${sows} cerdas / ${places} parideras`,
          'Consolidación en 1 sala de maternidad, pasillo de 0,70 m y retiro perimetral de 1,0 m'
        ];
        if (current.boarsCount > 0) {
          changes.push('Omitir corral de verraco en predio (manejo por inseminación artificial)');
        }
        return {
          canBeSolved: true,
          problemsDetected: problems,
          correctionsSummary: changes,
          proposedBreedingConfig: candidate,
          resultingNotice:
            'El terreno es estrecho para la población inicial; se propone ajustar la escala productiva al máximo viable sin comprimir áreas mínimas.'
        };
      }
    }

    return {
      canBeSolved: false,
      problemsDetected: problems,
      correctionsSummary: [],
      resultingNotice:
        'El lote actual no tiene espacio mínimo suficiente ni siquiera para la unidad mínima de cría más áreas sanitarias.'
    };
  }

  // Levante / Ceba
  const current: GrowthFinishUserConfig = {
    ...DEFAULT_GROWTH_FINISH_CONFIG,
    ...project.growthFinishConfig
  };
  const count = Math.max(1, char.animalCount || 1);
  const currentRes = calculateGrowthFinishLayout(count, terrain, current);
  const problems = [
    ...currentRes.validation.boundaryViolations,
    ...currentRes.validation.overlaps.map((o) => o.description)
  ];

  const arrangementCandidates: Array<'two_rows' | 'single_row'> =
    current.penArrangement === 'single_row' ? ['two_rows', 'single_row'] : ['two_rows', 'single_row'];
  const pigsPerPenCandidates = Array.from(
    new Set([
      current.pigsPerPen,
      Math.min(count, Math.max(10, Math.ceil(count / 4))),
      Math.min(count, Math.max(12, Math.ceil(count / 2))),
      Math.min(count, 20),
      Math.min(count, 25),
      count
    ])
  );
  const aisleCandidates = Array.from(new Set([current.aisleWidth, 1.0, 0.9, 0.7]));
  const setbackCandidates = Array.from(new Set([current.setbackDistance, 2.0, 1.5, 1.0]));

  // 1. Manteniendo todos los animales y la densidad actual
  for (const sb of setbackCandidates) {
    for (const arr of arrangementCandidates) {
      for (const aw of aisleCandidates) {
        for (const ppp of pigsPerPenCandidates) {
          const candidate: GrowthFinishUserConfig = {
            ...current,
            penArrangement: arr,
            pigsPerPen: ppp,
            aisleWidth: aw,
            setbackDistance: sb
          };
          const res = calculateGrowthFinishLayout(count, terrain, candidate);
          if (res.validation.isViable) {
            const changes: string[] = [];
            if (candidate.penArrangement !== current.penArrangement) {
              changes.push(
                `Disposición de corrales: ${
                  current.penArrangement === 'single_row' ? '1 Fila' : '2 Filas'
                } → ${candidate.penArrangement === 'two_rows' ? '2 Filas (Pasillo Central)' : '1 Fila Lateral'}`
              );
            }
            if (candidate.pigsPerPen !== current.pigsPerPen) {
              changes.push(`Cerdos por corral: ${current.pigsPerPen} → ${candidate.pigsPerPen} cabezas`);
            }
            if (candidate.aisleWidth !== current.aisleWidth) {
              changes.push(`Ancho de pasillo: ${current.aisleWidth} m → ${candidate.aisleWidth} m`);
            }
            if (candidate.setbackDistance !== current.setbackDistance) {
              changes.push(`Retiro perimetral: ${current.setbackDistance} m → ${candidate.setbackDistance} m`);
            }
            if (changes.length === 0) {
              changes.push('Reubicación automática de módulos dentro del lote.');
            }
            return {
              canBeSolved: true,
              problemsDetected: problems,
              correctionsSummary: changes,
              proposedGrowthConfig: candidate,
              resultingNotice:
                'El ajuste propuesto resuelve las colisiones y desbordes manteniendo el 100% de tus cerdos y su superficie mínima.'
            };
          }
        }
      }
    }
  }

  // 2. Si el lote es físicamente insuficiente para los `count` cerdos, buscar capacidad máxima viable
  for (let reducedCount = count - 1; reducedCount >= 1; reducedCount--) {
    const candidate: GrowthFinishUserConfig = {
      ...current,
      penArrangement: reducedCount >= 8 ? 'two_rows' : 'single_row',
      pigsPerPen: Math.min(reducedCount, Math.max(current.pigsPerPen, 15)),
      aisleWidth: 0.9,
      setbackDistance: 1.0
    };
    const res = calculateGrowthFinishLayout(reducedCount, terrain, candidate);
    if (res.validation.isViable) {
      const changes: string[] = [
        `Población ajustada a la capacidad física del lote: ${count} → ${reducedCount} cerdos`
      ];
      if (candidate.penArrangement !== current.penArrangement) {
        changes.push(
          `Disposición de corrales: ${
            candidate.penArrangement === 'two_rows' ? '2 Filas (Pasillo Central)' : '1 Fila Lateral'
          }`
        );
      }
      if (candidate.pigsPerPen !== current.pigsPerPen) {
        changes.push(`Cerdos por corral: ${current.pigsPerPen} → ${candidate.pigsPerPen}`);
      }
      if (candidate.aisleWidth !== current.aisleWidth) {
        changes.push(`Ancho de pasillo: ${current.aisleWidth} m → ${candidate.aisleWidth} m`);
      }
      if (candidate.setbackDistance !== current.setbackDistance) {
        changes.push(`Retiro perimetral: ${current.setbackDistance} m → ${candidate.setbackDistance} m`);
      }
      return {
        canBeSolved: true,
        problemsDetected: problems,
        correctionsSummary: changes,
        proposedGrowthConfig: candidate,
        proposedAnimalCount: reducedCount,
        resultingNotice:
          'El tamaño del lote no permite alojar la población actual manteniendo la superficie mínima por animal; se propone reducir la población al máximo viable.'
      };
    }
  }

  return {
    canBeSolved: false,
    problemsDetected: problems,
    correctionsSummary: [],
    resultingNotice:
      'El terreno es demasiado pequeño para alojar la nave porcina y las áreas sanitarias mínimas.'
  };
}
