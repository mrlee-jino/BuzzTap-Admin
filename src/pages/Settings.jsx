import { useState } from "react"
import Modal from "../components/Modal"
import Toast from "../components/Toast"
import ConfirmModal from "../components/ConfirmModal"

function Settings() {
  const [toggles, setToggles] = useState({ nfc: true, payment: true, updates: true })
  const [security, setSecurity] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)
  const [maintenance, setMaintenance] = useState(false)
  const [toast, setToast] = useState("")
  const toggle = (key, service) => setToggles((current) => { const enabled = !current[key]; setToast(`${service} ${enabled ? "enabled" : "disabled"}.`); return { ...current, [key]: enabled } })
  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">
          System Configuration
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Settings
        </h1>

        <p className="mt-2 text-gray-500">
          Manage BuzzTap platform settings and administrator preferences.
        </p>
      </div>


      {/* General Settings */}
      <div className="rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-semibold">
            General Settings
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Basic information about the BuzzTap platform.
          </p>
        </div>


        <div className="space-y-6 p-6">

          <div>
            <label className="text-sm text-gray-400">
              Platform Name
            </label>

            <input
              type="text"
              defaultValue="BuzzTap"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400/50"
            />
          </div>


          <div>
            <label className="text-sm text-gray-400">
              Platform Description
            </label>

            <textarea
              defaultValue="Smart technology solutions for modern businesses."
              rows="3"
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400/50"
            />
          </div>


          <button onClick={() => setToast("Changes saved")} className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-400/10">
            Save Changes
          </button>

        </div>

      </div>


      {/* Platform Configuration */}
      <div className="rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-semibold">
            Platform Configuration
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Configure important BuzzTap platform services.
          </p>
        </div>


        <div className="divide-y divide-white/5">

          {/* NFC Service */}
          <div className="flex items-center justify-between gap-6 px-6 py-5">

            <div>
              <p className="font-medium">
                NFC Card Service
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Allow BuzzTap businesses to use NFC card services.
              </p>
            </div>

            <button onClick={() => toggle("nfc", "NFC Card Service")} className={`relative h-6 w-11 rounded-full ${toggles.nfc ? "bg-yellow-400" : "bg-gray-700"}`} aria-label="Toggle NFC service">
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-black ${toggles.nfc ? "right-1" : "left-1"}`} />
            </button>

          </div>


          {/* Payment Service */}
          <div className="flex items-center justify-between gap-6 px-6 py-5">

            <div>
              <p className="font-medium">
                Payment Service
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Enable payment processing across the platform.
              </p>
            </div>

            <button onClick={() => toggle("payment", "Payment Service")} className={`relative h-6 w-11 rounded-full ${toggles.payment ? "bg-yellow-400" : "bg-gray-700"}`} aria-label="Toggle payment service">
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-black ${toggles.payment ? "right-1" : "left-1"}`} />
            </button>

          </div>


          {/* Automatic Updates */}
          <div className="flex items-center justify-between gap-6 px-6 py-5">

            <div>
              <p className="font-medium">
                Automatic System Updates
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Automatically apply available platform updates.
              </p>
            </div>

            <button onClick={() => toggle("updates", "Automatic System Updates")} className={`relative h-6 w-11 rounded-full ${toggles.updates ? "bg-yellow-400" : "bg-gray-700"}`} aria-label="Toggle automatic updates">
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-black ${toggles.updates ? "right-1" : "left-1"}`} />
            </button>

          </div>

        </div>

      </div>


      {/* Security */}
      <div className="rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">

          <h2 className="font-semibold">
            Security
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Manage administrator security settings.
          </p>

        </div>


        <div className="space-y-6 p-6">

          <div className="flex items-center justify-between gap-6">

            <div>
              <p className="font-medium">
                Two-Factor Authentication
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Add an additional layer of security to administrator accounts.
              </p>
            </div>

            <span className={`rounded-full px-3 py-1 text-xs font-medium ${twoFactorEnabled ? "bg-yellow-400/10 text-yellow-400" : "bg-orange-400/10 text-orange-400"}`}>
              {twoFactorEnabled ? "Enabled" : "Not Enabled"}
            </span>

          </div>


          <button onClick={() => setSecurity(true)} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-gray-300 transition hover:border-yellow-400/30 hover:text-yellow-400">
            Configure Security
          </button>

        </div>

      </div>


      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-400/10 bg-[#111111]">

        <div className="border-b border-red-400/10 px-6 py-5">

          <h2 className="font-semibold text-red-400">
            Danger Zone
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Actions in this section can affect the entire BuzzTap platform.
          </p>

        </div>


        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="font-medium">
              Maintenance Mode
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Temporarily disable access to the BuzzTap platform.
            </p>
          </div>

          <button onClick={() => setMaintenance(true)} className="rounded-xl border border-red-400/20 px-5 py-3 text-sm font-medium text-red-400 transition hover:bg-red-400/10">
            {maintenanceEnabled ? "Disable Maintenance" : "Enable Maintenance"}
          </button>

        </div>

      </div>

      {security && <Modal title="Configure Security" onClose={() => setSecurity(false)}><p className="text-sm text-gray-400">Scan the QR code in your authenticator app to enable administrator 2FA.</p><button onClick={() => { setTwoFactorEnabled(true); setSecurity(false); setToast("Two-factor authentication enabled") }} className="mt-6 rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black">Enable 2FA</button></Modal>}
      {maintenance && <ConfirmModal title={`${maintenanceEnabled ? "Disable" : "Enable"} maintenance mode?`} description={maintenanceEnabled ? "This will restore access to the BuzzTap platform." : "This will temporarily disable access for platform users."} confirmLabel={maintenanceEnabled ? "Disable Maintenance" : "Enable Maintenance"} destructive={!maintenanceEnabled} onConfirm={() => { const enabled = !maintenanceEnabled; setMaintenanceEnabled(enabled); setMaintenance(false); setToast(`Maintenance mode ${enabled ? "enabled" : "disabled"}`) }} onClose={() => setMaintenance(false)} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  )
}

export default Settings