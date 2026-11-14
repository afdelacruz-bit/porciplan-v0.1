import React, { useState, useRef, useEffect } from 'react';
import { AppSection, SECTIONS } from '../types/navigation';
import { PorciProject } from '../types/project';
import { Sun, Moon, FolderKanban, ChevronDown, Check } from 'lucide-react';

interface HeaderProps {
  currentSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  projects: PorciProject[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onOpenProjectManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSection,
  onSelectSection,
  theme,
  onToggleTheme,
  projects,
  activeProjectId,
  onSelectProject,
  onOpenProjectManager
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProject = projects.find(p => p.characterization.id === activeProjectId) || projects[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-purple-100 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px] gap-3">
          
          {/* Zone 1: Brand Wordmark & Integrated Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectSection('inicio')}
              className="flex items-center gap-3 text-left group transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 rounded-xl p-1"
            >
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-100 via-purple-50 to-white dark:from-purple-200 dark:to-purple-100 border border-purple-300/80 dark:border-purple-400/60 shadow-sm shadow-purple-900/15 group-hover:scale-105 transition-transform shrink-0 flex items-center justify-center">
                <img
                  src="/assets/aistudio/Gemini_Generated_Image_xmvgv6xmvgv6xmvg_7c0efeed.jpg"
                  alt="Logo PorciPlan"
                  className="w-full h-full object-cover object-[50%_47%] scale-[1.48] mix-blend-multiply saturate-[1.35] contrast-[1.12] brightness-[1.03]"
                />
              </div>
              <div className="flex items-center">
                <span className="text-xl font-bold tracking-tight text-purple-950 group-hover:text-purple-800 transition-colors">
                  Porci<span className="text-purple-600">Plan</span>
                </span>
                <span className="hidden xl:inline-block ml-2.5 text-xs font-medium text-purple-600/80 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
                  Planificación Porcina
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
            {SECTIONS.map((sec) => {
              const isActive = currentSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => onSelectSection(sec.id)}
                  className={`px-2.5 xl:px-3 py-1.5 text-xs xl:text-sm font-medium rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-purple-100/90 text-purple-950 font-semibold shadow-xs border border-purple-200'
                      : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50/70'
                  }`}
                  title={sec.description}
                >
                  <span className="text-purple-500 font-mono text-[11px] font-semibold">{sec.number}</span>
                  <span>{sec.shortTitle}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Quick Project Switcher + Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Project Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                aria-expanded={isDropdownOpen}
                title="Cambiar entre proyectos guardados"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border border-purple-200/80 bg-purple-50 hover:bg-purple-100 text-purple-900 transition-colors shadow-2xs max-w-[170px] sm:max-w-[200px]"
              >
                <FolderKanban className="w-4 h-4 text-purple-700 shrink-0" />
                <span className="truncate hidden sm:inline">
                  {activeProject?.characterization.name || 'Proyectos'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-purple-600 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-purple-200 shadow-xl py-2 z-50">
                  <div className="px-3.5 py-1.5 border-b border-purple-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                      Proyectos Guardados ({projects.length})
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {projects.map((proj) => {
                      const isCurrent = proj.characterization.id === activeProjectId;
                      return (
                        <button
                          key={proj.characterization.id}
                          type="button"
                          onClick={() => {
                            onSelectProject(proj.characterization.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-2 transition-colors ${
                            isCurrent
                              ? 'bg-purple-50 text-purple-950 font-semibold'
                              : 'text-slate-700 hover:bg-purple-50/50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block truncate">{proj.characterization.name || 'Sin nombre'}</span>
                            <span className="text-[10px] text-slate-400">
                              {proj.characterization.orientation === 'cria' ? 'Cría' : 'Levante / Ceba'} · {proj.characterization.terrain.totalArea} m²
                            </span>
                          </div>
                          {isCurrent && <Check className="w-4 h-4 text-purple-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-purple-100 pt-1.5 px-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenProjectManager();
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-lg text-center transition-colors"
                    >
                      Gestionar / Crear / Eliminar proyectos...
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle (Light / Dark) */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-purple-200/80 bg-purple-50 hover:bg-purple-100 text-purple-900 transition-colors shadow-2xs whitespace-nowrap"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-purple-700 shrink-0" />
                  <span className="hidden sm:inline">Modo Oscuro</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-purple-100 no-scrollbar">
          {SECTIONS.map((sec) => {
            const isActive = currentSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => onSelectSection(sec.id)}
                className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-purple-700 text-white font-medium'
                    : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50'
                }`}
              >
                {sec.shortTitle}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
