import React from 'react';

export interface ErrorBoundaryProps {
  /** Rendered instead of the children once one of them throws while rendering. */
  fallback: React.ReactNode;
  onError?: (error: Error) => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Contains a render crash (e.g. a lost WebGL context) to its subtree and shows `fallback` instead. */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  render(): React.ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
