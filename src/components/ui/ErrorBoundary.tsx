import React, { Component, ErrorInfo, lazy } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { clearAllAppCaches, clearVolatileCaches } from '../../utils/storage';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  compact?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
  isQuotaError: boolean;
}

function classifyError(error: Error | null) {
  const msg = String(error?.message || error?.name || '').toLowerCase();
  const isChunkError =
    msg.includes('chunkloaderror') ||
    msg.includes('loading chunk') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('dynamically imported module');
  const isQuotaError =
    msg.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quotaexceedederror');

  return { isChunkError, isQuotaError };
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare readonly props: Readonly<ErrorBoundaryProps>;
  declare state: ErrorBoundaryState;
  declare setState: (
    nextState:
      | ErrorBoundaryState
      | Partial<ErrorBoundaryState>
      | ((prevState: Readonly<ErrorBoundaryState>) => ErrorBoundaryState | Partial<ErrorBoundaryState> | null)
  ) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
      isQuotaError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const { isChunkError, isQuotaError } = classifyError(error);
    return {
      hasError: true,
      error,
      isChunkError,
      isQuotaError,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Luxora ErrorBoundary] Caught runtime error:', {
      error,
      componentStack: info.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isChunkError: false,
      isQuotaError: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleClearCacheAndReload = () => {
    clearAllAppCaches({ preserveCart: true });
    try {
      window.location.reload();
    } catch {
      this.handleRetry();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallbackTitle, compact } = this.props;
    const { isChunkError, isQuotaError, error } = this.state;

    const title = fallbackTitle
      ? fallbackTitle
      : isChunkError
      ? 'App Update Available'
      : isQuotaError
      ? 'Storage or Cloud Limit Reached'
      : 'Something Went Wrong';

    const description = isChunkError
      ? 'Your browser cached an older version of this view. Clear local cache and reload to load the latest update.'
      : isQuotaError
      ? 'Your device storage or temporary cloud quota rejected an operation. Clearing local cache restores clean state.'
      : 'A temporary display or network error interrupted this section. You can retry or reset cached browser data cleanly.';

    return (
      <div
        role="alert"
        className={`${
          compact ? 'min-h-[320px] my-6 mx-auto max-w-xl' : 'min-h-screen'
        } bg-[#08090C] text-[#FAF9F6] flex items-center justify-center p-6`}
      >
        <div className="w-full max-w-md rounded-2xl bg-[#12141A] border border-[#D4AF37]/30 p-6 sm:p-8 shadow-2xl space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-display font-semibold text-white">{title}</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">{description}</p>
            {error?.message && !isChunkError && (
              <p className="text-[11px] font-mono text-rose-300/80 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 break-words">
                {error.message.slice(0, 180)}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-1">
            {!isChunkError && (
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry View</span>
              </button>
            )}

            <button
              type="button"
              onClick={this.handleClearCacheAndReload}
              className="px-4 py-2.5 rounded-xl bg-[#1A1D28] hover:bg-[#242838] border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Clear Cache &amp; Reload</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Lazy-load wrapper with automatic cache flush + single retry if a stale chunk URL fails
 * on a user device after a fresh deployment.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (firstErr) {
      console.warn('[Luxora] Lazy module load retry after clearing volatile caches:', firstErr);
      clearVolatileCaches();
      return await factory();
    }
  });
}
