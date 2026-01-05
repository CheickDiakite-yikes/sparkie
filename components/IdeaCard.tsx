import React from 'react';
import { Idea } from '../types';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';

interface IdeaCardProps {
  idea: Idea;
  onClick: (idea: Idea) => void;
}

const IdeaCard: React.FC<IdeaCardProps> = ({ idea, onClick }) => {
  // Use exec summary if available, otherwise fallback to first note
  const previewText = idea.analysis?.executiveSummary || idea.userNotes?.[0]?.text || "New Idea";

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onClick(idea);
      }}
      className={`
        relative overflow-hidden rounded-2xl p-5 md:p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-rotate-1 shadow-lg hover:shadow-xl
        group flex flex-col justify-between h-64
      `}
      style={{ backgroundColor: idea.color }}
    >
      {/* Tape Effect */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-white/30 rotate-2 backdrop-blur-sm shadow-sm pointer-events-none" />

      <div className="pointer-events-none">
        <h3 className="font-display text-2xl md:text-3xl text-gray-900 leading-tight mb-2 line-clamp-2">
          {idea.title}
        </h3>
        <p className="font-hand text-base md:text-lg text-gray-700 line-clamp-3 leading-snug">
          {previewText}
        </p>
      </div>

      <div className="flex items-center justify-between mt-4 pointer-events-none">
        <div className="flex gap-1 flex-wrap">
          {idea.tags.map(tag => (
            <span key={tag} className="text-[10px] md:text-xs font-bold uppercase tracking-wider bg-black/5 px-2 py-1 rounded-md text-black/60">
              #{tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full backdrop-blur-md group-hover:bg-white/40 transition-colors">
          {idea.status === 'processing' ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-800" />
          ) : idea.status === 'new' ? (
             <Sparkles className="w-5 h-5 text-gray-800 animate-pulse" />
          ) : (
             <ArrowRight className="w-5 h-5 text-gray-800 -rotate-45 group-hover:rotate-0 transition-transform" />
          )}
        </div>
      </div>
      
      {/* Texture overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/5 pointer-events-none mix-blend-overlay" />
    </div>
  );
};

export default IdeaCard;