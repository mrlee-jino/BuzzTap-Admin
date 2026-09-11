import { useEffect, useState } from "react"
import Modal from "../components/Modal"
import ConfirmModal from "../components/ConfirmModal"
import Toast from "../components/Toast"
import { supabase } from "../lib/supabaseClient"

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"

const formatDate = (value) => {
  if (!value) return "Not available"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Not available"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function NFCCards() {
  const [cards, setCards] = useState([])
  const [customers, setCustomers] = useState([])
  const [filter, setFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState("")
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignForm, setAssignForm] = useState({ customerId: "", cardCode: "", cardUid: "", reason: "" })
  const [confirm, setConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role")
      .eq("role", "CUSTOMER")

    if (error) {
      throw error
    }

    return data || []
  }

  const fetchCards = async () => {
    setLoading(true)
    setFetchError("")

    try {
      const [customerRows, { data, error }] = await Promise.all([
        loadCustomers(),
        supabase
          .from("nfc_cards")
          .select(`
            id,
            card_code,
            card_uid,
            customer_id,
            status,
            issued_at,
            replaced_at,
            created_at,
            updated_at
          `)
          .order("created_at", { ascending: false })
      ])

      if (error) {
        throw error
      }

      const customerMap = new Map(customerRows.map((customer) => [customer.id, customer]))

      const normalizedCards = (data || []).map((card) => {
        const customer = customerMap.get(card.customer_id)
        const fullName = customer
          ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
          : ""

        return {
          ...card,
          customerName: fullName || "Unassigned",
        }
      })

      setCustomers(customerRows)
      setCards(normalizedCards)
    } catch (error) {
      setCards([])
      setFetchError(error.message || "Unable to load NFC cards from Supabase.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [])

  const filtered = cards.filter((card) => {
    const query = search.toLowerCase()
    const matchesSearch = [card.card_code, card.card_uid, card.customerName, card.status]
      .join(" ")
      .toLowerCase()
      .includes(query)
    const matchesFilter = filter === "All" || card.status === filter
    return matchesSearch && matchesFilter
  })

  const handleStatusChange = async (card, nextStatus, reason) => {
    try {
      const { error } = await supabase.rpc("admin_update_nfc_card_status", {
        p_card_id: card.id,
        p_new_status: nextStatus,
        p_reason: reason,
      })

      if (error) {
        throw error
      }

      setConfirm(null)
      await fetchCards()
      setToast({ message: `Card status updated to ${nextStatus}.`, tone: "success" })
    } catch (error) {
      setToast({
        message: error.message || "Unable to update NFC card status.",
        tone: "error",
      })
    }
  }

  const handleAssign = async (event) => {
    event.preventDefault()

    const customerId = assignForm.customerId
    const cardCode = (assignForm.cardCode || "").trim()
    const cardUid = (assignForm.cardUid || "").trim()
    const reason = (assignForm.reason || "").trim()

    if (!customerId) {
      setToast({ message: "Please select a customer.", tone: "error" })
      return
    }

    if (!cardCode) {
      setToast({ message: "Card Code is required.", tone: "error" })
      return
    }

    if (!cardUid) {
      setToast({ message: "Card UID is required.", tone: "error" })
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.rpc("admin_assign_nfc_card", {
        p_customer_id: customerId,
        p_card_code: cardCode,
        p_card_uid: cardUid,
        p_reason: reason,
      })

      if (error) {
        throw error
      }

      setAssignOpen(false)
      setAssignForm({ customerId: "", cardCode: "", cardUid: "", reason: "" })
      await fetchCards()
      setToast({ message: "NFC card assigned successfully.", tone: "success" })
    } catch (error) {
      setToast({
        message: error.message || "Unable to assign NFC card.",
        tone: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  const statuses = ["ACTIVE", "LOST", "STOLEN", "BLOCKED", "REPLACED"]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">Card Management</p>
          <h1 className="mt-2 text-4xl font-bold">NFC Cards</h1>
          <p className="mt-2 text-gray-500">Manage BuzzTap NFC cards for customer accounts.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAssignForm({ customerId: "", cardCode: "", cardUid: "", reason: "" })
            setAssignOpen(true)
          }}
          className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black"
        >
          + Assign NFC Card
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111111] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search card code, UID, customer, or status..."
            className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm lg:max-w-md"
          />

          <div className="flex flex-wrap gap-2">
            {["All", ...statuses].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-xl px-4 py-2 text-sm ${filter === item ? "bg-yellow-400 font-semibold text-black" : "bg-white/[0.03] text-gray-400"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-dashed border-yellow-400/30 bg-[#111111] px-6 py-5 text-center text-sm text-yellow-400">
          Loading NFC cards from Supabase...
        </div>
      )}

      {!loading && fetchError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-4 text-sm text-red-300">
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-5 py-4">Card Code</th>
                  <th>Card UID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Issued Date</th>
                  <th>Updated Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {filtered.map((card) => (
                  <tr key={card.id}>
                    <td className="px-5 py-4 font-mono text-white">{card.card_code}</td>
                    <td className="font-mono text-gray-300">{card.card_uid}</td>
                    <td className="text-gray-200">{card.customerName}</td>
                    <td>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-gray-300">
                        {card.status}
                      </span>
                    </td>
                    <td className="text-gray-400">{formatDate(card.issued_at)}</td>
                    <td className="text-gray-400">{formatDate(card.updated_at || card.created_at)}</td>
                    <td className="flex flex-wrap gap-2 py-3">
                      {card.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => setConfirm({
                            card,
                            nextStatus: "BLOCKED",
                            title: "Block NFC Card?",
                            description: `${card.card_code} will be blocked. This change is validated by the database and recorded in the audit log.`,
                            label: "Block",
                            destructive: true,
                            reason: "",
                          })}
                          className="text-xs text-red-400"
                        >
                          Block
                        </button>
                      )}

                      {card.status === "BLOCKED" && (
                        <button
                          type="button"
                          onClick={() => setConfirm({
                            card,
                            nextStatus: "ACTIVE",
                            title: "Unblock NFC Card?",
                            description: `${card.card_code} will be restored to ACTIVE. This change is validated by the database and recorded in the audit log.`,
                            label: "Unblock",
                            destructive: false,
                            reason: "",
                          })}
                          className="text-xs text-yellow-400"
                        >
                          Unblock
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setAssignForm({
                            customerId: card.customer_id || "",
                            cardCode: card.card_code || "",
                            cardUid: card.card_uid || "",
                            reason: "",
                          })
                          setAssignOpen(true)
                        }}
                        className="text-xs text-gray-400"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && <p className="py-12 text-center text-sm text-gray-500">No NFC cards found.</p>}
          </div>
        </div>
      )}

      {assignOpen && (
        <Modal title="Assign NFC Card" onClose={() => setAssignOpen(false)}>
          <form onSubmit={handleAssign} className="space-y-5">
            <label className="block text-sm text-gray-300">
              Customer
              <select
                value={assignForm.customerId}
                onChange={(event) => setAssignForm({ ...assignForm, customerId: event.target.value })}
                className={inputClass}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unnamed Customer"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-gray-300">
              Card Code
              <input
                type="text"
                value={assignForm.cardCode}
                onChange={(event) => setAssignForm({ ...assignForm, cardCode: event.target.value })}
                className={inputClass}
              />
            </label>

            <label className="block text-sm text-gray-300">
              Card UID
              <input
                type="text"
                value={assignForm.cardUid}
                onChange={(event) => setAssignForm({ ...assignForm, cardUid: event.target.value })}
                className={inputClass}
              />
            </label>

            <label className="block text-sm text-gray-300">
              Reason
              <input
                type="text"
                value={assignForm.reason}
                onChange={(event) => setAssignForm({ ...assignForm, reason: event.target.value })}
                className={inputClass}
                placeholder="Optional"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Assigning..." : "Assign Card"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.label}
          destructive={confirm.destructive}
          onConfirm={async () => {
            const reason = (confirm.reason || "").trim()
            await handleStatusChange(confirm.card, confirm.nextStatus, reason)
          }}
          onClose={() => setConfirm(null)}
        >
          <label className="mt-4 block text-sm text-gray-300">
            Reason
            <input
              type="text"
              value={confirm.reason}
              onChange={(event) => setConfirm({ ...confirm, reason: event.target.value })}
              className={inputClass}
              placeholder="Optional"
            />
          </label>
        </ConfirmModal>
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  )
}

export default NFCCards
