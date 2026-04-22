'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'unnamed'}]`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 border border-caution/30 bg-caution/5 rounded-sm text-center">
          <p className="text-sm font-mono text-caution uppercase mb-2">Component Error</p>
          <p className="text-xs text-dust">This section of the report failed to render. Please refresh or contact support.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
