import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Terminal, CheckCircle2 } from 'lucide-react';

interface LogError {
  id: string;
  message: string;
  type: 'error' | 'promise' | 'diagnostic-fail' | 'diagnostic-ok';
  timestamp: number;
}

export default function DebugOverlay() {
  const [errors, setErrors] = useState<LogError[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Diagnostic Script
  useEffect(() => {
    const runDiagnostics = async () => {
      // 1. Check Meta Tag existence
      const ogMeta = document.querySelector('meta[property="og:image"]');
      const url = ogMeta?.getAttribute('content');

      if (!url) {
        reportError('diagnostic-fail', 'CRITICAL: <meta property="og:image"> tag is missing in index.html');
        return;
      }

      try {
        console.log(`[Diagnostic] Testing OG Image: ${url}`);
        
        // Use Image object for testing to bypass CORS issues with fetch
        const img = new Image();
        img.onload = () => {
           console.log("✅ Social Card Diagnostic Passed");
        };
        img.onerror = () => {
           reportError('diagnostic-fail', `Social Card Failed: The image at '${url}' could not be loaded by the browser. Check if the file exists and is publicly accessible.`);
        };
        img.src = url;

      } catch (e: any) {
         reportError('diagnostic-fail', `Social Card Network Error: ${e.message}`);
      }
    };

    // Delay diagnostic slightly
    const timer = setTimeout(runDiagnostics, 3000);
    return () => clearTimeout(timer);
  }, []);

  const reportError = (type: LogError['type'], message: string) => {
    const newError: LogError = {
      id: Date.now().toString() + Math.random(),
      message,
      type,
      timestamp: Date.now(),
    };
    setErrors(prev => [newError, ...prev].slice(0, 5));
    setIsVisible(true);
  };

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportError('error', event.message);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      reportError('promise', String(event.reason));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!isVisible || errors.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-2xl bg-white rounded-xl shadow-2xl border border-red-200 overflow-hidden animate-float-desktop">
      <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-800 font-bold text-sm uppercase tracking-wider">
          <Terminal size={14} />
          System Diagnostics
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-red-200 rounded-full text-red-800 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto p-2 space-y-2 bg-[#fffbfb]">
        {errors.map(err => (
          <div 
            key={err.id} 
            className={`
              flex items-start gap-3 p-3 rounded-lg border text-xs font-mono
              ${err.type.includes('diagnostic') ? 'bg-orange-50 border-orange-200' : 'bg-red-50/50 border-red-100/50'}
            `}
          >
            <AlertCircle size={14} className={`${err.type.includes('diagnostic') ? 'text-orange-500' : 'text-red-500'} mt-0.5 flex-shrink-0`} />
            <div className="flex-1">
              <span className={`font-bold block mb-0.5 ${err.type.includes('diagnostic') ? 'text-orange-900' : 'text-red-900'}`}>
                {err.type === 'error' ? 'Runtime Error' : err.type === 'promise' ? 'Unhandled Promise' : 'Setup Issue'}
              </span>
              <span className="text-gray-800 break-all leading-relaxed">{err.message}</span>
              <div className="opacity-50 mt-1 text-[10px]">{new Date(err.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}