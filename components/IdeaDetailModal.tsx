import React, { useState, useEffect, useRef } from 'react';
import { Idea, AspectRatio, ImageSize } from '../types';
import { X, RefreshCw, Image as ImageIcon, MapPin, ExternalLink, Loader2, Maximize2, Send, NotebookPen, Bot, FileText, Palette, Globe, ChevronRight, LayoutTemplate, Brush, Wrench, Terminal, Copy, Check, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ideasAPI, aiAPI } from '../services/api';

interface IdeaDetailModalProps {
  idea: Idea;
  onClose: () => void;
  onUpdateIdea: (updatedIdea: Idea, shouldTriggerAnalysis?: boolean) => void;
}

type Tab = 'notebook' | 'blueprints' | 'tools';
type BlueprintSection = 'executive' | 'market' | 'prd' | 'uiux' | 'oneShotPrompt';
type VisualMode = 'artistic' | 'ui-flow';

const IdeaDetailModal: React.FC<IdeaDetailModalProps> = ({ idea, onClose, onUpdateIdea }) => {
  const [activeTab, setActiveTab] = useState<Tab>('blueprints');
  const [activeBlueprint, setActiveBlueprint] = useState<BlueprintSection>('executive');
  
  const [noteInput, setNoteInput] = useState('');
  const notesEndRef = useRef<HTMLDivElement>(null);

  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [isSearchingMaps, setIsSearchingMaps] = useState(false);
  const [visualMode, setVisualMode] = useState<VisualMode>('artistic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [imgSize, setImgSize] = useState<ImageSize>(ImageSize.ONE_K);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (activeTab === 'notebook') {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, idea.notes]);

  useEffect(() => {
    if (visualMode === 'ui-flow') {
        setAspectRatio(AspectRatio.WIDE);
        setImgSize(ImageSize.TWO_K);
    } else {
        setAspectRatio(AspectRatio.SQUARE);
        setImgSize(ImageSize.ONE_K);
    }
  }, [visualMode]);

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    
    const text = noteInput;
    setNoteInput('');

    try {
      await ideasAPI.addNote(idea.id, text);
      aiAPI.analyze(idea.id).catch(console.error);
      const freshIdea = await ideasAPI.get(idea.id);
      if (isMounted.current) {
        onUpdateIdea(freshIdea.idea, false);
      }
    } catch (e) {
      console.error("Failed to add note:", e);
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImg(true);
    try {
      const result = await aiAPI.generateImage(idea.id, {
        visual_mode: visualMode,
        aspect_ratio: aspectRatio,
        image_size: imgSize,
      });

      const freshIdea = await ideasAPI.get(idea.id);
      if (isMounted.current) {
        onUpdateIdea(freshIdea.idea, false);
      }
    } catch (e) {
      alert("Failed to generate image.");
    } finally {
      if (isMounted.current) setIsGeneratingImg(false);
    }
  };

  const handleFindLocations = async () => {
    setIsSearchingMaps(true);
    try {
      const doSearch = async (location?: { lat: number; lng: number }) => {
        await aiAPI.findPlaces(idea.id, location);
        const freshIdea = await ideasAPI.get(idea.id);
        if (isMounted.current) {
          onUpdateIdea(freshIdea.idea, false);
        }
      };

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await doSearch({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (isMounted.current) setIsSearchingMaps(false);
        },
        async () => {
          await doSearch();
          if (isMounted.current) setIsSearchingMaps(false);
        }
      );
    } catch (e) {
      if (isMounted.current) setIsSearchingMaps(false);
    }
  };

  const handleCopyPrompt = () => {
    const text = idea.analysis?.one_shot_prompt || "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getBlueprintContent = () => {
    if (!idea.analysis) return "Initializing Analysis...";
    switch (activeBlueprint) {
      case 'executive': return idea.analysis.executive_summary;
      case 'market': return idea.analysis.market_research;
      case 'prd': return idea.analysis.prd;
      case 'uiux': return idea.analysis.uiux;
      case 'oneShotPrompt': return idea.analysis.one_shot_prompt || "Prompt generation in progress...";
      default: return "";
    }
  };

  const getImageUrl = (img: any) => {
    if (img.storage_key) {
      return `/api/images/${img.storage_key}`;
    }
    return img.url;
  };

  const ToolsPanel = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-6 grid grid-cols-1 gap-3 border-b border-stone-200">
         <button 
           onClick={handleFindLocations}
           disabled={isSearchingMaps}
           className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-stone-200 hover:border-green-400 transition-all text-left group"
         >
           <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
             {isSearchingMaps ? <Loader2 size={16} className="animate-spin"/> : <MapPin size={16} />}
           </div>
           <div>
              <div className="text-sm font-bold text-gray-900">Scout Locations</div>
              <div className="text-xs text-gray-500">Find relevant spots</div>
           </div>
         </button>
      </div>

      <div className="p-6">
        <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <ImageIcon size={16} />
          Visual Concepts
        </h3>

        <div className="flex bg-stone-200/50 p-1 rounded-lg mb-4">
          <button 
             onClick={() => setVisualMode('artistic')}
             className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${visualMode === 'artistic' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Brush size={12} /> Artistic
          </button>
          <button 
             onClick={() => setVisualMode('ui-flow')}
             className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${visualMode === 'ui-flow' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <LayoutTemplate size={12} /> UI Flow
          </button>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="flex gap-2 text-xs">
            <select 
              className="bg-white text-gray-900 border border-stone-200 rounded-lg p-2 w-1/2"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            >
              <option value={AspectRatio.SQUARE}>1:1</option>
              <option value={AspectRatio.PORTRAIT}>3:4</option>
              <option value={AspectRatio.LANDSCAPE}>4:3</option>
              <option value={AspectRatio.WIDE}>16:9</option>
              <option value={AspectRatio.ULTRAWIDE}>21:9</option>
            </select>
             <select 
              className="bg-white text-gray-900 border border-stone-200 rounded-lg p-2 w-1/2"
              value={imgSize}
              onChange={(e) => setImgSize(e.target.value as ImageSize)}
            >
              <option value={ImageSize.ONE_K}>1K</option>
              <option value={ImageSize.TWO_K}>2K</option>
              <option value={ImageSize.FOUR_K}>4K</option>
            </select>
          </div>
          <button 
            onClick={handleGenerateImage}
            disabled={isGeneratingImg}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium shadow-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-sm"
          >
            {isGeneratingImg ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16} />}
            Generate
          </button>
        </div>

        <div className="space-y-4">
           {idea.images.slice().reverse().map((img, i) => {
             const imgUrl = getImageUrl(img);
             return (
               <div key={img.id || i} className="relative group rounded-xl overflow-hidden shadow-sm border border-stone-100 bg-white cursor-pointer" onClick={() => setPreviewImage(imgUrl)}>
                 <img src={imgUrl} alt="Concept" className="w-full object-cover" />
                 {img.style === 'ui-flow' && (
                    <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">
                      UI Flow
                    </div>
                 )}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(imgUrl);
                      }} 
                      className="text-white bg-white/20 backdrop-blur-md p-2 rounded-full hover:bg-white/40 transition-colors"
                    >
                      <Maximize2 size={18} />
                    </button>
                 </div>
               </div>
             );
           })}
        </div>
        
        {idea.grounding_sources && idea.grounding_sources.length > 0 && (
           <div className="mt-8 pt-6 border-t border-stone-200">
             <h4 className="text-xs font-bold uppercase text-stone-400 mb-3">Grounding Sources</h4>
             <div className="space-y-2">
               {idea.grounding_sources.slice(0, 5).map((source, idx) => {
                 const uri = source.web?.uri || source.maps?.uri || source.uri;
                 const title = source.web?.title || source.maps?.title || source.title || "Unknown Source";
                 if (!uri) return null;
                 return (
                   <a key={idx} href={uri} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-xs text-stone-600 hover:text-indigo-600 transition-colors p-2 hover:bg-stone-100 rounded-lg">
                     <ExternalLink size={12} className="mt-0.5 flex-shrink-0" />
                     <span className="line-clamp-2 leading-tight">{title}</span>
                   </a>
                 );
               })}
             </div>
           </div>
        )}
      </div>
    </div>
  );

  return (
    <>
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 md:p-8">
      <div 
        className="bg-[#FDFBF7] w-full max-w-7xl h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-float"
        style={{ animationDuration: '0.4s', animationIterationCount: 1 }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors md:top-4 md:right-4"
        >
          <X size={24} />
        </button>

        <div className="w-full md:w-64 bg-[#DCC7B1] border-b md:border-b-0 md:border-r border-[#B8A38D] flex flex-col flex-shrink-0 max-h-[40vh] md:max-h-full relative shadow-[inset_-10px_0_15px_-5px_rgba(0,0,0,0.1)]">
           <div className="p-4 md:p-6 border-b border-[#B8A38D] bg-[#C5B09A]/50 backdrop-blur-sm">
             <h2 className="font-display text-xl md:text-2xl text-stone-900 leading-tight mb-1 line-clamp-1 md:line-clamp-2">{idea.title}</h2>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-700/60">Project Workspace</span>
           </div>

           <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-1 md:space-y-2 scrollbar-hide">
              <button 
                onClick={() => setActiveTab('notebook')}
                className={`w-full text-left px-3 py-2 md:px-4 md:py-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${activeTab === 'notebook' ? 'bg-[#FFFEF9] shadow-md text-stone-900 ring-1 ring-black/5 scale-[1.02]' : 'text-stone-700 hover:bg-white/20'}`}
              >
                <NotebookPen size={18} />
                <span className="font-bold tracking-tight">My Notebook</span>
              </button>

              <div className="pt-4 md:pt-6 pb-2 px-4 text-[10px] font-bold text-stone-700/40 uppercase tracking-[0.2em]">
                AI Blueprints
              </div>

              {([
                { id: 'executive', label: 'Briefing', icon: Bot },
                { id: 'market', label: 'Market Recon', icon: Globe },
                { id: 'prd', label: 'Product Specs', icon: FileText },
                { id: 'uiux', label: 'Design Studio', icon: Palette },
                { id: 'oneShotPrompt', label: 'One-Shot Prompt', icon: Terminal },
              ] as const).map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab('blueprints'); setActiveBlueprint(item.id); }}
                  className={`
                    w-full text-left px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 text-sm
                    ${(activeTab === 'blueprints' && activeBlueprint === item.id) 
                      ? 'bg-[#FFFEF9] text-stone-900 font-bold shadow-md scale-[1.02]' 
                      : 'text-stone-700 hover:bg-white/20'}
                  `}
                >
                  <item.icon size={16} />
                  <span className="tracking-tight">{item.label}</span>
                  {(activeTab === 'blueprints' && activeBlueprint === item.id) && <ChevronRight size={14} className="ml-auto opacity-40"/>}
                </button>
              ))}

              <button 
                onClick={() => setActiveTab('tools')}
                className={`xl:hidden w-full text-left px-3 py-2 md:px-4 md:py-3 rounded-xl flex items-center gap-3 transition-all duration-200 mt-2 ${activeTab === 'tools' ? 'bg-[#FFFEF9] shadow-md text-stone-900 ring-1 ring-black/5 scale-[1.02]' : 'text-stone-700 hover:bg-white/20'}`}
              >
                <Wrench size={18} />
                <span className="font-bold tracking-tight">Studio Tools</span>
              </button>
           </div>
           
           <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-3 bg-stone-800/20 rounded-full blur-[2px] -z-10 opacity-50" />
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden">
          
          {activeTab === 'notebook' && (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 bg-stone-50/50">
                {(idea.notes || []).map((note) => (
                  <div key={note.id} className="flex gap-3 md:gap-4 group">
                    <div className="flex flex-col items-center">
                       <div className="w-2 h-2 rounded-full bg-stone-300 mt-2 group-hover:bg-stone-400 transition-colors" />
                       <div className="w-px h-full bg-stone-200 my-1 group-last:hidden" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="text-xs font-medium text-stone-400 mb-1 font-mono">
                        {new Date(note.created_at || note.timestamp || 0).toLocaleString()}
                      </div>
                      <div className="bg-white p-4 md:p-5 rounded-2xl rounded-tl-none shadow-sm border border-stone-100 text-gray-800 font-hand text-lg md:text-xl leading-relaxed whitespace-pre-wrap">
                        {note.text}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={notesEndRef} />
              </div>
              
              <div className="p-4 md:p-6 bg-white border-t border-stone-100">
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all flex gap-2">
                  <textarea 
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); }}}
                    placeholder="Add to your notes... (AI will analyze this)"
                    className="flex-1 bg-transparent border-none focus:ring-0 p-2 md:p-3 text-gray-900 placeholder-gray-400 resize-none h-16 md:h-20"
                  />
                  <button 
                    onClick={handleAddNote}
                    disabled={!noteInput.trim() || idea.status === 'processing'}
                    className="self-end p-2 md:p-3 bg-black text-white rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-colors"
                  >
                    {idea.status === 'processing' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'blueprints' && (
            <div className="flex-1 flex flex-col h-full relative bg-[#FFFEF9]"
                 style={{
                   backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #E8DCC8 31px, #E8DCC8 32px)',
                   backgroundPosition: '0 120px',
                 }}>
               <div className="absolute left-12 top-0 bottom-0 w-px bg-rose-200/30 pointer-events-none" />
               
               <div className="px-6 py-8 md:px-12 md:py-10 border-b border-stone-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between shadow-sm">
                 <div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-stone-900 tracking-tight">
                        {activeBlueprint === 'executive' && "Executive Briefing"}
                        {activeBlueprint === 'market' && "Market Reconnaissance"}
                        {activeBlueprint === 'prd' && "Product Requirements"}
                        {activeBlueprint === 'uiux' && "Design Studio"}
                        {activeBlueprint === 'oneShotPrompt' && "One-Shot Build Prompt"}
                    </h2>
                    <p className="text-stone-500 text-[10px] md:text-xs mt-1 font-sans uppercase tracking-widest opacity-70">
                    Compiled by Muse Agents • Ref: {new Date(idea.updated_at || idea.created_at).toLocaleTimeString()}
                    </p>
                 </div>
                 
                 {activeBlueprint === 'oneShotPrompt' && (
                     <button 
                       onClick={handleCopyPrompt}
                       className={`
                         flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg
                         ${copied ? 'bg-emerald-500 text-white scale-105' : 'bg-[#2C2C2C] text-white hover:bg-black hover:scale-105'}
                       `}
                     >
                       {copied ? <Check size={18} /> : <Terminal size={18} />}
                       {copied ? 'Copied!' : 'Copy Script'}
                     </button>
                 )}
               </div>

               <div className="flex-1 overflow-y-auto p-6 md:p-12 relative z-0 scrollbar-hide">
                 {idea.status === 'processing' && !getBlueprintContent() ? (
                   <div className="h-full flex flex-col items-center justify-center opacity-40">
                      <Loader2 size={40} className="animate-spin text-stone-400 mb-4" />
                      <p className="font-hand text-xl">Muse is scribbling...</p>
                   </div>
                 ) : (
                    activeBlueprint === 'oneShotPrompt' ? (
                       <div className="relative rounded-sm overflow-hidden shadow-xl bg-[#1e1e1e] ring-1 ring-white/5 group border-t-8 border-stone-800">
                         <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-orange-500/5 opacity-50 pointer-events-none" />
                         <div className="bg-[#262626] px-4 py-2 flex items-center gap-2 border-b border-white/5 relative z-10">
                            <div className="flex gap-1.5 opacity-50">
                                <div className="w-2.5 h-2.5 rounded-full bg-stone-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-stone-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-stone-500" />
                            </div>
                            <span className="text-stone-400 text-[10px] font-mono ml-2 flex items-center gap-2 uppercase tracking-widest">
                              <Terminal size={10} />
                              blueprint_manifest.md
                            </span>
                         </div>
                         <div className="p-6 md:p-8 overflow-x-auto relative z-10 bg-[#1A1A1A]/80">
                            <pre className="text-amber-50/90 font-mono text-sm leading-relaxed whitespace-pre-wrap selection:bg-amber-500/30">
                                {getBlueprintContent()}
                            </pre>
                         </div>
                       </div>
                    ) : (
                       <div className="prose prose-stone max-w-none 
                                     prose-headings:font-display prose-headings:font-bold prose-headings:text-stone-900 
                                     prose-p:text-stone-800 prose-p:font-hand prose-p:text-xl prose-p:leading-relaxed
                                     prose-li:text-stone-800 prose-li:font-hand prose-li:text-xl
                                     prose-strong:text-stone-900 prose-strong:font-bold
                                     prose-em:font-hand prose-em:italic
                                     prose-blockquote:border-l-4 prose-blockquote:border-amber-200 prose-blockquote:bg-amber-50/30 prose-blockquote:p-4 prose-blockquote:rounded-r-lg">
                           <ReactMarkdown>{getBlueprintContent()}</ReactMarkdown>
                       </div>
                    )
                 )}
               </div>
               
               <div className="absolute top-0 right-20 w-8 h-12 bg-amber-400/20 rounded-b-sm pointer-events-none z-20 shadow-sm" />
            </div>
          )}

          {activeTab === 'tools' && (
             <div className="xl:hidden flex-1 overflow-y-auto bg-stone-50">
               <ToolsPanel />
             </div>
          )}
        </div>

        <div className="hidden xl:flex w-80 bg-stone-50 border-l border-stone-200 flex-col h-full overflow-y-auto">
          <ToolsPanel />
        </div>
      </div>
    </div>

    {previewImage && (
      <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
      >
          <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
              <X size={32} />
          </button>

          <div 
              className="relative max-w-full max-h-full flex flex-col items-center" 
              onClick={(e) => e.stopPropagation()} 
          >
              <img 
                  src={previewImage} 
                  alt="Full Preview" 
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              
              <div className="mt-6 flex gap-4">
                  <a 
                      href={previewImage} 
                      download={`sparkgarden-concept-${Date.now()}.png`}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors shadow-lg hover:scale-105 transform duration-200"
                  >
                      <Download size={20} />
                      Download Image
                  </a>
              </div>
          </div>
      </div>
    )}
    </>
  );
};

export default IdeaDetailModal;
