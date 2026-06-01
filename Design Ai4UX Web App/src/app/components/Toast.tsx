// Toast.tsx — drop in src/app/components/Toast.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  link?: { label: string; href: string };
  duration?: number;
}

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none" style={{maxWidth: 380}}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border"
          style={{
            background: toast.type === "error" ? "#fef2f2" : toast.type === "success" ? "#f0fdf4" : "#eff6ff",
            borderColor: toast.type === "error" ? "#fca5a5" : toast.type === "success" ? "#86efac" : "#93c5fd",
            animation: "slideUp 0.2s ease-out",
            fontFamily: "IBM Plex Sans, sans-serif",
          }}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === "success" && <CheckCircle className="w-4 h-4 text-green-600" />}
            {toast.type === "error"   && <AlertCircle className="w-4 h-4 text-red-600" />}
            {toast.type === "info"    && <Info         className="w-4 h-4 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-snug" style={{
              color: toast.type === "error" ? "#991b1b" : toast.type === "success" ? "#166534" : "#1e40af",
              fontWeight: 500,
            }}>
              {toast.message}
            </p>
            {toast.link && (
              <a href={toast.link.href} target="_blank" rel="noopener noreferrer"
                className="text-xs underline mt-1 block"
                style={{color: toast.type === "error" ? "#dc2626" : "#2563eb"}}>
                {toast.link.label} →
              </a>
            )}
          </div>
          <button onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors">
            <X className="w-3.5 h-3.5" style={{color: "#6b7280"}} />
          </button>
        </div>
      ))}
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// Hook
let _addToast: ((toast: Omit<ToastItem, "id">) => void) | null = null;

export function useToastRegister() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration ?? (toast.type === "error" ? 6000 : 3500));
  }, []);

  useEffect(() => { _addToast = add; return () => { _addToast = null; }; }, [add]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, dismiss };
}

export function toast(message: string, type: ToastType = "info", link?: { label: string; href: string }, duration?: number) {
  if (_addToast) _addToast({ message, type, link, duration });
}

export function toastSuccess(message: string) { toast(message, "success"); }
export function toastError(message: string, link?: { label: string; href: string }) { toast(message, "error", link, 7000); }
export function toastInfo(message: string) { toast(message, "info"); }
