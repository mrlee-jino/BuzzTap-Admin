import { useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { formatAccountNumber } from "../lib/accountNumber"

export default function CustomerAccountNumber({ customer, onAssigned }) {
  const [region, setRegion] = useState("13")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  if (!customer?.id) return <span>Not assigned</span>
  if (customer.account_number) return <span className="whitespace-nowrap font-mono">{formatAccountNumber(customer.account_number)}</span>

  async function assign() {
    if (saving) return
    setSaving(true)
    setError("")
    try {
      const { error } = await supabase.rpc("admin_assign_customer_account_number", { p_customer_id: customer.id, p_region: region })
      if (error) throw error
      await onAssigned()
    } catch (error) { setError(error.message || "Unable to assign account number.") }
    finally { setSaving(false) }
  }

  return <div className="space-y-2 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      <input aria-label="Account region code" title="Two-digit region code. Caraga = 13" value={region} onChange={(event) => setRegion(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" maxLength={2} className="w-16 rounded-lg border border-white/15 bg-[#080808] px-2 py-1" />
      <button type="button" disabled={saving || !/^(?!00)\d{2}$/.test(region)} onClick={assign} className="text-xs text-yellow-400 disabled:opacity-40">{saving ? "Assigning…" : "Assign account number"}</button>
    </div>
    <p className="text-xs text-gray-500">Region code (Caraga: 13). Permanent once assigned.</p>
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </div>
}
