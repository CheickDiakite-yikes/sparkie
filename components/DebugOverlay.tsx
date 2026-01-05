import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Terminal } from 'lucide-react';

interface LogError {
  id: string;
  message: string;
  type: 'error' | 'promise';
  timestamp: number;
}

export default function DebugOverlay() {
  const [errors, setErrors] = useState<LogError[]>([]);
  const [isVisible, setIsVisible] = useState(false); // Hidden by default unless error occurs

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const newError: LogError = {
        id: Date.now().toString() + Math.random(),
        message: event.message,
        type: 'error',
        timestamp: Date.now(),
      };
      setErrors(prev => [newError, ...prev].slice(0, 5));
      setIsVisible(true);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const newError: LogError = {
        id: Date.now().toString() + Math.random(),
        message: String(event.reason),
        type: 'promise',
        timestamp: Date.now(),
      };
      setErrors(prev => [newError, ...prev].slice(0, 5));
      setIsVisible(true);
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
          <div key={err.id} className="flex items-start gap-3 p-3 bg-red-50/50 rounded-lg border border-red-100/50 text-xs font-mono">
            <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-bold text-red-900 block mb-0.5">
                {err.type === 'error' ? 'Runtime Error' : 'Unhandled Promise'}
              </span>
              <span className="text-red-800 break-all leading-relaxed">{err.message}</span>
              <div className="text-red-400 mt-1 text-[10px]">{new Date(err.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}