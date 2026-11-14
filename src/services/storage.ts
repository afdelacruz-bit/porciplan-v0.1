import { PorciProject, BudgetItem, ProjectCharacterization } from '../types/project';

const STORAGE_KEY = 'porciplan_projects_v1';
const ACTIVE_ID_KEY = 'porciplan_active_id';

export const MATERIAL_OPTIONS = [
  { id: 'concreto', label: 'Concreto / Cemento (pisos, muros de contención)' },
  { id: 'ladrillo_bloque', label: 'Ladrillo o bloque de cemento' },
  { id: 'perfileria_metalica', label: 'Tubería y perfilería metálica (divisiones, cerchas)' },
  { id: 'teja_zinc', label: 'Teja de zinc / lámina galvanizada' },
  { id: 'teja_fibrocemento', label: 'Teja de fibrocemento / termoacústica' },
  { id: 'madera_inmunizada', label: 'Madera inmunizada o tablas tratadas' },
  { id: 'guadua_bambu', label: 'Guadua / Bambú local curado' },
  { id: 'malla_eslabonada', label: 'Malla eslabonada / cerca perimetral' },
  { id: 'plastico_geomembrana', label: 'Geomembrana plástica (estercolero/biodigestor)' },
  { id: 'piso_plastico_slat', label: 'Piso plástico tipo slats ranurado' }
];

export const INITIAL_SAMPLE_PROJECT: PorciProject = {
  characterization: {
    id: 'proj_sample_01',
    name: 'Granja San Jerónimo - Ceba 60',
    producerName: 'Carlos M. Rodríguez',
    location: 'Vereda El Porvenir, Cundinamarca',
    orientation: 'ceba',
    animalCount: 60,
    terrain: {
      length: 40,
      width: 25,
      totalArea: 1000,
      topography: 'leve_pendiente'
    },
    hasExistingInfrastructure: true,
    existingInfraDetails: 'Piso de concreto rústico de 8x6m y acometida de agua de acueducto veredal en funcionamiento.',
    availableBudget: 28000000,
    currency: 'COP',
    availableMaterials: ['concreto', 'ladrillo_bloque', 'teja_fibrocemento', 'perfileria_metalica', 'malla_eslabonada'],
    otherMaterials: 'Arena y grava de río cercana disponibles sin costo de flete.',
    waterSource: 'acueducto',
    hasElectricity: true,
    notes: 'Terreno con orientación longitudinal este-oeste adecuada para ventilación natural. Vientos predominantes de oriente.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  budgetItems: [
    {
      id: 'b_01',
      category: 'obras_civiles',
      concept: 'Piso de concreto con pendiente 3% y acabado semi-rústico para galpón de ceba',
      unit: 'm²',
      quantity: 96,
      unitCost: 65000,
      totalCost: 6240000,
      notes: 'Espesor 10cm, malla electrosoldada'
    },
    {
      id: 'b_02',
      category: 'obras_civiles',
      concept: 'Muros divisorios y perimetrales en bloque de cemento (altura 1.0 m)',
      unit: 'm²',
      quantity: 54,
      unitCost: 48000,
      totalCost: 2592000,
      notes: 'Repello afinado e impermeabilizado'
    },
    {
      id: 'b_03',
      category: 'obras_civiles',
      concept: 'Estructura de techo (cerchas metálicas ligeras y teja termoacústica)',
      unit: 'm²',
      quantity: 110,
      unitCost: 75000,
      totalCost: 8250000,
      notes: 'Alero de 80cm para sombreo lateral'
    },
    {
      id: 'b_04',
      category: 'equipamiento',
      concept: 'Comederos tipo tolva seca/húmeda en acero inoxidable para ceba (capacidad 4-5 bocas)',
      unit: 'unidad',
      quantity: 4,
      unitCost: 680000,
      totalCost: 2720000,
      notes: '1 boca por cada 12-15 cerdos'
    },
    {
      id: 'b_05',
      category: 'equipamiento',
      concept: 'Bebederos tipo chupón de acero inoxidable con soporte graduable',
      unit: 'unidad',
      quantity: 8,
      unitCost: 38000,
      totalCost: 304000,
      notes: 'Instalados sobre zona húmeda de desagüe'
    },
    {
      id: 'b_06',
      category: 'hidraulico_electrico',
      concept: 'Tanque de reserva de agua de 2.000 L y red de distribución en PVC sanitaria y presión',
      unit: 'global',
      quantity: 1,
      unitCost: 1850000,
      totalCost: 1850000,
      notes: 'Garantiza autonomía hídrica de mínimo 3 días'
    },
    {
      id: 'b_07',
      category: 'bioseguridad_ambiental',
      concept: 'Fosa de sedimentación y estercolero techado con trampa de sólidos para porcinaza',
      unit: 'unidad',
      quantity: 1,
      unitCost: 3200000,
      totalCost: 3200000,
      notes: 'Impermeabilizado para evitar infiltraciones a fuentes freáticas'
    },
    {
      id: 'b_08',
      category: 'bioseguridad_ambiental',
      concept: 'Pediluvio y rodaluvio desinfectante en entrada principal con arco de aspersión básico',
      unit: 'unidad',
      quantity: 1,
      unitCost: 650000,
      totalCost: 650000,
      notes: 'Control de acceso sanitario'
    },
    {
      id: 'b_09',
      category: 'imprevistos',
      concept: 'Fletes menores de materiales y reserva para contingencias constructivas (5%)',
      unit: 'global',
      quantity: 1,
      unitCost: 1200000,
      totalCost: 1200000,
      notes: 'Margen de seguridad'
    }
  ],
  technicalNotes: {
    orientacion_galpon: 'Eje longitudinal orientado Este - Oeste para minimizar incidencia de sol sobre paredes.',
    ventilacion: 'Cortinas plásticas laterales regulables según temperatura ambiental y vientos.',
    drenaje: 'Canaletas perimetrales exteriores para aguas lluvias separadas de efluentes porcinos.'
  },
  status: 'en_planificacion'
};

