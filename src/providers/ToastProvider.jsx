import { createContext, useContext, useState, useCallback, useRef } from "react"

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const confirmResolve = useRef(null)

  const toast = useCallback((message, type = "info", duration = 3000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      confirmResolve.current = resolve
      setConfirmState({ message })
    })
  }, [])

  const handleConfirm = useCallback((value) => {
    setConfirmState(null)
    if (confirmResolve.current) {
      confirmResolve.current(value)
      confirmResolve.current = null
    }
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const typeStyles = {
    info: "bg-white/95 text-slate-900 border-slate-200 shadow-xl",
    success: "bg-emerald-600 text-white border-emerald-500 shadow-xl",
    error: "bg-rose-600 text-white border-rose-500 shadow-xl",
    warning: "bg-amber-500 text-white border-amber-400 shadow-xl",
  }

  const typeIcons = {
    info: "ℹ️",
    success: "✅",
    error: "❌",
    warning: "⚠️",
  }

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {toasts.length > 0 && (
        <div aria-live="polite" aria-atomic="false" className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md animate-slide-fade ${typeStyles[t.type] || typeStyles.info}`}
            >
              <span aria-hidden="true" className="text-lg flex-shrink-0">{typeIcons[t.type]}</span>
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button
                onClick={() => dismissToast(t.id)}
                className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmState && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 animate-scale-in">
            <p id="confirm-title" className="text-slate-900 text-base font-medium mb-6">
              {confirmState.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleConfirm(false)}
                className="btn btn-ghost btn-md"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="btn btn-primary btn-md"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider")
  return ctx
}
