import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.componentName || 'Component'}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex flex-col items-center justify-center text-center text-red-800 min-h-[200px]">
          <AlertTriangle className="w-10 h-10 mb-3 text-red-500" />
          <h3 className="font-display text-lg font-bold">Something went wrong</h3>
          <p className="text-sm opacity-80 mb-4 max-w-xs mx-auto">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 bg-white border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <RefreshCcw size={14} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;