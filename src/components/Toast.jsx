import { useEffect } from "react"

function Toast({ message, tone = "success", onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200)
    return () => window.clearTimeout(timer)
  }, [message, onClose])

  return (
    <div className={`fixed bottom-5 right-5 z-[120] flex max-w-sm items-center gap-4 rounded-xl border px-4 py-3 text-sm shadow-2xl ${tone === "error" ? "border-red-400/30 bg-red-950 text-red-200" : tone === "warning" ? "border-orange-400/30 bg-orange-950 text-orange-200" : "border-yellow-400/30 bg-[#171500] text-yellow-200"}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={onClose} className="text-lg leading-none opacity-70 hover:opacity-100" aria-label="Close notification">×</button>
    </div>
  )
}

export default Toast
