import { useEffect, useRef, useState } from "react";
import { classNames } from "../utils/classNames";

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
      className={classNames("toast", `toast-${type}`, visible && "toast-visible")}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <button type="button" onClick={() => { setVisible(false); onClose(); }} aria-label="Dismiss">
        ×
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
    <div className="toast-container">
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
