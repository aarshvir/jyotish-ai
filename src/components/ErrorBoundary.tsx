'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ReportErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ReportErrorBoundary] ${this.props.fallbackTitle ?? 'Section'} error:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-cosmos border border-horizon rounded-sm p-8 mb-12">
          <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-2">
            {this.props.fallbackTitle ?? 'Section'} unavailable
          </p>
          <p className="font-display text-star/50 text-sm">
            This section encountered an error and could not be displayed.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
