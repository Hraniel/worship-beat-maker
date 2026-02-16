import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    // Clear SW caches and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        for (const name of names) caches.delete(name);
      });
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-6 text-center gap-4">
          <h2 className="text-lg font-bold">Ops! Algo deu errado</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {this.state.error?.message || 'Erro inesperado'}
          </p>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Recarregar app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
