import { useEffect, useRef, useState } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, type = "success", onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onClose]);

  return (
    <div
      className={twMerge(
        "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-sm text-sm transition-all duration-300",
        type === "success"
          ? "bg-white border-l-[3px] border-l-green-600 border-slate-200"
          : "bg-white border-l-[3px] border-l-red-600 border-slate-200",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
      role="status"
      aria-live="polite"
    >
      {type === "success" ? (
        <CheckCircle2 className="size-4 text-green-600 flex-shrink-0" aria-hidden />
      ) : (
        <AlertCircle className="size-4 text-red-600 flex-shrink-0" aria-hidden />
      )}
      <span className="flex-1 text-slate-800">{message}</span>
      <button
        type="button"
        onClick={() => { setVisible(false); onClose(); }}
        className="ml-1 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: number; message: string; type?: "success" | "error" }>;
  onRemove: (id: number) => void;
}

let toastId = 0;

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => onRemove(t.id)} />
      ))}
    </div>
  );
}

export function addToast(
  setToasts: React.Dispatch<React.SetStateAction<Array<{ id: number; message: string; type?: "success" | "error" }>>>,
  message: string,
  type?: "success" | "error"
) {
  const id = ++toastId;
  setToasts((prev) => [...prev, { id, message, type }]);
}
