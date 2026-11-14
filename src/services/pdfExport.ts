import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BudgetStageTag, PorciProject } from '../types/project';
import { MATERIAL_OPTIONS } from './storage';
import { calculateGrowthFinishLayout } from './growthFinishLayout';
import { calculateBreedingLayout } from './breedingLayout';
import {
  BUDGET_CATEGORY_LABELS,
  MATERIAL_CONDITION_LABELS,
  PRICE_SOURCE_LABELS,
  QUANTITY_SOURCE_LABELS,
  buildBudgetRecommendations,
  evaluateProjectBudget,
  extractProducerObservations,
  normalizeBudgetItem
} from './budgetEngine';

const STAGE_LABELS: Record<BudgetStageTag, string> = {
  ceba: 'Levante-Ceba',
  gestacion: 'Gestación',
  maternidad: 'Maternidad',
  verracos: 'Verracos',
  precebo: 'Precebo',
  compartido: 'Compartido',
  general: 'General'
};

/**
 * Replaces characters outside standard WinAnsiEncoding so Helvetica in jsPDF never prints garbled glyphs.
 */
function pdfSafe(input: string | number | undefined | null): string {
  return String(input ?? '')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/↔/g, '<->')
    .replace(/→/g, '->')
    .replace(/₂/g, '2')
    .replace(/«|»/g, '"')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014]/g, '');
}

