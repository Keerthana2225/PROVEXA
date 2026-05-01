import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

// Global toast state management via custom events
export const toast = {
  success: (msg) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: msg } })),
  error: (msg) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: msg } })),
  warning: (msg) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'warning', message: msg } })),
};

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
};

const styles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300',
};

const iconStyles = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, ...e.detail }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };
    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map(t => {
        const Icon = icons[t.type] || CheckCircle;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-lg max-w-sm animate-slide-up ${styles[t.type]}`}
          >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconStyles[t.type]}`} />
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
