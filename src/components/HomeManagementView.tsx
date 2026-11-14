import React from 'react';
import { PorciProject } from '../types/project';
import { AppSection, SECTIONS } from '../types/navigation';
import { 
  Plus, 
  ArrowRight, 
  MapPin,
  ShieldCheck,
  FolderOpen,
  FolderKanban
} from 'lucide-react';

interface HomeManagementViewProps {
  activeProject: PorciProject;
  projects: PorciProject[];
  onSelectProject: (id: string) => void;
  onNavigate: (section: AppSection) => void;
  onNewProject: () => void;
  onOpenProjectManager: () => void;
}

export const HomeManagementView: React.FC<HomeManagementViewProps> = ({
  activeProject,
  projects,
  onSelectProject,
  onNavigate,
  onNewProject,
  onOpenProjectManager
}) => {
  const orientationNames: Record<string, string> = {
    cria: 'Cría (Reproducción)',
    ceba: 'Levante / Ceba',
    ciclo_completo: 'Ciclo Completo'
  };

  const totalBudgetCalculated = activeProject.budgetItems.reduce((acc, item) => acc + item.totalCost, 0);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-purple-950 to-slate-950 text-white p-6 sm:p-10 shadow-xl border border-purple-800/40">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
            <span>Herramienta para productores porcinos</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Planifica tus instalaciones porcinas con criterio técnico y control económico.
          </h1>

          <p className="text-sm sm:text-base text-purple-100/90 leading-relaxed">
            PorciPlan te acompaña paso a paso en la caracterización de tu predio, esquema visual de galpones y estimación de costos para guiarte a tus objetivos.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenProjectManager}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-100 border border-white/20 font-medium text-sm transition-all flex items-center gap-2"
              title="Cambiar o gestionar proyectos guardados"
            >
              <FolderKanban className="w-4 h-4 text-purple-300 shrink-0" />
              <span>Proyectos Guardados ({projects.length})</span>
            </button>
            <button
              onClick={onNewProject}
              className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-semibold text-sm shadow-md shadow-purple-950/40 transition-all flex items-center gap-2"
              title="Crear un nuevo proyecto"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Proyecto</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative background graphic */}
        <div className="absolute -right-12 -bottom-16 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
      </section>

      {/* Active Project Highlight Card */}
      <section className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-50 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Proyecto Activo</span>
            <h2 className="text-xl font-bold text-slate-900">{activeProject.characterization.name}</h2>
            {activeProject.characterization.location && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-purple-500" />
                <span>{activeProject.characterization.location}</span>
                {activeProject.characterization.producerName && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Productor: {activeProject.characterization.producerName}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenProjectManager}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-purple-200 text-purple-900 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-purple-700" />
              <span>Cambiar Proyecto</span>
            </button>
            <button
              onClick={() => onNavigate('caracterizacion')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-700 hover:bg-purple-800 text-white transition-colors"
            >
              Editar Datos
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100/80">
            <span className="text-xs text-purple-900 font-medium">Orientación Productiva</span>
            <p className="text-base font-bold text-purple-950 mt-1 truncate">
              {orientationNames[activeProject.characterization.orientation] || activeProject.characterization.orientation}
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Tipo de explotación</span>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100/80">
            <span className="text-xs text-purple-900 font-medium">Capacidad Proyectada</span>
            <p className="text-base font-bold text-purple-950 mt-1 font-mono tabular-nums">
              {activeProject.characterization.animalCount} animales
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Población de diseño</span>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100/80">
            <span className="text-xs text-purple-900 font-medium">Lote Disponible</span>
            <p className="text-base font-bold text-purple-950 mt-1 font-mono tabular-nums">
              {activeProject.characterization.terrain.totalArea} m²
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {activeProject.characterization.terrain.length}m × {activeProject.characterization.terrain.width}m
            </span>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100/80">
            <span className="text-xs text-purple-900 font-medium">Presupuesto Disponible</span>
            <p className="text-base font-bold text-purple-950 mt-1 font-mono tabular-nums truncate">
              {activeProject.characterization.currency} ${Number(activeProject.characterization.availableBudget || 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Costos: ${Number(totalBudgetCalculated || 0).toLocaleString()}
            </span>
          </div>
        </div>

      </section>

      {/* 6 Sections Guided Process */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Módulos de Planificación PorciPlan</h2>
          <p className="text-xs text-slate-500">Recorre de forma ordenada cada una de las fases de estructuración de tu granja.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map((sec) => (
            <div
              key={sec.id}
              onClick={() => onNavigate(sec.id)}
              className="group p-5 rounded-2xl bg-white border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                    Paso {sec.number}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-950 transition-colors">
                  {sec.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {sec.description}
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-purple-700 font-semibold">
                <span>Acceder al módulo</span>
                <span className="text-slate-400 font-normal">→</span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
