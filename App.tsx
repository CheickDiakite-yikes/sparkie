import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, LogOut, Home } from 'lucide-react';
import IdeaCard from './components/IdeaCard';
import ChatWidget from './components/ChatWidget';
import IdeaDetailModal from './components/IdeaDetailModal';
import LandingPage from './components/LandingPage';
import SocialMediaCard from './components/SocialMediaCard';
import AuthPage from './components/AuthPage';
import { authAPI, ideasAPI, aiAPI } from './services/api';
import { Idea, User } from './types';
import ErrorBoundary from './components/ErrorBoundary';

const CARD_COLORS = [
  '#FFD6E0',
  '#C1F0DC',
  '#D4E0FF',
  '#FFF5C2',
  '#E0D4FF',
  '#FFE4C2',
];

type ViewState = 'landing' | 'auth' | 'dashboard';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [showNewIdeaInput, setShowNewIdeaInput] = useState(false);
  const [showSocialCard, setShowSocialCard] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    authAPI.me()
      .then(res => {
        setUser(res.user);
        setAuthChecked(true);
      })
      .catch(() => {
        setUser(null);
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    if (user) {
      loadIdeas();
    }
  }, [user]);

  const loadIdeas = async () => {
    try {
      const res = await ideasAPI.list();
      const loadedIdeas = (res.ideas || []).map((idea: Idea) => ({
        ...idea,
        images: idea.images || [],
        tags: idea.tags || ['Idea'],
        grounding_sources: idea.grounding_sources || [],
        notes: idea.notes || [],
        analysis: idea.analysis || { executive_summary: '', market_research: '', prd: '', uiux: '', one_shot_prompt: '' },
        chat_messages: idea.chat_messages || [],
      }));
      setIdeas(loadedIdeas);
    } catch (e) {
      console.error("Failed to load ideas", e);
    }
  };

  const handleAuthSuccess = (authedUser: User) => {
    setUser(authedUser);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    setUser(null);
    setIdeas([]);
    setSelectedIdea(null);
    setCurrentView('landing');
  };

  const handleEnterApp = () => {
    if (user) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('auth');
    }
  };

  const handleCreateIdea = async () => {
    if (!newTitle.trim()) return;

    try {
      const color = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
      const res = await ideasAPI.create({
        title: newTitle,
        initial_prompt: newPrompt,
        color,
        tags: ['Idea'],
      });

      const newIdea = res.idea;
      setIdeas(prev => [newIdea, ...prev]);
      setNewTitle('');
      setNewPrompt('');
      setShowNewIdeaInput(false);

      aiAPI.analyze(newIdea.id).catch(console.error);
      
      setTimeout(async () => {
        await pollIdeaStatus(newIdea.id);
      }, 3000);
    } catch (e) {
      console.error("Failed to create idea:", e);
    }
  };

  const pollIdeaStatus = async (ideaId: number) => {
    try {
      const res = await ideasAPI.get(ideaId);
      const updatedIdea = res.idea;
      
      setIdeas(prev => prev.map(i => i.id === updatedIdea.id ? updatedIdea : i));
      setSelectedIdea(prev => (prev && prev.id === updatedIdea.id) ? updatedIdea : prev);
      
      if (updatedIdea.status === 'processing') {
        setTimeout(() => pollIdeaStatus(ideaId), 5000);
      }
    } catch (e) {
      console.error("Failed to poll idea status:", e);
    }
  };

  const handleUpdateIdea = (updated: Idea, shouldTriggerAnalysis = false) => {
    setIdeas(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedIdea(prev => (prev && prev.id === updated.id) ? updated : prev);

    if (shouldTriggerAnalysis) {
      aiAPI.analyze(updated.id).catch(console.error);
      setTimeout(() => pollIdeaStatus(updated.id), 3000);
    }
  };

  const handleCardClick = (idea: Idea) => {
    setSelectedIdea(idea);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
            <Sparkles className="text-white w-7 h-7" />
          </div>
          <p className="text-stone-400 font-hand text-lg">Loading SparkGarden...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'landing') {
    return (
      <>
        <LandingPage 
            onEnterApp={handleEnterApp} 
            onViewSocialCard={() => setShowSocialCard(true)}
        />
        {showSocialCard && <SocialMediaCard onClose={() => setShowSocialCard(false)} />}
      </>
    );
  }

  if (currentView === 'auth' || (!user && currentView === 'dashboard')) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen pb-20 relative bg-[#FDFBF7]">
      
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
           <button onClick={() => setCurrentView('landing')} className="md:hidden text-stone-500">
             <Home size={20} />
           </button>

           {user && (
             <span className="hidden md:inline text-sm text-stone-500 font-medium">
               {user.name}
             </span>
           )}

           <button 
            onClick={() => setShowNewIdeaInput(true)}
            className="bg-black hover:bg-stone-800 text-white px-5 py-2.5 rounded-full font-medium transition-transform active:scale-95 shadow-lg flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden md:inline">New Seed</span>
            <span className="inline md:hidden">Seed</span>
          </button>

          <button
            onClick={handleLogout}
            className="text-stone-400 hover:text-stone-600 transition-colors p-2 rounded-full hover:bg-stone-100"
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-12 py-8">
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
