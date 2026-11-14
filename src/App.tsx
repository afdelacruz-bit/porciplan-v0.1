/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PorciProject, ProjectCharacterization, BudgetItem, ProducerObservationDecision } from './types/project';
import { BreedingUserConfig } from './types/breeding';
import { GrowthFinishUserConfig } from './types/growthFinish';
import { AppSection } from './types/navigation';
import { 
  getStoredProjects, 
  getActiveProjectId, 
  setActiveProjectId, 
  saveProjectToStorage, 
  deleteProjectFromStorage,
  createBlankProject,
  resetToSampleProject
} from './services/storage';
import { syncBudgetItemsWithHousingSystem } from './services/budgetEngine';

import { Header } from './components/Header';
import { ProjectListModal } from './components/ProjectListModal';
import { HomeManagementView } from './components/HomeManagementView';
import { CharacterizationView } from './components/CharacterizationView';
import { TechnicalPlanningView } from './components/TechnicalPlanningView';
import { Schematic2DView } from './components/Schematic2DView';
import { BudgetView } from './components/BudgetView';
import { ResultsSummaryView } from './components/ResultsSummaryView';

export default function App() {
  const [projects, setProjects] = useState<PorciProject[]>([]);
  const [activeProjectId, setActiveId] = useState<string>('');
  const [currentSection, setCurrentSection] = useState<AppSection>('inicio');
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('porciplan_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Sync dark class on root html element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('porciplan_theme', theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Initialize projects on mount
  useEffect(() => {
    const loadedProjects = getStoredProjects();
    const initialActiveId = getActiveProjectId();
    setProjects(loadedProjects);
    setActiveId(initialActiveId);
    setIsInitialized(true);
  }, []);

  const activeProject = projects.find(p => p.characterization.id === activeProjectId) 
    || projects[0] 
    || createBlankProject('Granja Porcina Principal');

  // Project Management Handlers
  const handleSelectProject = (id: string) => {
    setActiveId(id);
    setActiveProjectId(id);
  };

  const handleCreateProject = (newProject: PorciProject) => {
    saveProjectToStorage(newProject);
    const updated = getStoredProjects();
    setProjects(updated);
    handleSelectProject(newProject.characterization.id);
    setCurrentSection('caracterizacion');
  };

  const handleDeleteProject = (id: string) => {
    const remaining = deleteProjectFromStorage(id);
    setProjects(remaining);
    if (remaining.length > 0) {
      handleSelectProject(remaining[0].characterization.id);
    }
  };

  const handleImportProjects = (imported: PorciProject[]) => {
    imported.forEach(p => saveProjectToStorage(p));
    const all = getStoredProjects();
    setProjects(all);
    if (imported[0]) {
      handleSelectProject(imported[0].characterization.id);
    }
    setIsManagerOpen(false);
  };

  // Section Data Update Handlers
  const handleSaveCharacterization = (updatedChar: ProjectCharacterization) => {
    const updatedProject: PorciProject = {
      ...activeProject,
      characterization: updatedChar
    };
    saveProjectToStorage(updatedProject);
    const updatedList = projects.map(p => 
      p.characterization.id === updatedChar.id ? updatedProject : p
    );
    setProjects(updatedList);
  };

  const handleUpdateTechnicalNotes = (notes: Record<string, string>) => {
    const updatedProject: PorciProject = {
      ...activeProject,
      technicalNotes: notes
    };
    saveProjectToStorage(updatedProject);
    const updatedList = projects.map(p => 
      p.characterization.id === activeProject.characterization.id ? updatedProject : p
    );
    setProjects(updatedList);
  };

  const handleUpdateBudgetItems = (items: BudgetItem[]) => {
    const updatedProject: PorciProject = {
      ...activeProject,
      budgetItems: items
    };
    saveProjectToStorage(updatedProject);
    const updatedList = projects.map(p => 
      p.characterization.id === activeProject.characterization.id ? updatedProject : p
    );
    setProjects(updatedList);
  };

  const handleUpdateObservationDecisions = (decisions: ProducerObservationDecision[]) => {
    const updatedProject: PorciProject = {
      ...activeProject,
      observationDecisions: decisions
    };
    saveProjectToStorage(updatedProject);
    const updatedList = projects.map(p =>
      p.characterization.id === activeProject.characterization.id ? updatedProject : p
    );
    setProjects(updatedList);
  };

  const handleUpdateGrowthFinishConfig = (config: GrowthFinishUserConfig) => {
    const prevHousing = activeProject.growthFinishConfig?.housingSystem || 'convencional';
    const housingChanged = config.housingSystem !== prevHousing;
    const syncedBudgetItems = housingChanged
      ? syncBudgetItemsWithHousingSystem(activeProject, config.housingSystem)
      : activeProject.budgetItems;

    const updatedProject: PorciProject = {
      ...activeProject,
      growthFinishConfig: config,
      budgetItems: syncedBudgetItems
    };
    saveProjectToStorage(updatedProject);
    const updatedList = projects.map(p => 
      p.characterization.id === activeProject.characterization.id ? updatedProject : p
    );
    setProjects(updatedList);
  };

  const handleUpdateBreedingConfig = (config: BreedingUserConfig) => {
    const updatedProject: PorciProject = {
      ...activeProject,
      breedingConfig: config
    };
    saveProjectToStorage(updatedProject);
    const updatedList = projects.map(p =>
      p.characterization.id === activeProject.characterization.id ? updatedProject : p
    );
    setProjects(updatedList);
  };

  const handleApply2DAdjustment = (updates: {
    growthFinishConfig?: GrowthFinishUserConfig;
    breedingConfig?: BreedingUserConfig;
    animalCount?: number;
  }) => {
    const prevHousing = activeProject.growthFinishConfig?.housingSystem || 'convencional';
    const housingChanged =
      updates.growthFinishConfig !== undefined &&
      updates.growthFinishConfig.housingSystem !== prevHousing;
    const syncedBudgetItems =
      housingChanged && updates.growthFinishConfig
        ? syncBudgetItemsWithHousingSystem(activeProject, updates.growthFinishConfig.housingSystem)
        : activeProject.budgetItems;

    const updatedProject: PorciProject = {
      ...activeProject,
      characterization:
        updates.animalCount !== undefined
          ? { ...activeProject.characterization, animalCount: updates.animalCount }
          : activeProject.characterization,
      growthFinishConfig:
        updates.growthFinishConfig !== undefined
          ? updates.growthFinishConfig
          : activeProject.growthFinishConfig,
      breedingConfig:
        updates.breedingConfig !== undefined
          ? updates.breedingConfig
          : activeProject.breedingConfig,
      budgetItems: syncedBudgetItems
    };
    saveProjectToStorage(updatedProject);
    const updatedList = projects.map(p =>
      p.characterization.id === activeProject.characterization.id ? updatedProject : p
    );
    setProjects(updatedList);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#faf5ff] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf5ff] text-slate-800 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Bar Header */}
      <Header
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        projects={projects}
        activeProjectId={activeProject.characterization.id}
        onSelectProject={handleSelectProject}
        onOpenProjectManager={() => setIsManagerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentSection === 'inicio' && (
          <HomeManagementView
            activeProject={activeProject}
            projects={projects}
            onSelectProject={handleSelectProject}
            onNavigate={setCurrentSection}
            onNewProject={() => {
              const blank = createBlankProject(`Nuevo Proyecto ${projects.length + 1}`);
              handleCreateProject(blank);
            }}
            onOpenProjectManager={() => setIsManagerOpen(true)}
          />
        )}

        {currentSection === 'caracterizacion' && (
          <CharacterizationView
            characterization={activeProject.characterization}
            onSave={handleSaveCharacterization}
            onNavigateToNext={() => setCurrentSection('planificacion')}
          />
        )}

        {currentSection === 'planificacion' && (
          <TechnicalPlanningView
            project={activeProject}
            onUpdateTechnicalNotes={handleUpdateTechnicalNotes}
            onUpdateGrowthFinishConfig={handleUpdateGrowthFinishConfig}
            onUpdateBreedingConfig={handleUpdateBreedingConfig}
            onNavigateToNext={() => setCurrentSection('diseno_2d')}
          />
        )}

        {currentSection === 'diseno_2d' && (
          <Schematic2DView
            project={activeProject}
            onApplyPlanningAdjustment={handleApply2DAdjustment}
            onNavigateToNext={() => setCurrentSection('presupuesto')}
          />
        )}

        {currentSection === 'presupuesto' && (
          <BudgetView
            project={activeProject}
            onUpdateBudgetItems={handleUpdateBudgetItems}
            onUpdateObservationDecisions={handleUpdateObservationDecisions}
            onNavigateToNext={() => setCurrentSection('resultados')}
          />
        )}

        {currentSection === 'resultados' && (
          <ResultsSummaryView
            project={activeProject}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="no-print mt-auto border-t border-purple-100 bg-white/70 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-purple-950">PorciPlan</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Almacenamiento Local Activo</span>
            <span>·</span>
            <button
              onClick={() => {
                const sample = resetToSampleProject();
                handleCreateProject(sample);
              }}
              className="text-purple-700 hover:text-purple-900 font-medium hover:underline"
            >
              Cargar Proyecto de Ejemplo
            </button>
          </div>
        </div>
      </footer>

      {/* Project Manager Modal */}
      <ProjectListModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onImportProjects={handleImportProjects}
      />

    </div>
  );
}
