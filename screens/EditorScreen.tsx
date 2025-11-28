import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { Project, CanvasElement, ElementType, Language } from '../types';
import * as Storage from '../services/storageService';
import { 
  Save, Image as ImageIcon, Type, Square, Layers, Wand2, Download, 
  Undo, Redo, ZoomIn, ZoomOut, Move, Trash, ArrowUp, ArrowDown, 
  Lock, Unlock, Copy, X, Bold, Italic, Sparkles, PlusCircle,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Maximize, RotateCcw
} from 'lucide-react';
import { FONTS, SHAPES } from '../constants';
import * as GeminiService from '../services/geminiService';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';

const EditorScreen: React.FC = () => {
  const { t, language } = useApp();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.8);
  const [history, setHistory] = useState<Project[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // UI States
  const [activePanel, setActivePanel] = useState<'shape' | 'bg' | 'layers' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false); 
  
  // Toolbar States
  const [activeTab, setActiveTab] = useState<'transform' | 'content' | 'style'>('transform');
  const [moveSpeed, setMoveSpeed] = useState(5);

  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Initialization & History ---

  useEffect(() => {
    const saved = sessionStorage.getItem('current_project');
    if (saved) {
      const p = JSON.parse(saved);
      if (!p.generatedAssets) p.generatedAssets = [];
      setProject(p);
      setHistory([p]);
      setHistoryIndex(0);
      
      if (containerRef.current) {
         setScale(Math.min(0.8, (containerRef.current.clientWidth - 100) / p.width));
      }
    }
  }, []);

  useEffect(() => {
    if (project) {
      const timer = setTimeout(() => {
        Storage.saveProject(project);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [project]);

  const updateProject = (newProject: Project, addToHistory = true) => {
    setProject(newProject);
    if (addToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newProject);
      const trimmedHistory = newHistory.slice(-20); 
      setHistory(trimmedHistory);
      setHistoryIndex(trimmedHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setProject(history[historyIndex - 1]);
      setSelectedId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setProject(history[historyIndex - 1]);
      setSelectedId(null);
    }
  };

  // --- Element Actions ---

  const addElement = (element: CanvasElement) => {
    if (!project) return;
    // Bounds check
    let x = element.x;
    let y = element.y;
    if(x + element.width > project.width) x = project.width - element.width - 20;
    if(y + element.height > project.height) y = project.height - element.height - 20;
    if(x < 0) x = 20;
    if(y < 0) y = 20;

    const updatedElements = [...project.elements, { ...element, x, y }];
    updateProject({ ...project, elements: updatedElements });
    setSelectedId(element.id);
    setActivePanel(null);
  };

  const addText = () => {
    addElement({
      id: crypto.randomUUID(),
      type: ElementType.TEXT,
      x: project!.width / 2 - 150,
      y: project!.height / 2 - 40,
      width: 300, height: 80, rotation: 0, opacity: 1, zIndex: project!.elements.length + 1, isLocked: false,
      content: t('addText'), fontSize: 50, fontFamily: 'Inter, sans-serif', color: '#000000', textAlign: 'center', isBold: false, isItalic: false
    });
  };

  const addShape = (shapeType: any) => {
     addElement({
      id: crypto.randomUUID(),
      type: ElementType.SHAPE,
      x: project!.width / 2 - 100,
      y: project!.height / 2 - 100,
      width: 200, height: 200, rotation: 0, opacity: 1, zIndex: project!.elements.length + 1, isLocked: false,
      shapeType: shapeType, fillColor: '#3b82f6', borderColor: '#000000', borderWidth: 0
     });
  };

  const addImagePlaceholder = () => {
      // Add a generic placeholder
      addElement({
          id: crypto.randomUUID(),
          type: ElementType.IMAGE,
          x: project!.width / 2 - 250,
          y: project!.height / 2 - 250,
          width: 500, height: 500, rotation: 0, opacity: 1, zIndex: project!.elements.length + 1, isLocked: false,
          src: '', // Empty src triggers placeholder render
      });
      setActiveTab('content');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && project && selectedId) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        updateSelected({ src });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // AI Logic
  const handleGenerateAsset = async () => {
      if(!aiPrompt || !project) return;
      setIsGenerating(true);
      try {
          const img = await GeminiService.generateBackgroundImage(aiPrompt);
          const newAssets = [img, ...(project.generatedAssets || [])];
          
          // If we have a selected image, replace it
          if (selectedId) {
             const el = project.elements.find(e => e.id === selectedId);
             if (el && el.type === ElementType.IMAGE) {
                 updateSelected({ src: img });
             }
          }
          
          updateProject({...project, generatedAssets: newAssets}, !selectedId); // Don't add to history if just replacing to avoid double steps
          setAiPrompt('');
          setShowAiModal(false);
      } catch(e) {
          alert(t('error'));
      } finally {
          setIsGenerating(false);
      }
  };

  const handleAiBg = async () => {
    if (!aiPrompt || !project) return;
    setIsGenerating(true);
    try {
      const bg = await GeminiService.generateBackgroundImage(aiPrompt);
      updateProject({ ...project, backgroundImage: bg });
      setActivePanel(null);
      setAiPrompt('');
    } catch (e) {
      alert(t('error'));
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Transform & Manipulation ---

  const moveSelected = (dx: number, dy: number) => {
      if (!selectedId || !project) return;
      const el = project.elements.find(e => e.id === selectedId);
      if (!el || el.isLocked) return;
      updateProject({
          ...project,
          elements: project.elements.map(e => e.id === selectedId ? { ...e, x: e.x + dx, y: e.y + dy } : e)
      }, false);
  };

  const updateSelected = (updates: Partial<CanvasElement>) => {
      if(!project || !selectedId) return;
      updateProject({
          ...project,
          elements: project.elements.map(e => e.id === selectedId ? { ...e, ...updates } : e)
      }, false); // Slider updates often shouldn't spam history, could throttle this
  };

  const deleteSelected = () => {
      if(!project || !selectedId) return;
      const newEls = project.elements.filter(e => e.id !== selectedId);
      updateProject({ ...project, elements: newEls });
      setSelectedId(null);
  };

  const duplicateSelected = () => {
      if(!project || !selectedId) return;
      const el = project.elements.find(e => e.id === selectedId);
      if(el) {
          const newEl = { ...el, id: crypto.randomUUID(), x: el.x + 20, y: el.y + 20, zIndex: project.elements.length + 1 };
          updateProject({ ...project, elements: [...project.elements, newEl] });
          setSelectedId(newEl.id);
      }
  };

  const moveLayer = (dir: 'up' | 'down' | 'front' | 'back') => {
      if(!project || !selectedId) return;
      const els = [...project.elements];
      const idx = els.findIndex(e => e.id === selectedId);
      if(idx === -1) return;
      const el = els[idx];
      els.splice(idx, 1);

      if(dir === 'front') els.push(el);
      else if(dir === 'back') els.unshift(el);
      else if(dir === 'up') els.splice(Math.min(els.length, idx + 1), 0, el);
      else els.splice(Math.max(0, idx - 1), 0, el);

      const zIndiced = els.map((e, i) => ({ ...e, zIndex: i + 1 }));
      updateProject({ ...project, elements: zIndiced });
  };

  const handleExport = async (type: 'png' | 'jpg' | 'zip') => {
      if(!project || !canvasRef.current) return;
      
      if (type === 'zip') {
          try {
              const blob = await Storage.exportProjectZip(project);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `project_export.zip`;
              a.click();
              URL.revokeObjectURL(url);
          } catch(e) { alert("Export Error"); }
          return;
      }

      setSelectedId(null);
      setIsExporting(true);
      setTimeout(async () => {
          try {
              const canvas = await html2canvas(canvasRef.current!, {
                  scale: 3, 
                  backgroundColor: type === 'png' ? null : project.backgroundColor,
                  useCORS: true
              });
              const link = document.createElement('a');
              link.download = `muawiya_poster_${Date.now()}.${type}`;
              link.href = canvas.toDataURL(`image/${type === 'png' ? 'png' : 'jpeg'}`);
              link.click();
          } catch(e) {
              alert(t('error'));
          } finally {
              setIsExporting(false);
          }
      }, 100);
  };

  if (!project) return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
          <p>{t('noProject')}</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {t('home')}
          </button>
      </div>
  );

  const selectedEl = project.elements.find(e => e.id === selectedId);

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      
      {/* --- Top Toolbar --- */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-30">
          <div className="flex items-center gap-2">
              <button onClick={() => navigate('/')} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded mr-2">
                   <X size={18} />
              </button>
              <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"><Undo size={18} /></button>
              <button onClick={handleRedo} disabled={historyIndex >= history.length -1} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"><Redo size={18} /></button>
              <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-2" />
              <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-2 text-gray-600 dark:text-gray-300"><ZoomOut size={18} /></button>
              <span className="text-xs w-12 text-center text-gray-600 dark:text-gray-300">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 text-gray-600 dark:text-gray-300"><ZoomIn size={18} /></button>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="relative group">
                 <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm">
                     <Download size={16} /> {t('export')}
                 </button>
                 <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700 hidden group-hover:block p-1">
                     <button onClick={() => handleExport('png')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-200">PNG (Transparent)</button>
                     <button onClick={() => handleExport('jpg')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-200">JPG (Solid)</button>
                     <button onClick={() => handleExport('zip')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-200">Export ZIP</button>
                 </div>
             </div>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
          
          {/* --- Left Sidebar Tools --- */}
          <div className="w-16 lg:w-20 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col items-center py-4 gap-4 shrink-0 z-20">
              <ToolButton icon={Type} label={t('addText')} onClick={addText} />
              <ToolButton icon={ImageIcon} label={t('addImage')} onClick={addImagePlaceholder} />
              <ToolButton icon={Square} label={t('addShape')} active={activePanel === 'shape'} onClick={() => setActivePanel(activePanel === 'shape' ? null : 'shape')} />
              <ToolButton icon={Wand2} label="BG Gen" active={activePanel === 'bg'} onClick={() => setActivePanel(activePanel === 'bg' ? null : 'bg')} />
              <ToolButton icon={Layers} label={t('layers')} active={activePanel === 'layers'} onClick={() => setActivePanel(activePanel === 'layers' ? null : 'layers')} />
          </div>

          {/* --- Sub Panels --- */}
          {activePanel && (
              <div className="absolute left-16 lg:left-20 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 z-20 p-4 shadow-xl overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800 dark:text-white uppercase text-sm tracking-wider">
                          {activePanel === 'shape' ? t('addShape') : activePanel === 'layers' ? t('layers') : 'AI Background'}
                      </h3>
                      <button onClick={() => setActivePanel(null)}><X size={16} className="text-gray-400" /></button>
                  </div>

                  {activePanel === 'shape' && (
                      <div className="grid grid-cols-2 gap-2">
                          {SHAPES.map(s => (
                              <button key={s.type} onClick={() => addShape(s.type)} className="p-4 border dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800 flex flex-col items-center gap-2">
                                  <div className={`w-8 h-8 border-2 border-gray-600 dark:border-gray-400 ${s.type === 'circle' ? 'rounded-full' : s.type === 'triangle' ? 'border-b-transparent border-x-transparent border-t-0 bg-gray-600' : ''}`} 
                                       style={s.type === 'triangle' ? { width: 0, height: 0, borderLeftWidth: 16, borderRightWidth: 16, borderBottomWidth: 32, backgroundColor: 'transparent' } : {}}
                                  />
                                  <span className="text-xs text-gray-600 dark:text-gray-400">{s.label}</span>
                              </button>
                          ))}
                      </div>
                  )}

                  {activePanel === 'bg' && (
                      <div className="space-y-6">
                           <div>
                               <label className="block text-xs font-medium text-gray-500 mb-1">{t('promptPlaceholder')}</label>
                               <textarea 
                                  value={aiPrompt}
                                  onChange={(e) => setAiPrompt(e.target.value)}
                                  className="w-full p-2 border rounded-md text-sm bg-transparent dark:border-slate-700 dark:text-white h-24 resize-none"
                                  placeholder="A futuristic city..."
                               />
                           </div>
                           <button 
                              onClick={handleAiBg}
                              disabled={isGenerating || !aiPrompt}
                              className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                               {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wand2 size={16} />}
                               {t('create')}
                           </button>
                           
                           <div className="pt-4 border-t dark:border-slate-800">
                               <p className="text-xs text-gray-500 mb-2">Color</p>
                               <input type="color" className="w-full h-10 cursor-pointer" value={project.backgroundColor} onChange={(e) => updateProject({...project, backgroundColor: e.target.value})} />
                           </div>
                      </div>
                  )}

                  {activePanel === 'layers' && (
                      <div className="space-y-1">
                          {[...project.elements].sort((a,b) => b.zIndex - a.zIndex).map((el, i) => (
                              <div key={el.id} 
                                   onClick={() => setSelectedId(el.id)}
                                   className={`p-2 rounded flex items-center justify-between group cursor-pointer ${selectedId === el.id ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                              >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                      {el.type === 'text' ? <Type size={14} /> : el.type === 'image' ? <ImageIcon size={14} /> : <Square size={14} />}
                                      <span className="text-xs truncate max-w-[100px] text-gray-700 dark:text-gray-300">
                                          {el.type === 'text' ? el.content : el.type}
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                      <button onClick={(e) => { e.stopPropagation(); updateProject({...project, elements: project.elements.map(x => x.id === el.id ? {...x, isLocked: !x.isLocked} : x)}); }} className="p-1 hover:text-blue-600">
                                          {el.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}

          {/* --- Canvas Area --- */}
          <div 
             ref={containerRef}
             className="flex-1 bg-gray-100 dark:bg-slate-950 overflow-auto flex items-center justify-center p-12 lg:p-20 relative"
             onMouseDown={() => { setSelectedId(null); setActivePanel(null); }}
          >
              <div 
                  ref={canvasRef}
                  className="bg-white shadow-2xl relative checkerboard origin-center"
                  style={{
                      width: project.width,
                      height: project.height,
                      transform: `scale(${scale})`,
                      backgroundColor: project.backgroundColor,
                  }}
              >
                  {project.backgroundImage && (
                      <img src={project.backgroundImage} className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" alt="" />
                  )}
                  
                  {project.elements.sort((a,b) => a.zIndex - b.zIndex).map(el => (
                      <div
                          key={el.id}
                          onMouseDown={(e) => { e.stopPropagation(); if(!el.isLocked) setSelectedId(el.id); }}
                          className={`absolute group select-none ${selectedId === el.id ? 'ring-2 ring-blue-500 z-[100]' : ''}`}
                          style={{
                              left: el.x,
                              top: el.y,
                              width: el.width,
                              height: el.height,
                              transform: `rotate(${el.rotation}deg)`,
                              opacity: el.opacity,
                              zIndex: el.zIndex,
                              // Dragging disabled on canvas
                              cursor: selectedId === el.id ? 'default' : 'pointer'
                          }}
                      >
                          {/* Element Content */}
                          <div className="w-full h-full overflow-hidden" style={{ pointerEvents: 'none' }}>
                               {el.type === ElementType.TEXT && (
                                   <div style={{
                                       fontFamily: el.fontFamily,
                                       fontSize: `${el.fontSize}px`,
                                       color: el.color,
                                       backgroundColor: el.backgroundColor,
                                       textAlign: el.textAlign,
                                       fontWeight: el.isBold ? 'bold' : 'normal',
                                       fontStyle: el.isItalic ? 'italic' : 'normal',
                                       width: '100%', height: '100%',
                                       display: 'flex', alignItems: 'center', justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
                                       whiteSpace: 'pre-wrap', lineHeight: 1.2
                                   }}>
                                       {el.content}
                                   </div>
                               )}
                               {el.type === ElementType.IMAGE && (
                                   el.src ? (
                                     <img src={el.src} className="w-full h-full object-cover" alt="" style={{ filter: el.filter }} />
                                   ) : (
                                     <div className="w-full h-full bg-gray-200 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center text-gray-500">
                                         <ImageIcon size={48} className="mb-2 opacity-50" />
                                         <span className="text-sm font-medium">{t('placeholderImage')}</span>
                                     </div>
                                   )
                               )}
                               {el.type === ElementType.SHAPE && (
                                   <div style={{
                                       width: '100%', height: '100%',
                                       backgroundColor: el.fillColor,
                                       borderColor: el.borderColor,
                                       borderWidth: `${el.borderWidth}px`,
                                       borderStyle: 'solid',
                                       borderRadius: el.shapeType === 'circle' ? '50%' : 0,
                                       clipPath: el.shapeType === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : el.shapeType === 'star' ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 'none'
                                   }} />
                               )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* --- Bottom Toolbar (Comprehensive Controls) --- */}
      {selectedEl && (
          <div className="h-auto bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 p-2 lg:p-4 z-40 shrink-0 shadow-[-10px_0_20px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between mb-2 max-w-6xl mx-auto border-b dark:border-slate-700 pb-2">
                  <div className="flex gap-4">
                      {['transform', 'content', 'style'].map(tab => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`text-xs font-bold uppercase pb-1 border-b-2 transition ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
                          >
                              {t(tab)}
                          </button>
                      ))}
                  </div>
                  <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"><X size={16} /></button>
              </div>

              <div className="flex flex-wrap items-center gap-4 lg:gap-8 justify-center max-w-7xl mx-auto h-20">
                  
                  {activeTab === 'transform' && (
                      <div className="flex items-center gap-6">
                           {/* Move Controls */}
                           <div className="flex items-center gap-2 border-r pr-6 dark:border-slate-700">
                               <div className="grid grid-cols-3 gap-1 w-24">
                                   <div />
                                   <button onClick={() => moveSelected(0, -moveSpeed)} className="p-1 bg-gray-100 dark:bg-slate-800 rounded hover:bg-blue-100"><ChevronUp size={14}/></button>
                                   <div />
                                   <button onClick={() => moveSelected(-moveSpeed, 0)} className="p-1 bg-gray-100 dark:bg-slate-800 rounded hover:bg-blue-100"><ChevronLeft size={14}/></button>
                                   <div className="flex items-center justify-center"><Move size={12} className="opacity-50"/></div>
                                   <button onClick={() => moveSelected(moveSpeed, 0)} className="p-1 bg-gray-100 dark:bg-slate-800 rounded hover:bg-blue-100"><ChevronRight size={14}/></button>
                                   <div />
                                   <button onClick={() => moveSelected(0, moveSpeed)} className="p-1 bg-gray-100 dark:bg-slate-800 rounded hover:bg-blue-100"><ChevronDown size={14}/></button>
                                   <div />
                               </div>
                               <div className="flex flex-col gap-1 w-24">
                                   <span className="text-[10px] text-gray-500">{t('moveSpeed')}</span>
                                   <input type="range" min="1" max="50" value={moveSpeed} onChange={(e) => setMoveSpeed(Number(e.target.value))} className="h-1 accent-blue-600" />
                               </div>
                           </div>

                           {/* Size & Rotation */}
                           <div className="flex gap-4">
                               <div className="flex flex-col gap-1 w-24">
                                   <div className="flex justify-between"><span className="text-[10px] text-gray-500">{t('size')}</span> <Maximize size={10}/></div>
                                   <input type="range" min="20" max="1000" value={selectedEl.width} onChange={(e) => updateSelected({ width: Number(e.target.value), height: (selectedEl.height / selectedEl.width) * Number(e.target.value) })} className="h-1 accent-blue-600" />
                               </div>
                               <div className="flex flex-col gap-1 w-24">
                                   <div className="flex justify-between"><span className="text-[10px] text-gray-500">{t('rotate')}</span> <RotateCcw size={10}/></div>
                                   <input type="range" min="0" max="360" value={selectedEl.rotation} onChange={(e) => updateSelected({ rotation: Number(e.target.value) })} className="h-1 accent-blue-600" />
                               </div>
                           </div>
                      </div>
                  )}

                  {activeTab === 'content' && (
                      <div className="flex items-center gap-4">
                          {selectedEl.type === ElementType.TEXT && (
                             <textarea 
                                value={selectedEl.content} 
                                onChange={(e) => updateSelected({ content: e.target.value })} 
                                className="border rounded p-2 text-sm h-16 w-64 resize-none dark:bg-slate-800 dark:border-slate-700"
                             />
                          )}
                          
                          {selectedEl.type === ElementType.IMAGE && (
                              <div className="flex gap-4">
                                  <button onClick={() => document.getElementById('img-replace')?.click()} className="flex flex-col items-center gap-1 p-2 border rounded hover:bg-gray-50 dark:border-slate-700">
                                      <ImageIcon size={20} />
                                      <span className="text-xs">{t('gallery')}</span>
                                  </button>
                                  <input id="img-replace" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                                  <button onClick={() => setShowAiModal(true)} className="flex flex-col items-center gap-1 p-2 border rounded border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100">
                                      <Sparkles size={20} />
                                      <span className="text-xs">{t('aiGenerate')}</span>
                                  </button>
                              </div>
                          )}
                      </div>
                  )}

                  {activeTab === 'style' && (
                      <div className="flex items-center gap-6">
                           {/* Common Opacity */}
                           <div className="flex flex-col gap-1 w-24">
                               <span className="text-[10px] text-gray-500">{t('opacity')}</span>
                               <input type="range" min="0" max="1" step="0.1" value={selectedEl.opacity} onChange={(e) => updateSelected({ opacity: Number(e.target.value) })} className="h-1 accent-blue-600" />
                           </div>

                           <div className="w-px h-8 bg-gray-200 dark:bg-slate-700" />

                           {/* Specifics */}
                           {selectedEl.type === ElementType.TEXT && (
                              <div className="flex items-center gap-2">
                                  <select value={selectedEl.fontFamily} onChange={(e) => updateSelected({ fontFamily: e.target.value })} className="border rounded p-1 text-sm w-32 dark:bg-slate-800 dark:border-slate-700">
                                     {FONTS.map(f => <option key={f.name} value={f.value}>{f.label}</option>)}
                                  </select>
                                  <input type="color" value={selectedEl.color} onChange={(e) => updateSelected({ color: e.target.value })} className="w-8 h-8 cursor-pointer rounded overflow-hidden" />
                                  <button onClick={() => updateSelected({ isBold: !selectedEl.isBold })} className={`p-1 rounded ${selectedEl.isBold ? 'bg-gray-200' : ''}`}><Bold size={16}/></button>
                                  <button onClick={() => updateSelected({ isItalic: !selectedEl.isItalic })} className={`p-1 rounded ${selectedEl.isItalic ? 'bg-gray-200' : ''}`}><Italic size={16}/></button>
                              </div>
                           )}

                           {selectedEl.type === ElementType.SHAPE && (
                              <div className="flex items-center gap-2">
                                  <span className="text-xs">Fill:</span>
                                  <input type="color" value={selectedEl.fillColor} onChange={(e) => updateSelected({ fillColor: e.target.value })} className="w-8 h-8 cursor-pointer" />
                                  <span className="text-xs ml-2">Border:</span>
                                  <input type="range" min="0" max="20" value={selectedEl.borderWidth} onChange={(e) => updateSelected({ borderWidth: parseInt(e.target.value) })} className="w-16" />
                              </div>
                           )}

                           {selectedEl.type === ElementType.IMAGE && (
                              <div className="flex items-center gap-2">
                                  <select value={selectedEl.filter || 'none'} onChange={(e) => updateSelected({ filter: e.target.value })} className="p-1 border rounded text-sm dark:bg-slate-800 dark:border-slate-700">
                                      <option value="none">Normal</option>
                                      <option value="grayscale(100%)">B&W</option>
                                      <option value="sepia(100%)">Sepia</option>
                                  </select>
                              </div>
                           )}
                           
                           {/* Layering & Actions */}
                           <div className="w-px h-8 bg-gray-200 dark:bg-slate-700" />
                           <div className="flex gap-1">
                               <button onClick={() => moveLayer('front')} className="p-1.5 hover:bg-gray-100 rounded" title="Front"><ArrowUp size={16}/></button>
                               <button onClick={() => moveLayer('back')} className="p-1.5 hover:bg-gray-100 rounded" title="Back"><ArrowDown size={16}/></button>
                               <button onClick={duplicateSelected} className="p-1.5 hover:bg-gray-100 rounded" title="Clone"><Copy size={16}/></button>
                               <button onClick={deleteSelected} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="Delete"><Trash size={16}/></button>
                           </div>
                      </div>
                  )}

              </div>
          </div>
      )}

      {/* AI Asset Generation Modal */}
      {showAiModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold">{t('aiGenerate')}</h3>
                      <button onClick={() => setShowAiModal(false)}><X size={20} /></button>
                  </div>
                  
                  <div className="flex gap-2 mb-4">
                      <input 
                         type="text" 
                         value={aiPrompt}
                         onChange={(e) => setAiPrompt(e.target.value)}
                         placeholder={t('describeProject')}
                         className="flex-1 p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
                      />
                      <button 
                         onClick={handleGenerateAsset}
                         disabled={!aiPrompt || isGenerating}
                         className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                         {isGenerating ? "..." : "Go"}
                      </button>
                  </div>

                  <div className="border-t pt-4 dark:border-slate-800">
                      <h4 className="text-xs font-bold text-gray-500 mb-2">{t('generatedHistory')}</h4>
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {(project?.generatedAssets || []).map((src, i) => (
                              <button key={i} onClick={() => { updateSelected({ src }); setShowAiModal(false); }} className="aspect-square bg-gray-100 rounded overflow-hidden hover:ring-2 ring-blue-500 relative group">
                                  <img src={src} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center">
                                      <PlusCircle className="text-white opacity-0 group-hover:opacity-100" />
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

const ToolButton: React.FC<{ icon: any, label: string, onClick: () => void, active?: boolean }> = ({ icon: Icon, label, onClick, active }) => (
    <button 
        onClick={onClick} 
        className={`flex flex-col items-center justify-center gap-1 w-full p-2 hover:text-blue-600 transition-colors ${active ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-600' : 'text-gray-500 dark:text-gray-400'}`}
    >
        <Icon size={24} />
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

export default EditorScreen;