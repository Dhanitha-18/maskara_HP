import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-4 bg-red-50/50 backdrop-blur-md rounded-3xl border border-red-100 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">
            {this.props.fallbackTitle || 'Something went wrong in this section'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-2xl shadow-sm transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Section
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
