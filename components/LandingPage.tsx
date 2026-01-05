import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, ArrowRight, BrainCircuit, Palette, Zap, ChevronDown, Leaf, Camera } from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onViewSocialCard?: () => void;
}

// --- Animation Helper Component ---
const RevealOnScroll: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = "", delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add a tiny delay to ensure smooth staggering
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0 filter blur-0" : "opacity-0 translate-y-12 filter blur-sm"
      } ${className}`}
    >
      {children}
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onViewSocialCard }) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => requestAnimationFrame(() => setScrollY(window.scrollY));
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-900 overflow-x-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Decorative Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.4]" 
           style={{ backgroundImage: 'radial-gradient(#E5E5E5 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-[#FDFBF7]/80 backdrop-blur-md border-b border-stone-100 transition-all duration-300">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-300">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">SparkGarden</span>
        </div>
        <button 
          onClick={onEnterApp}
          className="bg-black text-white px-6 py-2.5 rounded-full font-medium hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-2xl flex items-center gap-2"
        >
          Open Garden <ArrowRight size={16} />
        </button>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 md:pt-48 md:pb-32 max-w-7xl mx-auto flex flex-col items-center text-center perspective-1000">
        
        {/* Floating Scrapbook Elements with Parallax */}
        <div 
            className="absolute top-24 -left-2 w-32 h-32 p-3 md:top-40 md:left-20 md:w-40 md:h-40 bg-[#FFD6E0] rounded-sm shadow-xl -rotate-6 md:p-4 transition-transform duration-75 ease-out will-change-transform z-0"
            style={{ transform: `translateY(${scrollY * -0.2}px) rotate(-6deg)` }}
        >
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-red-400/20 mb-2" />
          <p className="font-hand text-lg md:text-2xl leading-tight">"What if my notes could think?"</p>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/40 rotate-1 backdrop-blur-sm" />
        </div>

        <div 
            className="absolute top-28 -right-4 w-32 h-40 p-3 md:top-60 md:right-20 md:w-48 md:h-56 bg-[#C1F0DC] rounded-sm shadow-xl rotate-3 md:p-4 transition-transform duration-75 ease-out will-change-transform z-0"
            style={{ transform: `translateY(${scrollY * -0.15}px) rotate(3deg)` }}
        >
           <div className="w-full h-16 md:h-24 bg-white/50 mb-3 rounded-sm overflow-hidden border border-black/5">
             <div className="w-full h-full bg-emerald-200/30 flex items-center justify-center">
                <Leaf className="text-emerald-600 opacity-50" />
             </div>
           </div>
           <p className="font-hand text-sm md:text-xl">Market Research: <br/><span className="font-sans font-bold text-xs md:text-sm">Validating...</span></p>
           <div className="absolute -top-3 right-10 w-12 h-12 bg-yellow-200 rounded-full opacity-80 mix-blend-multiply" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <RevealOnScroll>
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-stone-200 bg-white shadow-sm">
              <span className="text-sm font-medium text-stone-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                AI-Powered Incubator v1.0
              </span>
            </div>
          </RevealOnScroll>
          
          <RevealOnScroll delay={100}>
            <h1 className="font-display text-6xl md:text-8xl md:leading-[1.1] text-gray-900 mb-8 relative">
              Don't let your ideas <br/>
              <span className="relative inline-block">
                die in a notebook.
                <svg className="absolute -bottom-2 w-full h-3 text-yellow-300 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h1>
          </RevealOnScroll>
          
          <RevealOnScroll delay={200}>
            <p className="font-sans text-xl md:text-2xl text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              SparkGarden is an intelligent workspace that <span className="font-bold text-gray-800">researches, plans, and visualizes</span> your ideas while you sleep.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={300}>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button 
                onClick={onEnterApp}
                className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black hover:-translate-y-1 transition-all shadow-xl hover:shadow-2xl w-full md:w-auto flex items-center justify-center gap-3"
              >
                <Zap className="fill-yellow-400 text-yellow-400" />
                Start Incubating Free
              </button>
              <p className="text-stone-400 text-sm font-hand mt-2 md:mt-0 md:ml-4 rotate-2">
                No login required. Local data.
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <div className="w-full bg-gray-900 text-white py-4 overflow-hidden -rotate-1 shadow-xl mb-20 origin-left scale-105">
        <div className="flex gap-12 animate-marquee whitespace-nowrap font-mono text-sm uppercase tracking-widest opacity-80">
           {[...Array(10)].map((_, i) => (
             <React.Fragment key={i}>
                <span>Recursive Analysis</span>
                <span>★</span>
                <span>Automated PRDs</span>
                <span>★</span>
                <span>Market Recon</span>
                <span>★</span>
             </React.Fragment>
           ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <RevealOnScroll>
          <h2 className="font-display text-4xl md:text-5xl text-center mb-16">From Seed to Forest</h2>
        </RevealOnScroll>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              icon: BrainCircuit, 
              color: 'bg-indigo-100 text-indigo-600',
              title: "1. Plant a Seed",
              desc: "Jot down a rough idea. Just a sentence or two. 'A discipline app for creatives' or 'Uber for Dog Walkers'." 
            },
            { 
              icon: Sparkles, 
              color: 'bg-purple-100 text-purple-600',
              title: "2. We Water It",
              desc: "Our AI Agents immediately research competitors, check technical feasibility, and identify market trends." 
            },
            { 
              icon: Palette, 
              color: 'bg-orange-100 text-orange-600',
              title: "3. You Harvest",
              desc: "Wake up to a full Product Requirements Document, UI Designs, and a coding plan ready for development." 
            }
          ].map((feature, i) => (
            <RevealOnScroll key={i} delay={i * 150} className="h-full">
              <div className="bg-white border-2 border-stone-900 p-8 rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all h-full">
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
                  <feature.icon size={28} strokeWidth={2.5} />
                </div>
                <h3 className="font-display text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-stone-600 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* VALUE PROP / BIG IMAGE */}
      <section className="py-20 px-6 bg-stone-100 border-y border-stone-200">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
               <RevealOnScroll>
                 <h2 className="font-display text-4xl md:text-5xl leading-tight">
                   Your personal <br/>
                   <span className="text-indigo-600">Chief Product Officer.</span>
                 </h2>
               </RevealOnScroll>
               <RevealOnScroll delay={100}>
                 <p className="text-lg text-stone-600 max-w-md">
                   Most ideas die because the "Next Step" is too hard. SparkGarden removes the friction by doing the heavy lifting for you.
                 </p>
               </RevealOnScroll>
               <ul className="space-y-3 font-medium text-stone-700">
                 {[
                   "One-Click Market Analysis",
                   "One-Shot Prompt Generation for Coding",
                   "Auto-generated UI Concepts",
                   "Executive Summaries"
                 ].map((item, i) => (
                   <RevealOnScroll key={i} delay={200 + (i * 100)}>
                     <li className="flex items-center gap-3">
                       <div className="w-6 h-6 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs">✓</div>
                       {item}
                     </li>
                   </RevealOnScroll>
                 ))}
               </ul>
            </div>
            
            {/* Abstract UI Representation */}
            <div className="flex-1 relative w-full h-[400px] md:h-[500px]">
               <RevealOnScroll delay={300} className="w-full h-full">
                 <div className="absolute inset-0 bg-white rounded-3xl border-2 border-stone-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col hover:scale-[1.02] transition-transform duration-500">
                    <div className="h-8 bg-stone-100 border-b border-stone-200 flex items-center px-4 gap-2">
                       <div className="w-3 h-3 rounded-full bg-red-400" />
                       <div className="w-3 h-3 rounded-full bg-yellow-400" />
                       <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 p-6 bg-stone-50 font-mono text-xs md:text-sm text-stone-800 leading-relaxed overflow-hidden opacity-70">
                       <span className="text-purple-600"># Executive Summary</span><br/>
                       <span className="font-bold">Project:</span> Recursive Learning AI<br/>
                       <span className="font-bold">Status:</span> <span className="text-green-600">Validated</span><br/><br/>
                       The market for AI companions is saturated, but a "Recursive" model offers a unique moat. 
                       Competitors include Replika and Dot, but they lack the self-improvement loop defined in the PRD...
                       <br/><br/>
                       <div className="p-4 bg-white border border-stone-200 rounded-lg shadow-sm">
                          <div className="font-bold text-indigo-600 mb-2">Recommended Stack</div>
                          • Frontend: React Native (Expo)<br/>
                          • AI: Gemini 1.5 Flash (Low Latency)<br/>
                          • Vector DB: Pinecone
                       </div>
                    </div>
                    {/* Floating elements on top */}
                    <div className="absolute bottom-8 right-8 bg-black text-white px-4 py-2 rounded-lg font-bold shadow-lg animate-bounce">
                      Ready to Build!
                    </div>
                 </div>
               </RevealOnScroll>
            </div>
         </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 max-w-3xl mx-auto">
        <RevealOnScroll>
          <h2 className="font-display text-4xl text-center mb-12">Common Questions</h2>
        </RevealOnScroll>
        <div className="space-y-4">
          {[
            { q: "Is it really free?", a: "Yes. SparkGarden runs client-side. We use a shared API key for the demo, but you can bring your own for heavy usage." },
            { q: "Where is my data stored?", a: "Locally in your browser (IndexedDB). We don't have a backend database seeing your ideas." },
            { q: "Can it write code?", a: "It generates 'One-Shot Prompts' designed to be pasted into coding tools like Cursor or Bolt to generate the app instantly." },
          ].map((item, i) => (
            <RevealOnScroll key={i} delay={i * 100}>
              <details className="group bg-white border border-stone-200 rounded-xl overflow-hidden cursor-pointer">
                <summary className="flex items-center justify-between p-6 font-medium text-lg text-gray-900 group-hover:bg-stone-50 transition-colors list-none">
                  {item.q}
                  <ChevronDown className="group-open:rotate-180 transition-transform text-stone-400" />
                </summary>
                <div className="px-6 pb-6 text-stone-600 leading-relaxed animate-in slide-in-from-top-2">
                  {item.a}
                </div>
              </details>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-12 px-6">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Sparkles className="text-white w-4 h-4" />
              </div>
              <span className="font-display text-xl font-bold">SparkGarden</span>
            </div>
            
            <p className="text-stone-400 text-sm font-hand">
               Designed with dopamine & intensity. © 2026
            </p>
            
            <div className="flex gap-6 text-sm font-medium text-stone-500 items-center">
               <button onClick={onViewSocialCard} className="hover:text-black transition-colors flex items-center gap-1">
                 <Camera size={14}/> Social Card
               </button>
               <a href="#" className="hover:text-black transition-colors">GitHub</a>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;