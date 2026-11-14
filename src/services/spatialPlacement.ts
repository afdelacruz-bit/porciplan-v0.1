/**
 * Utilidad compartida de ubicación espacial en metros reales sin compresión de áreas.
 * Busca posiciones libres dentro del lote para evitar superposiciones evitables
 * (por ejemplo, del estercolero frente a naves u otros módulos).
 */

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const round2 = (n: number): number => Number(n.toFixed(2));

export function rectsOverlap(a: BoxRect, b: BoxRect, clearance: number = 0.1): boolean {
  const overlapX =
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY =
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return overlapX > -clearance && overlapY > -clearance;
}

export function isInsideBounds(
  r: BoxRect,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean {
  return (
    r.x >= minX - 0.01 &&
    r.y >= minY - 0.01 &&
    r.x + r.width <= maxX + 0.01 &&
    r.y + r.height <= maxY + 0.01
  );
}

/**
 * Busca una posición libre dentro de [setback, lotLength - setback] x [setback, lotWidth - setback]
 * que no colisione con `obstacles`. Prioriza esquina inferior derecha, luego esquina inferior izquierda,
 * bordes libres y escaneo por grilla. Si no existe espacio libre real, devuelve null.
 */
export function findFreeSlotForModule(
  width: number,
  height: number,
  lotLength: number,
  lotWidth: number,
  setback: number,
  obstacles: BoxRect[],
  preferredSide: 'bottom-right' | 'top-right' | 'center' = 'bottom-right'
): { x: number; y: number } | null {
  const minX = setback;
  const minY = setback;
  const maxX = lotLength - setback;
  const maxY = lotWidth - setback;

  if (maxX - minX < width - 0.01 || maxY - minY < height - 0.01) {
    return null;
  }

  const rightX = round2(Math.max(minX, maxX - width));
  const bottomY = round2(Math.max(minY, maxY - height));

  const candidateCoords: Array<{ x: number; y: number }> = [];

  if (preferredSide === 'bottom-right') {
    candidateCoords.push(
      { x: rightX, y: bottomY },
      { x: minX, y: bottomY },
      { x: round2((minX + rightX) / 2), y: bottomY },
      { x: rightX, y: round2((minY + bottomY) / 2) },
      { x: minX, y: round2((minY + bottomY) / 2) }
    );
  } else if (preferredSide === 'top-right') {
    candidateCoords.push(
      { x: rightX, y: minY },
      { x: minX, y: minY },
      { x: rightX, y: bottomY }
    );
  } else {
    candidateCoords.push(
      { x: round2((minX + rightX) / 2), y: round2((minY + bottomY) / 2) },
      { x: minX, y: minY }
    );
  }

  // Agregar posiciones pegadas a los bordes libres de obstáculos existentes (con separación de 0.8 m)
  const gap = 0.8;
  const xAnchors = new Set<number>([minX, rightX]);
  const yAnchors = new Set<number>([minY, bottomY]);

  obstacles.forEach((obs) => {
    xAnchors.add(round2(obs.x + obs.width + gap));
    xAnchors.add(round2(obs.x - width - gap));
    yAnchors.add(round2(obs.y + obs.height + gap));
    yAnchors.add(round2(obs.y - height - gap));
  });

  // Agregar muestreo fino a lo largo del lote (paso ~1.5 m)
  for (let x = minX; x <= rightX + 0.01; x += 1.5) {
    xAnchors.add(round2(Math.min(x, rightX)));
  }
  for (let y = minY; y <= bottomY + 0.01; y += 1.5) {
    yAnchors.add(round2(Math.min(y, bottomY)));
  }

  // Ordenar candidatos adicionales priorizando zona baja y derecha (cota baja / sotavento para estercolero)
  const extraCandidates: Array<{ x: number; y: number }> = [];
  yAnchors.forEach((y) => {
    xAnchors.forEach((x) => {
      extraCandidates.push({ x, y });
    });
  });

  if (preferredSide === 'bottom-right') {
    extraCandidates.sort((a, b) => b.y - a.y || b.x - a.x);
  }

  const allCandidates = [...candidateCoords, ...extraCandidates];

  // Primer pase con margen de separación cómodo (0.6 m), segundo pase con margen mínimo (0.15 m)
  for (const clearance of [0.6, 0.15]) {
    for (const pt of allCandidates) {
      const box: BoxRect = { x: pt.x, y: pt.y, width, height };
      if (!isInsideBounds(box, minX, minY, maxX, maxY)) continue;
      const collides = obstacles.some((obs) => rectsOverlap(box, obs, clearance));
      if (!collides) {
        return { x: round2(pt.x), y: round2(pt.y) };
      }
    }
  }

  return null;
}
