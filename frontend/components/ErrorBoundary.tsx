import { Component, ErrorInfo, ReactNode } from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

const MESSAGES = {
  en: { title: 'Something went wrong', reload: 'Reload page' },
  ru: { title: 'Что-то пошло не так', reload: 'Обновить страницу' },
  uz: { title: 'Xatolik yuz berdi', reload: 'Sahifani yangilash' },
};

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const lang = (localStorage.getItem('km_lang') || 'uz') as keyof typeof MESSAGES;
      const msg = MESSAGES[lang] || MESSAGES.uz;
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
          <div className="text-center p-8 max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {msg.title}
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[var(--color-primary)] text-[var(--bg-surface)] rounded-xl text-sm font-medium transition-colors"
            >
              {msg.reload}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
