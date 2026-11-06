'use client';

import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Suppress error stack traces in production to avoid leaking internal details
    const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
    if (isDev) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#1A1A2E',
          color: '#FFF5E4',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{ maxWidth: 600, textAlign: 'center' }}>
            {/* <h1>: each page owns one heading, even on the error fallback. */}
            <h1 style={{ color: '#FF6B9D', fontSize: '24px', marginBottom: '16px' }}>
              页面出了点问题
            </h1>
            <p style={{ color: '#FFF5E4/60', marginBottom: '24px' }}>
              请尝试清除浏览器缓存后刷新页面
            </p>
            <button
              onClick={() => {
                // Clear sensitive data and reload
                try {
                  localStorage.removeItem('laslos_life_save');
                  localStorage.removeItem('laslos_save_version');
                  localStorage.removeItem('laslos_achievements');
                  localStorage.removeItem('laslos_lang');
                  localStorage.removeItem('laslos_cheat_triggered');
                } finally {
                  window.location.reload();
                }
              }}
              style={{
                marginTop: '20px',
                padding: '10px 24px',
                backgroundColor: '#FF6B9D',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              重置并刷新
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
