import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, LogOut, Home } from 'lucide-react';
import IdeaCard from './components/IdeaCard';
import ChatWidget from './components/ChatWidget';
import IdeaDetailModal from './components/IdeaDetailModal';
import LandingPage from './components/LandingPage';
import { analyzeIdeaRecursive } from './services/geminiService';
import { getAllIdeas, saveIdea, migrateFromLocalStorage } from './services/db';
import { Idea } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import DebugOverlay from './components/DebugOverlay';

// Palette for random card colors
const CARD_COLORS = [
  '#FFD6E0', // Soft pink
  '#C1F0DC', // Mint
  '#D4E0FF', // Periwinkle
  '#FFF5C2', // Light yellow
  '#E0D4FF', // Lavender
  '#FFE4C2', // Peach
];

type ViewState = 'landing' | 'dashboard';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [showNewIdeaInput, setShowNewIdeaInput] = useState(false);
  
  // New Idea Input State
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  // Initial Load & Migration
  useEffect(() => {
    console.log("App mounted. Initializing DB...");
    const loadData = async () => {
      try {
        await migrateFromLocalStorage();
        const loadedIdeas = await getAllIdeas();
        console.log(`Loaded ${loadedIdeas.length} ideas from DB.`);
        
        // Extra Sanitization Layer for Runtime Safety
        const safeIdeas = loadedIdeas.map(idea => ({
           ...idea,
           images: idea.images || [],
           tags: idea.tags || ['Idea'],
           groundingSources: idea.groundingSources || [],
           userNotes: idea.userNotes || [],
           analysis: idea.analysis || { executiveSummary: '', marketResearch: '', prd: '', uiux: '', oneShotPrompt: '' },
           // Ensure chatHistory is initialized
           chatHistory: idea.chatHistory || []
        }));

        // Sort by most recently updated
        safeIdeas.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setIdeas(safeIdeas);
      } catch (e) {
        console.error("Failed to load ideas from DB", e);
      }
    };
    loadData();
  }, []);

  // Helper to persist data to DB and update state
  const persistIdeaUpdate = (updatedIdea: Idea) => {
    // 1. Update State
    setIdeas(prev => prev.map(i => i.id === updatedIdea.id ? updatedIdea : i));
    
    // 2. Update DB (Fire and forget, but robust)
    saveIdea(updatedIdea).catch(err => console.error("Failed to save idea to DB", err));
    
    // 3. Update Selected View if needed
    setSelectedIdea(prev => (prev && prev.id === updatedIdea.id) ? updatedIdea : prev);
  };

  const handleCreateIdea = async () => {
    if (!newTitle.trim()) return;
    console.log("Creating new idea:", newTitle);

    const newIdea: Idea = {
      id: Date.now().toString(),
      title: newTitle,
      initialPrompt: newPrompt, // Keep for legacy
      userNotes: [{
        id: Date.now().toString(),
        text: newPrompt,
        timestamp: Date.now()
      }],
      analysis: {
        executiveSummary: '',
        marketResearch: '',
        prd: '',
        uiux: '',
        oneShotPrompt: ''
      },
      status: 'new',
      tags: ['Idea'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
      images: [],
      groundingSources: [],
      chatHistory: [] // Initialize chat history
    };

    // Update state
    setIdeas(prev => [newIdea, ...prev]);
    // Persist new idea
    saveIdea(newIdea);
    
    setNewTitle('');
    setNewPrompt('');
    setShowNewIdeaInput(false);

    // Trigger AI Research in background
    triggerAnalysis(newIdea);
  };

  const triggerAnalysis = async (idea: Idea) => {
    console.log("Triggering analysis for:", idea.id);
    // Optimistic update for status
    const processingIdea: Idea = { ...idea, status: 'processing' };
    persistIdeaUpdate(processingIdea);

    try {
      const { analysis, groundingChunks } = await analyzeIdeaRecursive(idea.title, idea.userNotes);
      
      const finishedIdea: Idea = {
        ...idea,
        status: 'ready',
        analysis: analysis,
        groundingSources: [...idea.groundingSources, ...groundingChunks],
        updatedAt: Date.now()
      };
      
      persistIdeaUpdate(finishedIdea);
    } catch (e) {
      console.error("Analysis failed:", e);
      const errorIdea: Idea = { ...idea, status: 'error' };
      persistIdeaUpdate(errorIdea);
    }
  };

  // Wrapper for child components to update ideas
  const handleUpdateIdea = (updated: Idea, shouldTriggerAnalysis = false) => {
    console.log("Updating idea:", updated.id);
    const timestampedIdea = { ...updated, updatedAt: Date.now() };
    persistIdeaUpdate(timestampedIdea);
    
    if (shouldTriggerAnalysis) {
        triggerAnalysis(timestampedIdea);
    }
  };

  const handleCardClick = (idea: Idea) => {
    console.log("Card clicked:", idea.id, idea.title);
    try {
      setSelectedIdea(idea);
    } catch (e) {
      console.error("Error setting selected idea:", e);
    }
  };

  // ROUTING RENDER
  if (currentView === 'landing') {
    return (
      <>
        <DebugOverlay />
        <LandingPage onEnterApp={() => setCurrentView('dashboard')} />
      </>
    );
  }

  // DASHBOARD VIEW
  return (
    <div className="min-h-screen pb-20 relative bg-[#FDFBF7]">
      <DebugOverlay />
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-200/50 py-4 px-4 md:px-12 flex items-center justify-between">
        <button 
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
          title="Back to Home"
        >
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-md group-hover:rotate-12 transition-transform">
             <Sparkles className="text-white w-4 h-4" />
          </div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-gray-900">SparkGarden</h1>
        </button>
        
        <div className="flex items-center gap-4">
           {/* Mobile Home Icon */}
           <button onClick={() => setCurrentView('landing')} className="md:hidden text-stone-500">
             <Home size={20} />
           </button>

           <button 
            onClick={() => setShowNewIdeaInput(true)}
            className="bg-black hover:bg-stone-800 text-white px-5 py-2.5 rounded-full font-medium transition-transform active:scale-95 shadow-lg flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden md:inline">New Seed</span>
            <span className="inline md:hidden">Seed</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        {/* Intro Banner if empty */}
        {ideas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="w-24 h-24 bg-stone-200 rounded-full mb-6 animate-pulse" />
            <h2 className="font-display text-4xl text-stone-400 mb-2">It's quiet here...</h2>
            <p className="font-hand text-xl text-stone-400">Plant a seed to start your garden.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-fr">
          {ideas.map(idea => (
            <ErrorBoundary key={idea.id} componentName={`IdeaCard-${idea.id}`}>
               <IdeaCard idea={idea} onClick={handleCardClick} />
            </ErrorBoundary>
          ))}
        </div>
      </main>

      {/* New Idea Modal/Overlay */}
      {showNewIdeaInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="font-display text-3xl mb-6 text-gray-900">Plant a new idea</h2>
            
            <input 
              autoFocus
              className="w-full text-2xl font-display font-medium text-gray-900 border-b-2 border-stone-100 py-2 mb-4 outline-none focus:border-black transition-colors bg-transparent placeholder-stone-300"
              placeholder="Give it a name..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            
            <textarea 
              className="w-full h-32 font-hand text-xl text-gray-900 border border-stone-100 rounded-xl p-4 outline-none focus:ring-2 focus:ring-black/5 bg-stone-50 resize-none placeholder-stone-300"
              placeholder="What's on your mind? Scribble your raw thoughts here..."
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
            />
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowNewIdeaInput(false)}
                className="px-6 py-2 rounded-full text-stone-500 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateIdea}
                disabled={!newTitle.trim()}
                className="px-8 py-2 rounded-full bg-black text-white font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-xl"
              >
                Plant & Grow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedIdea && (
        <ErrorBoundary componentName="IdeaDetailModal" fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white p-8 rounded-2xl max-w-md text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error Opening Note</h2>
                    <p className="text-gray-600 mb-4">We encountered an issue displaying the details for "{selectedIdea.title}".</p>
                    <button onClick={() => setSelectedIdea(null)} className="px-4 py-2 bg-gray-900 text-white rounded-lg">Close</button>
                </div>
            </div>
        }>
            <IdeaDetailModal 
              idea={selectedIdea} 
              onClose={() => setSelectedIdea(null)} 
              onUpdateIdea={handleUpdateIdea}
            />
        </ErrorBoundary>
      )}

      {/* Chat Floater - Now connected to Update Logic */}
      <ErrorBoundary componentName="ChatWidget">
        <ChatWidget 
            currentIdeaContext={selectedIdea} 
            onUpdateIdea={(updated) => handleUpdateIdea(updated, false)}
        />
      </ErrorBoundary>
    </div>
  );
};

export default App;