export function exportProjectSummaryToPdf(project: PorciProject): void {
  const char = project.characterization;
  const currency = char.currency || 'COP';
  const isCeba = char.orientation === 'ceba';
  const isCria = char.orientation === 'cria';

  const growthLayout = calculateGrowthFinishLayout(
    char.animalCount,
    char.terrain,
    project.growthFinishConfig
  );
  const breedingLayout = calculateBreedingLayout(char.terrain, project.breedingConfig);
  const evaluation = evaluateProjectBudget(project, project.budgetItems || []);
  const observations = extractProducerObservations(project);
  const recommendations = buildBudgetRecommendations(project, evaluation, observations);

  const verifiedMaterialDetails = (char.materialDetails || []).filter(
    (m) =>
      (m.usableCondition === 'bueno' || m.usableCondition === 'regular_aprovechable') &&
      Number(m.availableQuantity) > 0
  );

  const orientationMap: Record<string, string> = {
    cria: 'Cría (Producción de Lechones Destetados)',
    ceba: 'Levante y Ceba (Finalización para Mercado)',
    ciclo_completo: 'Ciclo Completo (Parto a Finalización)'
  };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let cursorY = 14;

  // Brand Header Banner
  doc.setFillColor(76, 29, 149); // #4c1d95
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 24, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('PorciPlan · Ficha Técnica y Económica', margin + 5, cursorY + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(pdfSafe(char.name), margin + 5, cursorY + 15);

  doc.setFontSize(8.5);
  const metaParts = [
    char.producerName ? `Productor: ${char.producerName}` : null,
    char.location ? `Ubicación: ${char.location}` : null,
    `Fecha: ${new Date().toLocaleDateString('es-ES')}`
  ].filter(Boolean);
  doc.text(pdfSafe(metaParts.join('  ·  ')), margin + 5, cursorY + 20.5);

  cursorY += 30;

  // Status pill / box
  const statusBadgeText = evaluation.canDeclareViable
    ? 'Estado Presupuestal: Dentro del monto (Completo)'
    : evaluation.status === 'deficit_estimado'
    ? 'Estado Presupuestal: Déficit Estimado'
    : 'Estado Presupuestal: Evaluación Parcial / Pendiente';

  const statusFill: [number, number, number] = evaluation.canDeclareViable
    ? [236, 253, 245]
    : evaluation.status === 'deficit_estimado'
    ? [255, 241, 242]
    : [255, 251, 235];
  const statusText: [number, number, number] = evaluation.canDeclareViable
    ? [6, 95, 70]
    : evaluation.status === 'deficit_estimado'
    ? [159, 18, 57]
    : [146, 64, 14];

  doc.setFillColor(...statusFill);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 8, 2, 2, 'F');
  doc.setTextColor(...statusText);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(pdfSafe(statusBadgeText), margin + 4, cursorY + 5.3);
  cursorY += 12;

  const drawSectionHeading = (title: string) => {
    if (cursorY > 265) {
      doc.addPage();
      cursorY = 16;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(59, 7, 100);
    doc.text(pdfSafe(title), margin, cursorY);
    cursorY += 2.5;
  };

  // 1. Characterization Parameters
  drawSectionHeading('1. Parámetros de la Explotación Porcina');

  const materialsText =
    char.availableMaterials.length > 0
      ? char.availableMaterials
          .map((mId) => MATERIAL_OPTIONS.find((o) => o.id === mId)?.label.split('(')[0].trim() || mId)
          .join(', ')
      : 'Sin registrar';

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.4, textColor: [30, 41, 59] },
    headStyles: { fillColor: [243, 232, 255], textColor: [59, 7, 100], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42, fillColor: [250, 245, 255] },
      1: { cellWidth: 49 },
      2: { fontStyle: 'bold', cellWidth: 42, fillColor: [250, 245, 255] },
      3: { cellWidth: 49 }
    },
    body: [
      [
        'Orientación',
        pdfSafe(orientationMap[char.orientation] || char.orientation),
        'Capacidad',
        pdfSafe(`${char.animalCount} cerdos`)
      ],
      [
        'Terreno',
        pdfSafe(`${char.terrain.length}m × ${char.terrain.width}m (${char.terrain.totalArea} m²)`),
        'Topografía',
        pdfSafe(char.terrain.topography.replace('_', ' '))
      ],
      [
        'Fuente de Agua',
        pdfSafe(char.waterSource.replace('_', ' ')),
        'Energía Eléctrica',
        char.hasElectricity ? 'Disponible' : 'No disponible'
      ],
      [
        'Infraestructura Previa',
        pdfSafe(char.hasExistingInfrastructure ? char.existingInfraDetails || 'Existente' : 'Predio Nuevo'),
        'Presupuesto Disp.',
        pdfSafe(`${currency} $${evaluation.availableBudget.toLocaleString()}`)
      ],
      [
        'Materiales Locales',
        pdfSafe(materialsText),
        'Verif. Inventario',
        pdfSafe(
          `${evaluation.materialCoverage.verifiedMaterialEntriesCount} verif. · ${evaluation.materialCoverage.appliedDiscountItemsCount} descontado(s)`
        )
      ]
    ]
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  if (verifiedMaterialDetails.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [236, 253, 245], textColor: [6, 95, 70], fontStyle: 'bold' },
      head: [['Material Verificado', 'Cantidad', 'Estado', 'Uso Previsto', `Costo Local/Flete (${currency})`]],
      body: verifiedMaterialDetails.map((m) => [
        pdfSafe(m.label),
        pdfSafe(`${m.availableQuantity} ${m.unit}`),
        pdfSafe(MATERIAL_CONDITION_LABELS[m.usableCondition]),
        pdfSafe(m.intendedUse || '-'),
        pdfSafe(m.purchaseOrTransportCost ? `$${Number(m.purchaseOrTransportCost).toLocaleString()}` : '$0')
      ])
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  }

  // 2. Technical Sizing
  let sectionNum = 2;
  if (isCeba) {
    drawSectionHeading('2. Dimensionamiento Técnico (Levante y Ceba)');
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46, fillColor: [250, 245, 255] },
        1: { cellWidth: 45 },
        2: { fontStyle: 'bold', cellWidth: 46, fillColor: [250, 245, 255] },
        3: { cellWidth: 45 }
      },
      body: [
        [
          'Superficie Libre Min.',
          pdfSafe(`${growthLayout.netFreeFloorArea} m² (${growthLayout.appliedDensity} ${growthLayout.densityUnit})`),
          'Nave Calculada',
          pdfSafe(`${growthLayout.pavilionLength}m × ${growthLayout.pavilionWidth}m (${growthLayout.pavilionGrossArea} m²)`)
        ],
        [
          'Corrales',
          pdfSafe(`${growthLayout.pensCount} corrales (${growthLayout.netAreaPerPen} m² c/u)`),
          'Bebederos Chupón',
          pdfSafe(`>= ${growthLayout.waterSystem.minDrinkersTotal} unid. (${growthLayout.waterSystem.drinkerFlowRate})`)
        ],
        [
          'Tanque Reserva (3d)',
          pdfSafe(`${growthLayout.waterSystem.tankReserveLiters.toLocaleString()} L (${growthLayout.waterSystem.tankReserveM3} m³)`),
          'Bodega Alimento (15d)',
          pdfSafe(`${growthLayout.feedSystem.requiredStorageAreaM2} m² (${growthLayout.feedSystem.totalStockTons} ton)`)
        ],
        [
          'Manejo Efluentes (30d)',
          pdfSafe(`${growthLayout.effluentSystem.pitVolumeM3} m³ (${growthLayout.effluentSystem.pitSurfaceM2} m²)`),
          'Viabilidad Espacial',
          pdfSafe(growthLayout.validation.isViable ? 'Viable en el lote' : 'No viable / Requiere ajuste')
        ]
      ]
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
    sectionNum = 3;
  } else if (isCria) {
    drawSectionHeading('2. Dimensionamiento Técnico de Cría');
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 46, fillColor: [250, 245, 255] },
        1: { cellWidth: 45 },
        2: { fontStyle: 'bold', cellWidth: 46, fillColor: [250, 245, 255] },
        3: { cellWidth: 45 }
      },
      body: [
        [
          `Gestación (${breedingLayout.gestation.housing})`,
          pdfSafe(`${breedingLayout.gestation.pavilionLength}m × ${breedingLayout.gestation.pavilionWidth}m (${breedingLayout.gestation.sowsCount} cerdas)`),
          'Maternidad',
          pdfSafe(`${breedingLayout.farrowing.roomsCount} sala(s), ${breedingLayout.farrowing.totalPlaces} parideras (${breedingLayout.farrowing.totalGrossArea} m²)`)
        ],
        [
          'Verracos',
          pdfSafe(breedingLayout.boars.enabled ? `${breedingLayout.boars.boarsCount} plaza(s) (${breedingLayout.boars.totalGrossArea} m²)` : 'No aplica (0 verracos)'),
          'Reserva Hídrica (3d)',
          pdfSafe(`${breedingLayout.waterSystem.tankReserveLiters.toLocaleString()} L (${breedingLayout.waterSystem.tankReserveM3} m³)`)
        ],
        [
          'Iluminación Mín.',
          pdfSafe(`>= ${breedingLayout.lightingHoursMin} horas/día`),
          'Viabilidad Espacial',
          pdfSafe(breedingLayout.validation.isViable ? 'Viable en el lote' : breedingLayout.validation.hasValidTerrain ? 'Requiere ajuste espacial' : 'Pendiente dimensiones lote')
        ]
      ]
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
    sectionNum = 3;
  }

  // 3. Budget Evaluation & Traceable Table
  drawSectionHeading(`${sectionNum}. Evaluación Financiera y Trazabilidad del Presupuesto`);
  sectionNum += 1;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, fillColor: [250, 245, 255] },
      1: { cellWidth: 41 },
      2: { fontStyle: 'bold', cellWidth: 50, fillColor: [250, 245, 255] },
      3: { cellWidth: 41 }
    },
    body: [
      [
        'Presupuesto Disponible',
        pdfSafe(`${currency} $${evaluation.availableBudget.toLocaleString()}`),
        'Subtotal Confirmado (Obra/Eq.)',
        pdfSafe(`${currency} $${evaluation.confirmedSubtotal.toLocaleString()}`)
      ],
      [
        'Imprevistos (separados)',
        pdfSafe(`${currency} $${evaluation.confirmedContingency.toLocaleString()}`),
        'Total General Confirmado',
        pdfSafe(`${currency} $${evaluation.confirmedGrandTotal.toLocaleString()}`)
      ],
      [
        'Cobertura de Rubros',
        pdfSafe(`${evaluation.confirmedItemsCount}/${evaluation.totalItems} completos (${evaluation.pendingPriceCount} sin precio, ${evaluation.pendingQuantityCount} sin cant.)`),
        evaluation.status === 'deficit_estimado' ? 'Déficit Estimado' : evaluation.status === 'dentro_del_monto' ? 'Margen Confirmado' : 'Evaluación',
        pdfSafe(
          evaluation.status === 'evaluacion_incompleta'
            ? 'Incompleta / Parcial'
            : `${currency} $${Math.abs(evaluation.balance).toLocaleString()}`
        )
      ]
    ]
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Status detail & blockers note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  const detailLines = doc.splitTextToSize(
    pdfSafe(`${evaluation.statusLabel}: ${evaluation.statusDetail}`),
    pageWidth - margin * 2
  );
  doc.text(detailLines, margin, cursorY + 2);
  cursorY += detailLines.length * 4 + 3;

  if (evaluation.viabilityBlockers.length > 0) {
    const blockerText = `Bloqueos activos: ${evaluation.viabilityBlockers.join(' | ')}`;
    const blockerLines = doc.splitTextToSize(pdfSafe(blockerText), pageWidth - margin * 2);
    doc.setTextColor(159, 18, 57);
    doc.text(blockerLines, margin, cursorY);
    cursorY += blockerLines.length * 4 + 3;
  }

  if (project.budgetItems.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      styles: { fontSize: 7.8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [76, 29, 149], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 66 },
        1: { cellWidth: 28 },
        2: { cellWidth: 27, halign: 'right' },
        3: { cellWidth: 34, halign: 'right' },
        4: { cellWidth: 27, halign: 'right', fontStyle: 'bold' }
      },
      head: [['Rubro y Origen', 'Categoría', 'Cantidad', 'Unitario / Fuente', `Total (${currency})`]],
      body: project.budgetItems.map((it) => {
        const norm = normalizeBudgetItem(it);
        const stage = it.stageTag ? ` [${STAGE_LABELS[it.stageTag] || it.stageTag}]` : '';
        const conceptLines = [
          `${it.concept}${stage}`,
          it.quantityOrigin ? `Origen: ${it.quantityOrigin}` : '',
          it.discountExplanation ? `Desc.: ${it.discountExplanation}` : ''
        ]
          .filter(Boolean)
          .join('\n');

        const qtyText = norm.isQuantityPending
          ? `Pendiente (${it.unit})`
          : `${it.quantity} ${it.unit}\n(${QUANTITY_SOURCE_LABELS[norm.quantitySource]})`;

        const unitText = norm.isPricePending
          ? 'Pendiente cotizar'
          : `$${Number(it.unitCost).toLocaleString()}\n(${PRICE_SOURCE_LABELS[norm.priceSource]})${
              it.supplierOrRef ? `\n${it.supplierOrRef}` : ''
            }`;

        const totalText =
          norm.isQuantityPending || norm.isPricePending
            ? 'Pendiente'
            : norm.isTemplateExample
            ? `$${Number(it.totalCost).toLocaleString()} (Ej.)`
            : `$${Number(norm.effectiveTotal).toLocaleString()}`;

        return [
          pdfSafe(conceptLines),
          pdfSafe(BUDGET_CATEGORY_LABELS[it.category]?.split('(')[0].trim() || it.category),
          pdfSafe(qtyText),
          pdfSafe(unitText),
          pdfSafe(totalText)
        ];
      })
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  }

  // 4. Producer Observations
  if (observations.length > 0) {
    drawSectionHeading(`${sectionNum}. Seguimiento de Observaciones del Productor`);
    sectionNum += 1;
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 7.8, cellPadding: 2 },
      headStyles: { fillColor: [243, 232, 255], textColor: [59, 7, 100], fontStyle: 'bold' },
      head: [['Fuente', 'Estado', 'Observación Registrada', 'Alcance / Alerta']],
      body: observations.map((o) => [
        pdfSafe(o.sourceLabel),
        o.status === 'confirmada' ? 'Confirmada' : o.status === 'descartada' ? 'Descartada' : 'Pendiente',
        pdfSafe(o.excerpt),
        pdfSafe(o.detectedHint)
      ])
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  }

  // 5. Recommendations
  drawSectionHeading(`${sectionNum}. Recomendaciones según Datos del Proyecto`);
  sectionNum += 1;
  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8.2, cellPadding: 1.8, textColor: [51, 65, 85] },
    body: recommendations.map((rec, i) => [`0${i + 1}.`, pdfSafe(rec)]),
    columnStyles: {
      0: { cellWidth: 10, fontStyle: 'bold', textColor: [107, 33, 168] },
      1: { cellWidth: pageWidth - margin * 2 - 10 }
    }
  });
  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 6. Checklist
  drawSectionHeading(`${sectionNum}. Checklist de Criterios Constructivos`);
  const floorChecklist =
    isCeba && project.growthFinishConfig?.housingSystem === 'cama_profunda'
      ? [
          'Cama Profunda Seca y Aireada (40-50 cm)',
          'Sustrato vegetal absorbente (cascarilla o viruta) sobre base firme compactada, sin losa de concreto en corrales.'
        ]
      : [
          'Pendiente de Piso Sanitario (2-3%)',
          'Superficie de concreto antideslizante con caída continua hacia las canaletas traseras de lavado.'
        ];

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [243, 232, 255], textColor: [59, 7, 100], fontStyle: 'bold' },
    head: [['Criterio Constructivo', 'Descripción Técnica']],
    body: [
      [
        'Orientación Bioclimática Este-Oeste',
        'El eje longitudinal de las naves porcinas debe ubicarse de Este a Oeste para reducir calentamiento solar lateral.'
      ],
      floorChecklist,
      [
        'Bioseguridad y Filtro de Acceso',
        'Pediluvio en la puerta, cerramiento perimetral de protección y vestier para cambio de calzado.'
      ],
      [
        'Manejo Responsable de Efluentes',
        'Fosa o área de manejo impermeabilizada ubicada a distancia segura de fuentes hídricas y a sotavento.'
      ],
      [
        'Reserva Hídrica Autónoma (48-72h)',
        'Tanque elevado que garantice suministro ininterrumpido a bebederos tipo chupón.'
      ]
    ].map(([t, d]) => [pdfSafe(t), pdfSafe(d)])
  });

  // Footer with page numbers & honest price scope note
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'PorciPlan · Cálculos zootécnicos locales; valores monetarios según cotizaciones ingresadas por el productor.',
      margin,
      289
    );
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, 289, { align: 'right' });
  }

  const safeSlug =
    char.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'proyecto';

  doc.save(`ficha_tecnica_${safeSlug}.pdf`);
}
