'use client';

import React from 'react';
import Link from 'next/link';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class GameErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('GameErrorBoundary caught an error:', error, info);
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="ds-panel p-6 max-w-sm w-full text-center space-y-4">
            <h1 className="font-display text-sm text-red-400">
              SOMETHING WENT WRONG
            </h1>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed">
              An unexpected error occurred during gameplay. You can try again or
              return to the menu.
            </p>
            {this.state.error && (
              <p className="font-sans text-xs text-muted-foreground/50 break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleRetry}
                className="ds-btn-success font-display text-xs px-6 py-2 w-full"
              >
                [ TRY AGAIN ]
              </button>
              <Link
                href="/play"
                className="ds-btn font-display text-xs px-6 py-2 w-full text-center block"
              >
                [ RETURN TO MENU ]
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
