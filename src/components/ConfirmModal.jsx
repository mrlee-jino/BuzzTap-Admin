import Modal from "./Modal"

function ConfirmModal({ title, description, confirmLabel = "Confirm", onConfirm, onClose, destructive = false }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm leading-6 text-gray-400">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300 hover:border-white/20 hover:text-white">Cancel</button>
        <button type="button" onClick={onConfirm} className={`rounded-xl px-4 py-2 text-sm font-semibold ${destructive ? "bg-red-500 text-white hover:bg-red-400" : "bg-yellow-400 text-black hover:bg-yellow-300"}`}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
