import React, { useEffect, useState } from 'react';
import { Plus, Clock, FileEdit, Trash2, Wand2, FolderDown, MoreVertical, Download, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import * as Storage from '../services/storageService';
import * as GeminiService from '../services/geminiService';
import { Project } from '../types';

const HomeScreen: React.FC = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    setProjects(Storage.loadProjects());
  }, []);

  const refreshProjects = () => {
      setProjects(Storage.loadProjects());
  };

  const createProject = async (useAi: boolean) => {
    setIsGenerating(true);
    try {
        const id = crypto.randomUUID();
        let newProject: Project = {
            id,
            name: aiPrompt ? aiPrompt.substring(0, 20) : `${t('untitled')} ${new Date().toLocaleTimeString()}`,
            lastModified: Date.now(),
            width: 1080,
            height: 1080,
            backgroundColor: '#ffffff',
            elements: [],
            generatedAssets: []
        };

        if (useAi && aiPrompt) {
            const layout = await GeminiService.generateProjectLayout(aiPrompt, 1080, 1080);
            newProject = { ...newProject, ...layout };
        }

        Storage.saveProject(newProject);
        sessionStorage.setItem('current_project', JSON.stringify(newProject));
        navigate('/editor');
    } catch (e) {
        alert(t('error'));
    } finally {
        setIsGenerating(false);
        setShowNewModal(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              await Storage.importProjectZip(e.target.files[0]);
              refreshProjects();
          } catch (error) {
              alert("Import failed. Invalid file.");
          }
      }
      // Reset input
      e.target.value = '';
  };

  const handleExportZip = async (project: Project) => {
      try {
          const blob = await Storage.exportProjectZip(project);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${project.name.replace(/\s+/g, '_')}.zip`;
          a.click();
          URL.revokeObjectURL(url);
      } catch (e) {
          alert("Export failed");
      }
      setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
    if(confirm(t('delete') + "?")) {
        Storage.deleteProject(id);
        refreshProjects();
    }
    setActiveMenuId(null);
  };

  const startRename = (p: Project) => {
      setEditingId(p.id);
      setTempName(p.name);
      setActiveMenuId(null);
  };

  const saveRename = (id: string) => {
      Storage.renameProject(id, tempName);
      refreshProjects();
      setEditingId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-full" onClick={() => setActiveMenuId(null)}>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">{t('appTitle')}</h2>
            <p className="mb-6 opacity-90 max-w-xl">Create professional posters using AI. Start blank or describe your idea.</p>
            
            <div className="flex gap-4">
                <button 
                onClick={() => setShowNewModal(true)}
                className="bg-white text-indigo-600 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition shadow-md flex items-center gap-2"
                >
                <Plus size={20} />
                {t('newProject')}
                </button>

                <div className="relative">
                    <button className="bg-white/20 text-white px-6 py-3 rounded-full font-bold hover:bg-white/30 transition flex items-center gap-2" onClick={() => document.getElementById('zip-in')?.click()}>
                        <FolderDown size={20} />
                        {t('importProject')}
                    </button>
                    <input id="zip-in" type="file" accept=".zip" className="hidden" onChange={handleImport} />
                </div>
            </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Clock size={20} />
          {t('recentProjects')}
        </h3>
        
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
            <p className="text-gray-500 dark:text-gray-400">No projects found. Start creating!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
            {projects.map((project) => (
              <div 
                key={project.id}
                className="group bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-visible hover:shadow-xl transition-all cursor-pointer relative"
                onClick={(e) => {
                    // Don't open if clicking menu or input
                    if((e.target as HTMLElement).closest('.action-menu') || (e.target as HTMLElement).tagName === 'INPUT') return;
                    sessionStorage.setItem('current_project', JSON.stringify(project));
                    navigate('/editor');
                }}
              >
                <div className="aspect-square bg-gray-100 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden rounded-t-xl">
                    <div className="w-full h-full transform scale-50 origin-center pointer-events-none" style={{ backgroundColor: project.backgroundColor }}>
                         {project.backgroundImage && <img src={project.backgroundImage} className="w-full h-full object-cover opacity-50" />}
                         {project.elements.length > 0 && <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">Preview</div>}
                    </div>
                </div>
                
                <div className="p-4 relative">
                  {editingId === project.id ? (
                      <input 
                        type="text" 
                        value={tempName} 
                        onChange={(e) => setTempName(e.target.value)} 
                        onBlur={() => saveRename(project.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveRename(project.id)}
                        autoFocus
                        className="w-full border rounded px-1 text-sm dark:bg-slate-800 dark:text-white"
                      />
                  ) : (
                      <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-800 dark:text-white truncate w-32">{project.name}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(project.lastModified).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="relative action-menu">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === project.id ? null : project.id); }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                              >
                                  <MoreVertical size={16} className="text-gray-500" />
                              </button>
                              
                              {activeMenuId === project.id && (
                                  <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
                                      <button onClick={() => startRename(project)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-gray-200">
                                          <Edit2 size={14} /> {t('rename')}
                                      </button>
                                      <button onClick={() => handleExportZip(project)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-gray-200">
                                          <Download size={14} /> Zip
                                      </button>
                                      <button onClick={() => handleDelete(project.id)} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-500 flex items-center gap-2">
                                          <Trash2 size={14} /> {t('delete')}
                                      </button>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border dark:border-slate-800">
                  <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">{t('startNew')}</h3>
                  
                  <div className="space-y-4">
                      <button 
                         onClick={() => createProject(false)}
                         className="w-full p-4 border rounded-xl flex items-center gap-3 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800 transition group"
                      >
                          <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full group-hover:bg-white transition"><FileEdit size={24} className="text-gray-600 dark:text-gray-300" /></div>
                          <div className="text-left">
                              <div className="font-bold text-gray-800 dark:text-white">{t('startBlank')}</div>
                              <div className="text-xs text-gray-500">Empty canvas 1080x1080</div>
                          </div>
                      </button>

                      <div className="relative">
                          <div className="absolute inset-0 flex items-center" aria-hidden="true">
                              <div className="w-full border-t border-gray-300 dark:border-slate-700"></div>
                          </div>
                          <div className="relative flex justify-center">
                              <span className="bg-white dark:bg-slate-900 px-2 text-sm text-gray-500">OR AI</span>
                          </div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 border border-blue-100 dark:border-slate-700 p-4 rounded-xl">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('describeProject')}</label>
                          <textarea 
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              className="w-full p-3 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="e.g., A minimalist coffee shop grand opening poster with warm colors..."
                          />
                          <button 
                              onClick={() => createProject(true)}
                              disabled={!aiPrompt || isGenerating}
                              className="w-full mt-3 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-50"
                          >
                              {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wand2 size={16} />}
                              Generate Layout
                          </button>
                      </div>
                  </div>
                  
                  <button onClick={() => setShowNewModal(false)} className="mt-4 w-full py-2 text-gray-500 text-sm hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default HomeScreen;