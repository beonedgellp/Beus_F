import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

export interface PromptOptions {
  title?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
}

interface PendingPrompt extends PromptOptions {
  resolve: (value: string | null) => void;
}

const PromptContext = createContext<(opts: PromptOptions) => Promise<string | null>>(
  async () => null,
);

export function PromptProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const [value, setValue] = useState('');

  const prompt = useCallback((opts: PromptOptions) => {
    setValue(opts.defaultValue ?? '');
    return new Promise<string | null>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const settle = useCallback((result: string | null) => {
    setPending((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') settle(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, settle]);

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      {pending && (
        <div className="modal-overlay" onClick={() => settle(null)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">{pending.title || 'Rename'}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                settle(value);
              }}
            >
              <label className="field">
                <span>{pending.label || 'Name'}</span>
                <input
                  autoFocus
                  value={value}
                  placeholder={pending.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => settle(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {pending.confirmText || 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PromptContext.Provider>
  );
}

export function usePrompt() {
  return useContext(PromptContext);
}
