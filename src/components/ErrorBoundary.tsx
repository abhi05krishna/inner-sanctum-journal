import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught an error in [${this.props.sectionName || 'Section'}]:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const section = this.props.sectionName || 'This section';

      return (
        <div 
          id={`error-boundary-${(this.props.sectionName || 'section').toLowerCase().replace(/\s+/g, '-')}`}
          className="flex-1 flex items-center justify-center p-6 sm:p-10 min-h-[300px]"
        >
          <div className="max-w-md w-full p-6 sm:p-8 bg-[#FBF9F5] border border-[#E6E2D3] rounded-2xl shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FAF0F0] border border-[#F3D5D5] text-[#9E2A2B] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
                Something went wrong in {section}
              </h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                An unexpected display error occurred while rendering this view. Your stored reflections and personal data remain safe and intact.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-2.5 rounded-lg bg-[#F5F2EA] border border-[#E6E2D3] text-[11px] font-mono text-[#737373] text-left truncate">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-serif font-semibold bg-[#4A5D4E] hover:bg-[#3A4A3E] text-[#FFFFFF] rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Reloading Section</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-serif font-medium bg-[#F0ECE1] hover:bg-[#E6E2D3] text-[#333333] rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Refresh App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
