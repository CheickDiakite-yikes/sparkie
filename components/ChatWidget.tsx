import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, MapPin, Search, Wrench } from 'lucide-react';
import { sendAgentChat } from '../services/geminiService';
import { ChatMessage, Idea } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatWidgetProps {
  currentIdeaContext?: Idea | null;
  onUpdateIdea?: (updatedIdea: Idea) => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ currentIdeaContext, onUpdateIdea }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hi! I\'m your creative partner. Ask me anything or open a note to get specific help!' }
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
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Robust Context String
      let contextStr = '';
      if (currentIdeaContext) {
        const notesContent = currentIdeaContext.userNotes?.map(n => n.text).join('\n') || '';
        // Increased context slice limits significantly to include the new detailed research
        contextStr = `
        CURRENT IDEA TITLE: ${currentIdeaContext.title}
        
        USER NOTES:
        ${notesContent}
        
        CURRENT BLUEPRINTS (Analysis):
        - Executive Summary: ${currentIdeaContext.analysis.executiveSummary.slice(0, 1000)}...
        - Market & Tech Research: ${currentIdeaContext.analysis.marketResearch.slice(0, 4000)}... 
        - PRD: ${currentIdeaContext.analysis.prd.slice(0, 2000)}...
        - UI/UX: ${currentIdeaContext.analysis.uiux.slice(0, 2000)}...
        `;
      }

      // 1. Send Message
      const { response, chat } = await sendAgentChat(history, input, contextStr);
      let finalText = response.text || "";

      // 2. Handle Tool Calls (If AI wants to update blueprints)
      if (response.functionCalls && response.functionCalls.length > 0) {
         const toolResponses = [];
         
         for (const call of response.functionCalls) {
           if (call.name === 'updateProjectBlueprint' && currentIdeaContext && onUpdateIdea) {
             const { section, content } = call.args as any;
             
             // Update Local State
             const updatedIdea = {
               ...currentIdeaContext,
               analysis: {
                 ...currentIdeaContext.analysis,
                 [section]: content
               },
               updatedAt: Date.now()
             };
             
             onUpdateIdea(updatedIdea);
             
             toolResponses.push({
               functionResponse: {
                 name: call.name,
                 id: call.id,
                 response: { result: `Successfully updated section: ${section}` }
               }
             });

             // Show a small system message in chat
             setMessages(prev => [...prev, { 
               id: Date.now().toString(), 
               role: 'model', 
               text: `*Updating ${section} based on your request...* 🛠️` 
             }]);
           }
         }

         // 3. Send Tool Outputs back to AI to get final confirmation
         if (toolResponses.length > 0) {
           // Fix: wrap toolResponses in an object with message property
           const finalResponse = await chat.sendMessage({ message: toolResponses });
           finalText = finalResponse.text || "Updated the blueprints for you.";
         }
      }

      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: finalText };
      setMessages(prev => [...prev, aiMsg]);

    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I had trouble processing that request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto mb-4 w-[90vw] max-w-md h-[60vh] md:h-[500px] bg-white rounded-3xl shadow-2xl border-2 border-gray-100 flex flex-col overflow-hidden animate-float">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-300" />
              <span className="font-bold tracking-wide">Muse Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition">
              <X size={20} />
            </button>
          </div>
          
          {/* Context indicator */}
          {currentIdeaContext && (
            <div className="bg-indigo-50 px-4 py-2 text-xs text-indigo-700 font-medium border-b border-indigo-100 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                Context: {currentIdeaContext.title}
              </div>
              <div className="flex items-center gap-1 opacity-70" title="Tools Active">
                 <Wrench size={10} />
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`
                    max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-gray-900 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                    }
                  `}
                >
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                 <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-full border border-gray-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask for updates, research..."
                className="flex-1 bg-transparent px-3 outline-none text-sm text-gray-700"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto bg-gray-900 hover:bg-black text-white p-4 rounded-full shadow-xl transition-transform hover:scale-110 flex items-center gap-2 group"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!isOpen && <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-medium">Ask Muse</span>}
      </button>
    </div>
  );
};

export default ChatWidget;