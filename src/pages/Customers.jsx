import { useEffect, useState } from "react"
import Modal from "../components/Modal"
import ConfirmModal from "../components/ConfirmModal"
import Toast from "../components/Toast"
import { supabase } from "../lib/supabaseClient"

const statuses = ["PENDING", "ACTIVE", "SUSPENDED", "FROZEN", "CLOSED", "DELETED"]
const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"

const formatJoinedDate = (value) => {
  if (!value) return "Unknown"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Unknown"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

const formatDisplayDate = (value) => {
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

const formatRole = (role) => {
  if (!role) return "Customer"

  const normalized = String(role).toUpperCase()
  return normalized === "CUSTOMER" ? "Customer" : String(role)
}

const getInitials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return "CU"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const normalizeCustomer = (profile) => ({
  id: profile.id,
  firstName: profile.first_name || "",
  lastName: profile.last_name || "",
  name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unnamed Customer",
  email: "Not available yet",
  phone: profile.phone || "Not available",
  cardId: "Not assigned",
  role: profile.role || "CUSTOMER",
  status: String(profile.status || "PENDING").toUpperCase(),
  createdAt: profile.created_at || null,
  updatedAt: profile.updated_at || null,
  balance: 0,
  joined: formatJoinedDate(profile.created_at),
})

const formatAuditLabel = (action) => {
  const normalized = String(action || "").toUpperCase()
  switch (normalized) {
    case "CUSTOMER_STATUS_CHANGED":
      return "Status Update"
    case "CUSTOMER_PROFILE_UPDATED":
      return "Profile Update"
    default:
      return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  }
}

const extractAuditSummary = (audit) => {
  const details = audit?.details || {}
  const reason = details.reason || null

  if (audit?.action === "CUSTOMER_STATUS_CHANGED") {
    const oldStatus = details.old_status ? String(details.old_status) : null
    const newStatus = details.new_status ? String(details.new_status) : null

    if (oldStatus && newStatus) {
      return {
        primary: `${oldStatus} → ${newStatus}`,
        secondary: reason || null,
      }
    }

    return {
      primary: "Status updated",
      secondary: reason || null,
    }
  }

  if (audit?.action === "CUSTOMER_PROFILE_UPDATED") {
    const changes = []

    if (details.old_first_name && details.new_first_name && details.old_first_name !== details.new_first_name) {
      changes.push(`First name: ${details.old_first_name} → ${details.new_first_name}`)
    }

    if (details.old_last_name && details.new_last_name && details.old_last_name !== details.new_last_name) {
      changes.push(`Last name: ${details.old_last_name} → ${details.new_last_name}`)
    }

    if (details.old_phone && details.new_phone && details.old_phone !== details.new_phone) {
      changes.push(`Phone: ${details.old_phone} → ${details.new_phone}`)
    }

    if (!changes.length) {
      const fallback = []
      if (details.old_first_name || details.new_first_name) fallback.push("first name")
      if (details.old_last_name || details.new_last_name) fallback.push("last name")
      if (details.old_phone || details.new_phone) fallback.push("phone")
      return {
        primary: fallback.length ? `Updated ${fallback.join(", ")}` : "Profile updated",
        secondary: reason || null,
      }
    }

    return {
      primary: changes.join(" • "),
      secondary: reason || null,
    }
  }

  return {
    primary: action ? formatAuditLabel(audit.action) : "Activity recorded",
    secondary: reason || null,
  }
}

const getNextStatus = (label) => {
  switch (label) {
    case "Suspend":
      return "SUSPENDED"
    case "Freeze":
      return "FROZEN"
    case "Close":
      return "CLOSED"
    case "Soft Delete":
      return "DELETED"
    case "Reactivate":
      return "ACTIVE"
    default:
      return "ACTIVE"
  }
}

function Customers() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("All")
  const [selected, setSelected] = useState(null)
  const [profileView, setProfileView] = useState(null)
  const [auditHistory, setAuditHistory] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState("")
  const [editCustomer, setEditCustomer] = useState(null)
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "", reason: "" })
  const [loadForm, setLoadForm] = useState({ amount: "", reason: "" })
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState("")

  const fetchCustomers = async () => {
    setLoading(true)
    setFetchError("")

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          phone,
          role,
          status,
          created_at,
          updated_at
        `)
        .eq("role", "CUSTOMER")
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setCustomers((data || []).map(normalizeCustomer))
    } catch (error) {
      setCustomers([])
      setFetchError(error.message || "Unable to load customers from Supabase.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    let isMounted = true

    const fetchAuditHistory = async () => {
      if (!profileView?.id) {
        setAuditHistory([])
        setAuditError("")
        setAuditLoading(false)
        return
      }

      setAuditLoading(true)
      setAuditError("")

      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select(`
            id,
            actor_user_id,
            action,
            target_type,
            target_id,
            details,
            created_at
          `)
          .eq("target_type", "CUSTOMER")
          .eq("target_id", profileView.id)
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        if (!isMounted) return
        setAuditHistory(data || [])
      } catch (error) {
        if (!isMounted) return
        setAuditHistory([])
        setAuditError(error.message || "Unable to load audit history.")
      } finally {
        if (isMounted) {
          setAuditLoading(false)
        }
      }
    }

    fetchAuditHistory()

    return () => {
      isMounted = false
    }
  }, [profileView?.id])

  const loadCustomer = ({ customerId, amount, reason }) => {
    const value = Number(amount)
    const customer = customers.find((item) => item.id === customerId)

    if (!customer) return { ok: false, error: "Select a customer." }
    if (!Number.isFinite(value) || value <= 0) {
      return { ok: false, error: "Enter a valid amount greater than zero." }
    }

    setCustomers((current) =>
      current.map((item) =>
        item.id === customerId ? { ...item, balance: item.balance + value } : item
      )
    )

    return {
      ok: true,
      note: `Loaded ${value.toLocaleString()} BP to ${customer.name} for ${reason || "customer load"}.`,
    }
  }

  const filtered = customers.filter(
    (customer) =>
      (status === "All" || customer.status === status) &&
      [customer.name, customer.email, customer.phone, customer.id, customer.cardId]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
  )

  const handleStatusUpdate = async (customer, nextLabel, reason) => {
    const nextStatus = getNextStatus(nextLabel)
    const trimmedReason = (reason || "").trim()

    try {
      const { error } = await supabase.rpc("admin_update_customer_status", {
        p_customer_id: customer.id,
        p_new_status: nextStatus,
        p_reason: trimmedReason || "No reason provided",
      })

      if (error) {
        throw error
      }

      await fetchCustomers()
      setConfirm(null)
      setToast({ message: `Customer status updated to ${nextStatus}.`, tone: "success" })
    } catch (error) {
      setToast({
        message: error.message || "Unable to update customer status.",
        tone: "error",
      })
    }
  }

  const askStatus = (customer, nextLabel) => {
    setConfirm({
      customer,
      nextLabel,
      reason: "",
      title: `${nextLabel === "Soft Delete" ? "Soft delete" : nextLabel} customer?`,
      description: `${customer.name} will be marked ${getNextStatus(nextLabel)}. This action is validated by the database and recorded in the audit log.`,
      label: nextLabel,
      destructive: ["Soft Delete", "Suspend", "Freeze", "Close"].includes(nextLabel),
    })
  }

  const submitLoad = () => {
    const result = loadCustomer({
      customerId: selected.id,
      amount: loadForm.amount,
      reason: loadForm.reason,
    })

    if (!result.ok) {
      setToast({ message: result.error, tone: "error" })
      return
    }

    setSelected(null)
    setLoadForm({ amount: "", reason: "" })
    setToast({ message: result.note || "BuzzPoints loaded.", tone: "success" })
  }

  const openEditCustomer = (customer) => {
    setEditCustomer(customer)
    setEditForm({
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone && customer.phone !== "Not available" ? String(customer.phone).trim() : "",
      reason: "",
    })
  }

  const saveCustomerProfile = async () => {
    if (!editCustomer) return

    const firstName = (editForm.firstName || "").trim()
    const lastName = (editForm.lastName || "").trim()
    const phone = (editForm.phone || "").trim()
    const reason = (editForm.reason || "").trim()

    if (!firstName) {
      setToast({ message: "First name cannot be empty.", tone: "error" })
      return
    }

    if (!lastName) {
      setToast({ message: "Last name cannot be empty.", tone: "error" })
      return
    }

    try {
      const { error } = await supabase.rpc("admin_update_customer_profile", {
        p_customer_id: editCustomer.id,
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone,
        p_reason: reason,
      })

      if (error) {
        throw error
      }

      await fetchCustomers()
      setEditCustomer(null)
      setEditForm({ firstName: "", lastName: "", phone: "", reason: "" })
      setToast({ message: "Customer profile updated successfully.", tone: "success" })
    } catch (error) {
      setToast({
        message: error.message || "Unable to update customer profile.",
        tone: "error",
      })
    }
  }

  const actions = (customer) => {
    if (customer.status === "ACTIVE") return ["Suspend", "Freeze", "Close", "Soft Delete"]
    if (customer.status === "SUSPENDED") return ["Reactivate", "Freeze", "Close", "Soft Delete"]
    if (customer.status === "FROZEN") return ["Reactivate", "Suspend", "Close", "Soft Delete"]
    if (customer.status === "CLOSED") return ["Reactivate", "Soft Delete"]
    if (customer.status === "DELETED") return ["Reactivate"]
    return []
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-bold tracking-[0.25em] text-yellow-400">CUSTOMER MANAGEMENT</p>
        <h1 className="mt-2 text-4xl font-bold">Customers</h1>
        <p className="mt-2 text-gray-500">Manage customer identity, cards, balances, and lifecycle status.</p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone, customer ID, NFC card ID"
            className="flex-1 rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm outline-none focus:border-yellow-400"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#080808] px-3 py-2 text-sm"
          >
            <option>All</option>
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-dashed border-yellow-400/30 bg-[#111111] px-6 py-5 text-center text-sm text-yellow-400">
          Loading customers from Supabase...
        </div>
      )}

      {!loading && fetchError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-4 text-sm text-red-300">
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#111111]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-5 py-4">Customer</th>
                <th>Contact</th>
                <th>NFC Card</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{customer.name}</p>
                    <p className="mt-1 font-mono text-xs text-gray-600">{customer.id}</p>
                    <p className="mt-1 text-xs text-gray-600">Joined {customer.joined}</p>
                  </td>
                  <td className="text-gray-400">
                    <p>{customer.email}</p>
                    <p className="mt-1 text-xs text-gray-600">{customer.phone}</p>
                  </td>
                  <td className="font-mono text-gray-400">{customer.cardId}</td>
                  <td className="font-semibold text-yellow-400">{customer.balance.toLocaleString()} BP</td>
                  <td>
                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-gray-300">
                      {customer.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setProfileView(customer)}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCustomer(customer)}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(customer)
                          setLoadForm({ amount: "", reason: "" })
                        }}
                        className="text-xs text-yellow-400"
                      >
                        Load BP
                      </button>
                      {actions(customer).map((nextLabel) => (
                        <button
                          key={nextLabel}
                          type="button"
                          onClick={() => askStatus(customer, nextLabel)}
                          className="text-xs text-red-400"
                        >
                          {nextLabel}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && <p className="py-12 text-center text-sm text-gray-500">No customers found.</p>}
        </div>
      )}

      {selected && (
        <Modal title={`Load ${selected.name}`} onClose={() => setSelected(null)}>
          <p className="text-sm text-gray-500">This mock load updates the shared treasury and customer balance.</p>
          <label className="mt-5 block text-sm text-gray-400">
            Amount
            <input
              type="number"
              min="1"
              value={loadForm.amount}
              onChange={(event) => setLoadForm({ ...loadForm, amount: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="mt-4 block text-sm text-gray-400">
            Reason
            <input
              value={loadForm.reason}
              onChange={(event) => setLoadForm({ ...loadForm, reason: event.target.value })}
              className={inputClass}
            />
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setSelected(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300">
              Cancel
            </button>
            <button onClick={submitLoad} className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black">
              Confirm Load
            </button>
          </div>
        </Modal>
      )}

      {profileView && (
        <Modal title="Customer Profile" onClose={() => setProfileView(null)} wide>
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-white/10 pb-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400/10 text-lg font-semibold text-yellow-400">
                {getInitials(profileView.name)}
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white">{profileView.name}</h3>
                <p className="text-sm text-gray-400">{formatRole(profileView.role)}</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Account Information</h4>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Full Name</p>
                    <p className="mt-1 font-medium text-white">{profileView.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Customer ID</p>
                    <p className="mt-1 font-mono text-white">{profileView.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Account Status</p>
                    <p className="mt-1 text-white">{profileView.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date Registered</p>
                    <p className="mt-1 text-white">{formatDisplayDate(profileView.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p className="mt-1 text-white">{formatDisplayDate(profileView.updatedAt)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Contact Information</h4>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="mt-1 text-white">{profileView.phone || "Not available"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Role</p>
                    <p className="mt-1 text-white">{formatRole(profileView.role)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Audit History</h4>
              </div>

              {auditLoading && (
                <div className="rounded-xl border border-dashed border-yellow-400/30 bg-[#111111] px-4 py-3 text-sm text-yellow-400">
                  Loading audit history...
                </div>
              )}

              {!auditLoading && auditError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                  {auditError}
                </div>
              )}

              {!auditLoading && !auditError && auditHistory.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 bg-[#111111] px-4 py-3 text-sm text-gray-400">
                  No audit history available for this customer.
                </div>
              )}

              {!auditLoading && !auditError && auditHistory.length > 0 && (
                <div className="space-y-3">
                  {auditHistory.map((audit) => {
                    const summary = extractAuditSummary(audit)
                    const actor = audit.actor_user_id ? "Administrator" : "Administrator"

                    return (
                      <div key={audit.id} className="rounded-xl border border-white/10 bg-[#111111] p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{formatAuditLabel(audit.action)}</p>
                            <p className="mt-1 text-xs text-gray-500">{actor}</p>
                          </div>
                          <p className="text-xs text-gray-500">{formatDisplayDate(audit.created_at)}</p>
                        </div>

                        <div className="mt-3 space-y-2 text-sm text-gray-300">
                          {summary.primary && (
                            <p>
                              <span className="text-gray-500">Change:</span> {summary.primary}
                            </p>
                          )}

                          {summary.secondary && (
                            <p>
                              <span className="text-gray-500">Reason:</span> {summary.secondary}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {editCustomer && (
        <Modal title="Edit Customer Profile" onClose={() => setEditCustomer(null)} wide>
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-gray-300">
                First Name
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(event) => setEditForm({ ...editForm, firstName: event.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-gray-300">
                Last Name
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(event) => setEditForm({ ...editForm, lastName: event.target.value })}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block text-sm text-gray-300">
              Phone
              <input
                type="text"
                value={editForm.phone}
                onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
                className={inputClass}
                placeholder="Optional"
              />
            </label>

            <label className="block text-sm text-gray-300">
              Reason
              <input
                type="text"
                value={editForm.reason}
                onChange={(event) => setEditForm({ ...editForm, reason: event.target.value })}
                className={inputClass}
                placeholder="Optional"
              />
            </label>

            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setEditCustomer(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300">
                Cancel
              </button>
              <button type="button" onClick={saveCustomerProfile} className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black">
                Save Changes
              </button>
            </div>
          </div>
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
            await handleStatusUpdate(confirm.customer, confirm.nextLabel, reason)
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
              placeholder="Add a reason for this status change"
            />
          </label>
        </ConfirmModal>
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  )
}

export default Customers
