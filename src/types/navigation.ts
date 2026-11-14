export type AppSection = 
  | 'inicio'
  | 'caracterizacion'
  | 'planificacion'
  | 'diseno_2d'
  | 'presupuesto'
  | 'resultados';

export interface SectionMetadata {
  id: AppSection;
  title: string;
  shortTitle: string;
  description: string;
  number: string;
}

export const SECTIONS: SectionMetadata[] = [
  {
    id: 'inicio',
    title: 'Inicio y Gestión de Proyectos',
    shortTitle: 'Proyectos',
    description: 'Creación, selección y administración local de planes porcinos.',
    number: '01'
  },
  {
    id: 'caracterizacion',
    title: 'Caracterización de la Explotación',
    shortTitle: 'Caracterización',
    description: 'Registro de orientación, terreno, materiales y presupuesto base.',
    number: '02'
  },
  {
    id: 'planificacion',
    title: 'Planificación Técnica',
    shortTitle: 'Planificación',
    description: 'Estructuración modular de áreas según requerimientos porcinos.',
    number: '03'
  },
  {
    id: 'diseno_2d',
    title: 'Diseño Esquemático 2D',
    shortTitle: 'Diseño 2D',
    description: 'Representación visual del lote, galpones y bioseguridad en plano interactivo.',
    number: '04'
  },
  {
    id: 'presupuesto',
    title: 'Presupuesto Estimado',
    shortTitle: 'Presupuesto',
    description: 'Desglose organizado por rubros y balance frente al presupuesto disponible.',
    number: '05'
  },
  {
    id: 'resultados',
    title: 'Resultados y Recomendaciones',
    shortTitle: 'Resultados',
    description: 'Ficha ejecutiva integral, checklist de buenas prácticas y exportación.',
    number: '06'
  }
];
