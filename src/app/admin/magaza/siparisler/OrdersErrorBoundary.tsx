"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export default class OrdersErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Log to console for server log capture
    console.error("[OrdersErrorBoundary] Client-side exception yakalandı:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Sentry veya başka bir log servisi buraya eklenebilir
    console.error("[OrdersErrorBoundary] componentDidCatch:", {
      error: error.message,
      componentStack: info.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-500 flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 className="font-bold text-corp-charcoal text-lg">Sipariş görünümünde bir hata oluştu</h3>
            <p className="text-sm text-corp-gray mt-1 max-w-md">
              Sipariş detayı açılırken beklenmeyen bir hata meydana geldi.
              Sayfayı yenilemeden önce aşağıdaki butona tıklayın.
            </p>
            {this.state.errorMessage && (
              <p className="mt-3 text-xs font-mono bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-200 max-w-md mx-auto break-all">
                {this.state.errorMessage}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-corp-teal text-white font-semibold text-sm hover:bg-corp-teal/90 transition-colors"
          >
            <RefreshCw size={14} />
            Tekrar Dene
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
