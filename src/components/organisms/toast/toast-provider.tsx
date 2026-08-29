"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/atoms";
import { cn } from "@/lib/utils/cn";

export type ToastVariant = "success" | "error" | "info";

export interface ToastInput {
  message: string;
  variant?: ToastVariant;
  /** ms before auto-dismiss; 0 keeps it until dismissed. */
  duration?: number;
}

interface Toast extends Required<Omit<ToastInput, "duration">> {
  id: number;
  duration: number;
  leaving: boolean;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { className: string; icon: string }> = {
  success: { className: "bg-success-container text-on-success-container", icon: "check_circle" },
  error: { className: "bg-error-container text-on-error-container", icon: "warning" },
  info: { className: "bg-info-container text-on-info-container", icon: "notifications" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 200);
  }, []);

  const toast = useCallback(
    ({ message, variant = "success", duration = 4000 }: ToastInput) => {
      const id = ++counter.current;
      setToasts((list) => [...list.slice(-2), { id, message, variant, duration, leaving: false }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-24 sm:bottom-4 sm:left-auto sm:right-4 sm:items-end sm:px-0 sm:pb-0"
      >
        {toasts.map((t) => {
          const style = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 shadow-overlay transition-all duration-200",
                style.className,
                t.leaving
                  ? "translate-y-1 opacity-0"
                  : "translate-y-0 opacity-100 motion-safe:animate-toast-in",
              )}
            >
              <Icon name={style.icon} size={20} className="mt-0.5 shrink-0" />
              <p className="flex-1 font-body-md text-body-md">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Fechar"
                className="-mr-1 shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
              >
                <Icon name="add" size={16} className="rotate-45" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
