import React from 'react';
import { Sparkles, Leaf, BrainCircuit, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SocialMediaCard: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-auto">
      <div className="relative bg-white rounded-xl shadow-2xl max-w-[90vw] overflow-hidden">
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
            <h3 className="font-mono text-sm uppercase tracking-widest">Social Card Generator (1200x630)</h3>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* The Card Itself - Scaled Container */}
        <div className="p-8 bg-stone-100 flex items-center justify-center overflow-auto">
            {/* 
               This div is exactly 1200x630. 
               We scale it down with CSS zoom/transform for preview, but it remains true to size for screenshotting.
            */}
            <div 
                className="relative bg-[#FDFBF7] flex-shrink-0 shadow-2xl overflow-hidden selection:bg-none"
                style={{ 
                    width: '1200px', 
                    height: '630px',
                    backgroundImage: 'radial-gradient(#E5E5E5 2px, transparent 2px)',
                    backgroundSize: '32px 32px'
                }}
            >
                 {/* Decorative Blobs */}
                 <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/80 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                 <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-yellow-50/80 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

                 {/* Content Container */}
                 <div className="relative h-full w-full flex flex-col items-center justify-center text-center p-20 z-10">
                    
                    {/* Badge */}
                    <div className="mb-8 px-6 py-2 rounded-full border-2 border-stone-900 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-xl font-bold text-stone-900 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                            AI Incubator V1.0
                        </span>
                    </div>

                    {/* Main Title */}
                    <h1 className="font-display text-[140px] leading-[0.9] text-stone-900 mb-6 relative">
                        SparkGarden
                        <span className="absolute -top-6 -right-16 text-yellow-400">
                             <Sparkles size={80} strokeWidth={2.5} />
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="font-sans text-4xl text-stone-600 max-w-3xl leading-normal">
                        Don't let your ideas die in a notebook. <br/>
                        <span className="text-indigo-600 font-bold">Research, plan, and visualize</span> while you sleep.
                    </p>
                 </div>

                 {/* Sticky Note 1: Left */}
                 <div className="absolute top-24 left-20 w-56 h-56 bg-[#FFD6E0] p-6 shadow-xl -rotate-6 rounded-sm flex flex-col items-center justify-center text-center border border-black/5">
                    <div className="w-12 h-12 rounded-full bg-red-400/20 mb-4 flex items-center justify-center">
                        <BrainCircuit size={24} className="text-red-800 opacity-60"/>
                    </div>
                    <p className="font-hand text-3xl leading-tight text-stone-800">"What if my notes could think?"</p>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-white/40 rotate-1 backdrop-blur-sm" />
                 </div>

                 {/* Sticky Note 2: Right */}
                 <div className="absolute bottom-20 right-20 w-64 h-72 bg-[#C1F0DC] p-6 shadow-xl rotate-3 rounded-sm flex flex-col border border-black/5">
                     <div className="w-full h-32 bg-white/60 mb-4 rounded-sm flex items-center justify-center">
                        <Leaf size={40} className="text-green-700 opacity-40" />
                     </div>
                     <p className="font-hand text-3xl text-stone-800 leading-tight">Market Research: <br/><span className="font-sans font-bold text-lg">Validating...</span></p>
                     <div className="absolute -top-3 right-12 w-20 h-20 bg-yellow-300 rounded-full opacity-50 mix-blend-multiply blur-xl" />
                 </div>
                 
                 {/* Footer URL */}
                 <div className="absolute bottom-10 left-1/2 -translate-x-1/2 font-mono text-stone-400 tracking-widest text-lg">
                    SPARKGARDEN.APP
                 </div>
            </div>
        </div>
        
        <div className="p-4 bg-stone-50 text-center text-sm text-stone-500 border-t border-stone-200">
            💡 Pro Tip: Take a screenshot of the card above and save it as <code>og-image.png</code>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaCard;