import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Wrench, PenLine } from 'lucide-react';
import { aiAPI, ideasAPI } from '../services/api';
import { ChatMessage, Idea } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatWidgetProps {
  currentIdeaContext?: Idea | null;
  onUpdateIdea?: (updatedIdea: Idea) => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ currentIdeaContext, onUpdateIdea }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: 'model', text: 'Hi! I\'m your creative partner. Ask me anything or open a note to get specific help!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !currentIdeaContext) return;

    const userMsg: ChatMessage = { id: Date.now(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const result = await aiAPI.chat(currentIdeaContext.id, input, history);

      if (result.toolCalls && result.toolCalls.length > 0 && onUpdateIdea) {
        const freshIdea = await ideasAPI.get(currentIdeaContext.id);
        onUpdateIdea(freshIdea.idea);
        
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'model',
          text: `*Updated blueprints based on your request...* 🛠️`
        }]);
      }

      const aiMsg: ChatMessage = { id: Date.now() + 1, role: 'model', text: result.response || "I processed your request." };
      setMessages(prev => [...prev, aiMsg]);

    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now(), role: 'model', text: "Sorry, I had trouble processing that request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end pointer-events-none">
      {isOpen && (
        <div className="pointer-events-auto mb-4 w-[90vw] max-w-sm h-[60vh] md:h-[520px] bg-[#FFFEF9] rounded-sm shadow-2xl border border-amber-100/50 flex flex-col overflow-hidden animate-float relative"
             style={{
               backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #E8DCC8 27px, #E8DCC8 28px)',
               backgroundPosition: '0 80px',
             }}>
          <div className="absolute left-8 top-0 bottom-0 w-px bg-rose-200/30 pointer-events-none" />
          
          <div className="bg-[#2C2C2C] p-4 flex items-center justify-between text-white shrink-0 shadow-md relative z-10">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-200" />
              <span className="font-display font-bold tracking-tight text-lg">Muse Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-md transition">
              <X size={20} />
            </button>
          </div>
          
          {currentIdeaContext && (
            <div className="bg-amber-50/80 px-4 py-2 text-[10px] text-stone-600 font-hand border-b border-amber-100 flex items-center gap-2 justify-between shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Ref: {currentIdeaContext.title}
              </div>
              <div className="flex items-center gap-1 opacity-60">
                 <Wrench size={10} />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 py-6 space-y-6 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`
                    max-w-[90%] p-3 rounded-sm text-sm leading-relaxed relative
                    ${msg.role === 'user' 
                      ? 'bg-amber-100/80 text-stone-800 shadow-sm border-l-4 border-amber-300 font-hand' 
                      : 'bg-transparent text-stone-800 font-hand italic'
                    }
                  `}
                >
                  {msg.role === 'model' && (
                    <div className="absolute -top-4 -left-1 text-[10px] text-stone-400 not-italic font-sans uppercase tracking-widest opacity-50">
                      Muse:
                    </div>
                  )}
                  <div className={msg.role === 'model' ? 'pl-2' : ''}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                 <div className="bg-transparent px-4 py-1 flex gap-1 items-center opacity-40">
                    <span className="w-1 h-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-transparent shrink-0 relative z-10">
            <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-lg border border-amber-200/60 shadow-inner focus-within:border-amber-400 transition-all">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={currentIdeaContext ? "Write a note to Muse..." : "Select a seed to chat..."}
                className="flex-1 bg-transparent px-3 py-1 outline-none text-sm text-stone-800 placeholder-stone-400 font-hand"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping || !currentIdeaContext}
                className="p-2 bg-[#2C2C2C] text-white rounded-md hover:bg-black disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          
          <div className="absolute top-0 right-10 w-6 h-8 bg-amber-300/40 rounded-b-sm pointer-events-none z-20 shadow-sm" />
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto bg-[#2C2C2C] hover:bg-black text-white p-4 rounded-xl shadow-xl transition-all hover:scale-105 flex items-center gap-3 group border border-stone-700"
      >
        {isOpen ? <X size={20} /> : <PenLine size={20} />}
        {!isOpen && (
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-semibold tracking-tight">
            Consult Muse
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
