import React, { useState, useRef } from 'react';
import { PorciProject } from '../types/project';
import { 
  X, 
  Plus, 
  FolderKanban, 
  Trash2, 
  Check, 
  Download, 
  Upload, 
  RotateCcw,
  Calendar,
  Layers,
  DollarSign
} from 'lucide-react';
import { createBlankProject, resetToSampleProject } from '../services/storage';

interface ProjectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: PorciProject[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (project: PorciProject) => void;
  onDeleteProject: (id: string) => void;
  onImportProjects: (imported: PorciProject[]) => void;
}

export const ProjectListModal: React.FC<ProjectListModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onImportProjects
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmLoadSample, setConfirmLoadSample] = useState(false);
  const [importNotice, setImportNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setErrorMsg('Por favor ingresa un nombre para el proyecto.');
      return;
    }
    const newProj = createBlankProject(newProjectName.trim());
    onCreateProject(newProj);
    setNewProjectName('');
    setIsCreating(false);
    setErrorMsg('');
  };

  const handleExportAll = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `porciplan_proyectos_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportNotice('');
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportProjects(parsed);
          } else if (parsed && parsed.characterization) {
            onImportProjects([parsed]);
          } else {
            setImportNotice('El archivo no contiene un formato de proyecto válido de PorciPlan.');
          }
        } catch {
          setImportNotice('Error al leer el archivo JSON.');
        }
      };
    }
  };

  const orientationLabels: Record<string, string> = {
    cria: 'Cría (Reproducción)',
    ceba: 'Levante / Ceba',
    ciclo_completo: 'Ciclo Completo'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-white dark:from-purple-950/60 dark:to-[#190e26]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-purple-950">Proyectos Guardados</h2>
              <p className="text-xs text-slate-500">Almacenamiento local en tu navegador</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Quick Create Bar */}
          {!isCreating ? (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-purple-50/60 rounded-xl border border-purple-100">
              <span className="text-xs font-medium text-purple-900">
                {projects.length} {projects.length === 1 ? 'proyecto registrado' : 'proyectos registrados'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nuevo Proyecto
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-purple-900">Nombre del nuevo proyecto</label>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setErrorMsg(''); }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
              </div>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Ej. Granja Porcina El Cedro - Ceba 40"
                className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                autoFocus
              />
              {errorMsg && (
                <p className="text-xs text-red-600">{errorMsg}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors"
                >
                  Crear e Iniciar
                </button>
              </div>
            </form>
          )}

          {importNotice && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
              <span>{importNotice}</span>
              <button type="button" onClick={() => setImportNotice('')} className="text-rose-600 font-semibold ml-2">
                Cerrar
              </button>
            </div>
          )}

          {/* Project List */}
          <div className="space-y-2.5">
            {projects.map((proj) => {
              const isActive = proj.characterization.id === activeProjectId;
              const isConfirmingDelete = confirmDeleteId === proj.characterization.id;
              const formattedDate = new Date(proj.characterization.updatedAt || proj.characterization.createdAt).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div
                  key={proj.characterization.id}
                  onClick={() => {
                    if (!isConfirmingDelete) {
                      onSelectProject(proj.characterization.id);
                      onClose();
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-600/20 shadow-xs'
                      : 'bg-white hover:bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {proj.characterization.name || 'Sin nombre'}
                      </h3>
                      {isActive && (
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                          Activo
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{orientationLabels[proj.characterization.orientation] || proj.characterization.orientation}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{proj.characterization.animalCount} cerdos</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{proj.characterization.terrain.totalArea} m²</span>
                      <span aria-hidden="true">·</span>
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                        <span className="text-[11px] font-semibold text-rose-800">
                          {projects.length === 1 ? '¿Reiniciar proyecto?' : '¿Eliminar?'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteProject(proj.characterization.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-0.5 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200/70 rounded transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject(proj.characterization.id);
                            onClose();
                          }}
                          className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                            isActive
                              ? 'text-purple-700 bg-purple-100'
                              : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
                          }`}
                          title="Seleccionar proyecto"
                        >
                          {isActive ? <Check className="w-4 h-4 text-purple-700" /> : 'Abrir'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(proj.characterization.id)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Import / Export & Sample utilities */}
          <div className="pt-4 border-t border-purple-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Copia (JSON)
              </button>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Importar
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {!confirmLoadSample ? (
              <button
                type="button"
                onClick={() => setConfirmLoadSample(true)}
                className="flex items-center gap-1.5 text-purple-700 hover:text-purple-900 font-medium hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Cargar Ejemplo Demostrativo
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1">
                <span className="text-[11px] font-medium text-purple-900">¿Crear ejemplo?</span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = resetToSampleProject();
                    onCreateProject(sample);
                    setConfirmLoadSample(false);
                    onClose();
                  }}
                  className="px-2 py-0.5 text-[11px] font-bold bg-purple-700 text-white rounded hover:bg-purple-800"
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLoadSample(false)}
                  className="px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200/70 rounded"
                >
                  No
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