export function createBlankProject(name: string = 'Nuevo Proyecto Porcino'): PorciProject {
  const id = `proj_${Date.now()}`;
  return {
    characterization: {
      id,
      name,
      producerName: '',
      location: '',
      orientation: 'ceba',
      animalCount: 30,
      terrain: {
        length: 0,
        width: 0,
        totalArea: 0,
        topography: 'plano'
      },
      hasExistingInfrastructure: false,
      existingInfraDetails: '',
      availableBudget: 0,
      currency: 'COP',
      availableMaterials: [],
      otherMaterials: '',
      waterSource: 'acueducto',
      hasElectricity: true,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    budgetItems: [],
    technicalNotes: {},
    status: 'borrador'
  };
}

export function getStoredProjects(): PorciProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with sample project
      const seed = [INITIAL_SAMPLE_PROJECT];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [INITIAL_SAMPLE_PROJECT];
  } catch (e) {
    console.error('Error reading projects from storage:', e);
    return [INITIAL_SAMPLE_PROJECT];
  }
}

export function getActiveProjectId(): string {
  try {
    const active = localStorage.getItem(ACTIVE_ID_KEY);
    if (active) return active;
    const projects = getStoredProjects();
    const fallback = projects[0]?.characterization.id || INITIAL_SAMPLE_PROJECT.characterization.id;
    localStorage.setItem(ACTIVE_ID_KEY, fallback);
    return fallback;
  } catch {
    return INITIAL_SAMPLE_PROJECT.characterization.id;
  }
}

export function setActiveProjectId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  } catch (e) {
    console.error('Error saving active project id:', e);
  }
}

export function saveProjectToStorage(project: PorciProject): void {
  try {
    const projects = getStoredProjects();
    const index = projects.findIndex(p => p.characterization.id === project.characterization.id);
    const updated = {
      ...project,
      characterization: {
        ...project.characterization,
        updatedAt: new Date().toISOString()
      }
    };
    if (index >= 0) {
      projects[index] = updated;
    } else {
      projects.push(updated);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Error saving project to storage:', e);
  }
}

export function deleteProjectFromStorage(id: string): PorciProject[] {
  try {
    let projects = getStoredProjects();
    projects = projects.filter(p => p.characterization.id !== id);
    if (projects.length === 0) {
      projects = [createBlankProject('Mi Proyecto Porcino')];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    setActiveProjectId(projects[0].characterization.id);
    return projects;
  } catch (e) {
    console.error('Error deleting project:', e);
    return [];
  }
}

export function resetToSampleProject(): PorciProject {
  const sample = JSON.parse(JSON.stringify(INITIAL_SAMPLE_PROJECT));
  sample.characterization.id = `proj_${Date.now()}`;
  sample.characterization.name = 'Granja Demostración - Ceba 60';
  saveProjectToStorage(sample);
  setActiveProjectId(sample.characterization.id);
  return sample;
}
