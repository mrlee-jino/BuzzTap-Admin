import { useEffect, useState } from "react"
import { useAdminData } from "../context/AdminDataContext"
import Modal from "../components/Modal"
import ConfirmModal from "../components/ConfirmModal"
import Toast from "../components/Toast"
import { supabase } from "../lib/supabaseClient"

const cardClass = "rounded-2xl border border-white/10 bg-[#111111] p-5"
const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
const emptyForm = { amount: "", reason: "", reference: "", notes: "", customerId: "", businessId: "" }

const mergeBpLedger = (customerRows, businessRows) => [
  ...(customerRows || []).map((item) => ({
    ...item,
    flow: "Customer load",
    recipientName: Array.isArray(item.customer) ? item.customer[0]?.full_name : item.customer?.full_name,
  })),
  ...(businessRows || []).map((item) => ({
    ...item,
    flow: "Business purchase",
    recipientName: Array.isArray(item.business) ? item.business[0]?.name : item.business?.name,
  })),
].sort((first, second) => new Date(second.created_at) - new Date(first.created_at))

function BuzzPointTreasury() {
  const { businesses, issueBuzzPoints, purchaseBusiness } = useAdminData()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  const [ledgerSearch, setLedgerSearch] = useState("")
  const [mockTransferConfirmed, setMockTransferConfirmed] = useState(false)
  const [purchaseRequests, setPurchaseRequests] = useState([])
  const [purchaseRequestsLoading, setPurchaseRequestsLoading] = useState(true)
  const [purchaseRequestsError, setPurchaseRequestsError] = useState("")
  const [reviewingPurchaseRequestId, setReviewingPurchaseRequestId] = useState(null)
  const [bpSummary, setBpSummary] = useState(null)
  const [bpSummaryError, setBpSummaryError] = useState("")
  const [bpSummaryLoading, setBpSummaryLoading] = useState(true)
  const [bpLedger, setBpLedger] = useState([])
  const [bpLedgerError, setBpLedgerError] = useState("")
  const [activeCustomers, setActiveCustomers] = useState([])
  const [customerLoadError, setCustomerLoadError] = useState("")
  const [loadingBp, setLoadingBp] = useState(false)

  const refreshBpSummary = async () => {
    setBpSummaryLoading(true)
    const [summaryResult, customerLedgerResult, businessLedgerResult] = await Promise.all([
      supabase.rpc("admin_get_bp_treasury_summary"),
      supabase.from("bp_wallet_ledger")
        .select("id, customer_id, amount, reason, reference, transaction_code, created_at, customer:profiles!bp_wallet_ledger_customer_id_fkey(full_name)")
        .order("created_at", { ascending: false }),
      supabase.from("bp_business_wallet_ledger")
        .select("id, business_id, amount, reason, reference, transaction_code, created_at, business:businesses!bp_business_wallet_ledger_business_id_fkey(name)")
        .order("created_at", { ascending: false }),
    ])

    if (summaryResult.error) {
      setBpSummaryError(summaryResult.error.message || "Unable to load BP treasury balance.")
      setBpSummary(null)
    } else {
      setBpSummaryError("")
      setBpSummary(summaryResult.data)
    }
    const ledgerError = customerLedgerResult.error || businessLedgerResult.error
    setBpLedgerError(ledgerError?.message || "")
    setBpLedger(mergeBpLedger(customerLedgerResult.data, businessLedgerResult.data))

    setBpSummaryLoading(false)
  }

  useEffect(() => {
    let active = true

    async function loadTreasuryData() {
      const [summaryResult, customersResult, customerLedgerResult, businessLedgerResult] = await Promise.all([
        supabase.rpc("admin_get_bp_treasury_summary"),
        supabase.from("profiles").select("id, full_name").eq("role", "CUSTOMER").eq("status", "ACTIVE").order("full_name"),
        supabase.from("bp_wallet_ledger")
          .select("id, customer_id, amount, reason, reference, transaction_code, created_at, customer:profiles!bp_wallet_ledger_customer_id_fkey(full_name)")
          .order("created_at", { ascending: false }),
        supabase.from("bp_business_wallet_ledger")
          .select("id, business_id, amount, reason, reference, transaction_code, created_at, business:businesses!bp_business_wallet_ledger_business_id_fkey(name)")
          .order("created_at", { ascending: false }),
      ])

      if (!active) return

      if (summaryResult.error) {
        setBpSummaryError(summaryResult.error.message || "Unable to load BP treasury balance.")
        setBpSummary(null)
      } else {
        setBpSummaryError("")
        setBpSummary(summaryResult.data)
      }
      if (customersResult.error) {
        setCustomerLoadError(customersResult.error.message || "Unable to load active customers.")
      } else {
        setCustomerLoadError("")
        setActiveCustomers(customersResult.data || [])
      }
      const ledgerError = customerLedgerResult.error || businessLedgerResult.error
      setBpLedgerError(ledgerError?.message || "")
      setBpLedger(mergeBpLedger(customerLedgerResult.data, businessLedgerResult.data))
      setBpSummaryLoading(false)
    }

    loadTreasuryData().catch((error) => {
      if (!active) return
      setBpSummaryError(error.message || "Unable to load BP treasury data.")
      setBpSummaryLoading(false)
    })

    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true

    async function loadPurchaseRequests() {
      setPurchaseRequestsLoading(true)
      setPurchaseRequestsError("")

      const { data, error } = await supabase
        .from("purchase_requests")
        .select("id, business_id, amount, reference, notes, status, created_by, created_at, business:businesses(name)")
        .order("created_at", { ascending: false })

      if (error) {
        if (active) {
          setPurchaseRequestsError(error.message || "Unable to load BuzzPoints purchase requests.")
          setPurchaseRequests([])
          setPurchaseRequestsLoading(false)
        }
        return
      }

      if (!active) return

      setPurchaseRequests((data || []).map((request) => ({
        ...request,
        businessName: Array.isArray(request.business) ? request.business[0]?.name : request.business?.name,
      })))
      setPurchaseRequestsLoading(false)
    }

    loadPurchaseRequests().catch((error) => {
      if (active) {
        setPurchaseRequestsError(error.message || "Unable to load BuzzPoints purchase requests.")
        setPurchaseRequestsLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [])

  const open = (type) => {
    setForm({ ...emptyForm, reference: type === "purchase" ? `DEMO-BP-${Date.now()}` : "" })
    setMockTransferConfirmed(false)
    setModal(type)
  }
  const close = () => { setModal(null); setMockTransferConfirmed(false) }
  const field = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (operation, message) => {
    if (!form.amount || Number(form.amount) <= 0 || !form.reason) return setToast({ message: "Enter a positive amount and reason.", tone: "error" })
    if (!Number.isSafeInteger(Number(form.amount))) return setToast({ message: "BP amount must be a whole number.", tone: "error" })
    if (modal === "purchase" && !mockTransferConfirmed) return setToast({ message: "Confirm the demo bank transfer before recording this purchase.", tone: "error" })

    if (modal === "load") {
      if (!form.customerId) return setToast({ message: "Select an active customer.", tone: "error" })

      setLoadingBp(true)
      try {
        const { data, error } = await supabase.rpc("admin_load_customer_bp", {
          p_customer_id: form.customerId,
          p_amount: Number(form.amount),
          p_reason: form.reason.trim(),
          p_reference: form.reference.trim() || null,
          p_notes: form.notes.trim() || null,
        })

        if (error) throw error

        close()
        await refreshBpSummary()
        setToast({ message: `${Number(form.amount).toLocaleString()} BP loaded. Customer balance: ${Number(data?.customer_balance || 0).toLocaleString()} BP.`, tone: "success" })
      } catch (error) {
        setToast({ message: error.message || "Unable to load BP to this customer.", tone: "error" })
      } finally {
        setLoadingBp(false)
      }
      return
    }

    const result = operation(form)
    if (!result.ok) return setToast({ message: result.error, tone: "error" })
    close(); setToast({ message })
  }
  const filteredLedger = bpLedger.filter((item) => `${item.transaction_code} ${item.recipientName || item.customer_id || item.business_id} ${item.reason}`.toLowerCase().includes(ledgerSearch.toLowerCase()))

  const openPurchaseRequestReview = (request, decision) => {
    const isApproval = decision === "APPROVED"
    setConfirm({
      request,
      decision,
      title: `${isApproval ? "Approve and credit" : "Reject"} purchase request?`,
      description: isApproval
        ? `${request.businessName || "This business"} requested ${Number(request.amount || 0).toLocaleString()} BP. Approval deducts this amount from the reserve, credits the business BP wallet, and records the transaction. Verify payment before approving.`
        : `${request.businessName || "This business"} requested ${Number(request.amount || 0).toLocaleString()} BP. Rejecting only changes the request status.`,
      label: isApproval ? "Approve & Credit" : "Reject Request",
      destructive: !isApproval,
    })
  }

  const reviewPurchaseRequest = async () => {
    if (!confirm?.request || !confirm?.decision) return

    const requestToReview = confirm.request
    const decision = confirm.decision
    setConfirm(null)
    setReviewingPurchaseRequestId(requestToReview.id)

    try {
      const { data, error } = await supabase.rpc("admin_review_purchase_request", {
        p_request_id: requestToReview.id,
        p_decision: decision,
      })

      if (error) throw error

      setPurchaseRequests((current) => current.map((request) => request.id === requestToReview.id
        ? { ...request, status: data?.status || decision }
        : request))
      if (decision === "APPROVED") {
        await refreshBpSummary()
        setToast({ message: `${Number(requestToReview.amount).toLocaleString()} BP credited to ${requestToReview.businessName || "the business"}. Business balance: ${Number(data?.business_balance || 0).toLocaleString()} BP; reserve: ${Number(data?.treasury_available || 0).toLocaleString()} BP.`, tone: "success" })
      } else {
        setToast({ message: "Purchase request rejected.", tone: "success" })
      }
    } catch (error) {
      setToast({ message: error.message || "Unable to update this purchase request.", tone: "error" })
    } finally {
      setReviewingPurchaseRequestId(null)
    }
  }

  return <div className="space-y-8">
    <header><p className="text-sm font-bold tracking-[0.25em] text-yellow-400">TREASURY</p><h1 className="mt-2 text-4xl font-bold">BuzzPoint Treasury</h1><p className="mt-2 text-gray-500">Customer loads and approved business purchases transfer BP from the reserve into wallet balances and are recorded in the transaction and audit history.</p></header>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[{ label: "Initial BP Supply", value: bpSummary?.initial_supply }, { label: "Loaded from Reserve", value: bpSummary?.total_loaded }, { label: "Available Reserve", value: bpSummary?.available_balance }, { label: "Customer Wallet Balances", value: bpSummary?.customer_balance_total }, { label: "Business Wallet Balances", value: bpSummary?.business_balance_total }].map((item) => <div className={cardClass} key={item.label}><p className="text-sm text-gray-500">{item.label}</p><p className="mt-3 text-2xl font-bold text-white">{bpSummaryLoading ? "Loading..." : item.value == null ? "—" : Number(item.value).toLocaleString()}</p><p className="mt-1 text-xs text-yellow-400">BuzzPoints</p></div>)}
    </div>
    {bpSummaryError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">{bpSummaryError}. Apply the BP load migration and refresh.</div>}
    <div className="flex flex-wrap gap-3"><button onClick={() => open("issue")} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300">Issue BuzzPoints</button><button onClick={() => open("load")} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:border-yellow-400/40 hover:text-white">Load Customer</button><button onClick={() => open("purchase")} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:border-yellow-400/40 hover:text-white">Business Purchase</button></div>
    <section className={cardClass} aria-labelledby="bp-ledger-title">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="bp-ledger-title" className="font-semibold">BP Treasury Ledger</h2>
          <p className="mt-1 text-sm text-gray-500">Completed reserve transfers to customer and business wallets.</p>
        </div>
        <input aria-label="Search BP ledger" value={ledgerSearch} onChange={(event) => setLedgerSearch(event.target.value)} placeholder="Search recipient, reference, or reason" className="rounded-xl border border-white/10 bg-[#080808] px-3 py-2 text-sm outline-none focus:border-yellow-400" />
      </div>
      {bpLedgerError && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">{bpLedgerError}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-gray-600"><tr><th className="py-4">Transaction</th><th>Flow</th><th>Recipient</th><th>Amount</th><th>Reason</th><th>Created</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {filteredLedger.map((item) => (
              <tr key={item.id}>
                <td className="py-4 font-mono text-xs text-gray-400">{item.transaction_code}</td>
                <td className="text-gray-400">{item.flow}</td>
                <td className="text-gray-200">{item.recipientName || item.customer_id || item.business_id}</td>
                <td className="font-semibold text-yellow-400">{Number(item.amount).toLocaleString()} BP</td>
                <td className="text-gray-400">{item.reason}</td>
                <td className="text-gray-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!bpLedgerError && filteredLedger.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No BP loads match.</p>}
      </div>
    </section>
    <section className={cardClass} aria-labelledby="purchase-requests-title">
      <div className="mb-4 border-b border-white/10 pb-4">
        <h2 id="purchase-requests-title" className="font-semibold">BuzzPoints Purchase Requests</h2>
        <p className="mt-1 text-sm text-gray-500">Confirm or reject request status. Confirmation does not process payment or issue BP.</p>
      </div>
      {purchaseRequestsError && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">Unable to load purchase requests: {purchaseRequestsError}</p>}
      {purchaseRequestsLoading ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading BuzzPoints purchase requests...</p>
      ) : purchaseRequests.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-3 pr-4">Request ID</th>
                <th className="py-3 pr-4">Reference</th>
                <th className="pr-4">Business</th>
                <th className="pr-4">Requested BP</th>
                <th className="pr-4">Notes</th>
                <th className="pr-4">Status</th>
                <th className="pr-4">Created by</th>
                <th>Created</th>
                <th className="px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {purchaseRequests.map((request) => (
                <tr key={request.id} className="align-top">
                  <td className="py-4 pr-4 font-mono text-xs text-gray-300">
                    <span className="break-all">{request.id}</span>
                  </td>
                  <td className="pr-4 font-mono text-xs text-gray-400">{request.reference || "—"}</td>
                  <td className="pr-4 text-gray-200">{request.businessName || request.business_id}</td>
                  <td className="whitespace-nowrap pr-4 font-medium text-yellow-300">{Number(request.amount || 0).toLocaleString()} BP</td>
                  <td className="max-w-xs whitespace-pre-wrap pr-4 text-gray-400">{request.notes || "—"}</td>
                  <td className="pr-4"><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-300">{request.status || "Unknown"}</span></td>
                  <td className="break-all pr-4 font-mono text-xs text-gray-400">{request.created_by || "—"}</td>
                  <td className="whitespace-nowrap text-gray-500">{request.created_at ? new Date(request.created_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-4">
                    {["PENDING", "SUBMITTED"].includes(String(request.status || "").toUpperCase()) ? (
                      <div className="flex gap-3">
                        <button type="button" onClick={() => openPurchaseRequestReview(request, "APPROVED")} disabled={reviewingPurchaseRequestId === request.id} className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 disabled:opacity-50">Confirm</button>
                        <button type="button" onClick={() => openPurchaseRequestReview(request, "REJECTED")} disabled={reviewingPurchaseRequestId === request.id} className="text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-50">Reject</button>
                      </div>
                    ) : <span className="text-xs text-gray-500">Reviewed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !purchaseRequestsError ? (
        <p className="py-8 text-center text-sm text-gray-500">No BuzzPoints purchase requests found.</p>
      ) : null}
    </section>

      {modal && (
      <Modal wide title={modal === "issue" ? "Issue BuzzPoints" : modal === "load" ? "Load Customer" : "Business Purchase"} onClose={close}>
        <p className="mb-4 text-sm text-gray-500">{modal === "load" ? `Transfers BP from the treasury reserve. Available: ${Number(bpSummary?.available_balance || 0).toLocaleString()} BP.` : "Prototype operation. Supply checks apply; no real funds move."}</p>
        {modal === "load" && customerLoadError && <p role="alert" className="mb-4 text-sm text-red-300">{customerLoadError}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {modal === "load" && (
            <label className="text-sm text-gray-400">Customer
              <select value={form.customerId} onChange={(event) => field("customerId", event.target.value)} className={inputClass}>
                <option value="">Select customer</option>
                {activeCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name || "Unnamed Customer"}</option>)}
              </select>
            </label>
          )}
          {modal === "purchase" && (
            <label className="text-sm text-gray-400">Business
              <select value={form.businessId} onChange={(event) => field("businessId", event.target.value)} className={inputClass}>
                <option value="">Select business</option>
                {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
              </select>
            </label>
          )}
          <label className="text-sm text-gray-400">Amount (BuzzPoints)
            <input type="number" min="1" step="1" value={form.amount} onChange={(event) => field("amount", event.target.value)} className={inputClass} />
          </label>
          <label className="text-sm text-gray-400">Reason
            <input value={form.reason} onChange={(event) => field("reason", event.target.value)} className={inputClass} required />
          </label>
          {modal !== "purchase" && <>
            <label className="text-sm text-gray-400">Reference
              <input value={form.reference} onChange={(event) => field("reference", event.target.value)} className={inputClass} />
            </label>
            <label className="text-sm text-gray-400">Notes
              <input value={form.notes} onChange={(event) => field("notes", event.target.value)} className={inputClass} />
            </label>
          </>}
        </div>

        {modal === "purchase" && (
          <div className="mt-5 space-y-4">
            <section className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-yellow-200">Mock Bank Account</h3>
                <span className="rounded-full bg-yellow-400/10 px-2.5 py-1 text-[11px] font-bold text-yellow-300">DEMO ONLY</span>
              </div>
              <p className="mt-2 text-sm text-yellow-100/80">Do not send money. These demo identifiers are not valid banking details and no real transfer is processed.</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div><dt className="text-xs text-gray-500">Bank</dt><dd className="mt-1 text-sm text-white">BuzzTap Test Bank (Fictional)</dd></div>
                <div><dt className="text-xs text-gray-500">Account name</dt><dd className="mt-1 text-sm text-white">BuzzTap Treasury Demo</dd></div>
                <div><dt className="text-xs text-gray-500">Mock account ID</dt><dd className="mt-1 break-all font-mono text-sm text-white">DEMO-NOT-A-REAL-ACCOUNT</dd></div>
                <div><dt className="text-xs text-gray-500">Payment reference</dt><dd className="mt-1 break-all font-mono text-sm text-white">{form.reference}</dd></div>
              </dl>
              <p className="mt-4 border-t border-yellow-500/20 pt-3 text-sm text-gray-300">Demo payment amount: {Number(form.amount || 0).toLocaleString()} BuzzPoints. No currency conversion has been configured.</p>
            </section>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-3 text-sm text-gray-300">
              <input type="checkbox" checked={mockTransferConfirmed} onChange={(event) => setMockTransferConfirmed(event.target.checked)} className="mt-0.5 accent-yellow-400" />
              <span>I confirm this is a simulated bank transfer for testing only. No real payment was made.</span>
            </label>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={close} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300">Cancel</button>
          <button
            type="button"
            disabled={loadingBp || (modal === "purchase" && !mockTransferConfirmed)}
            onClick={() => modal === "issue" ? submit(issueBuzzPoints, "BuzzPoints issued.") : modal === "load" ? submit(null, "Customer loaded.") : submit(purchaseBusiness, "Demo business purchase recorded.")}
            className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingBp ? "Loading..." : modal === "purchase" ? "Confirm demo purchase" : modal === "load" ? "Confirm Load" : "Confirm"}
          </button>
        </div>
      </Modal>
    )}
    {confirm && <ConfirmModal title={confirm.title} description={confirm.description} confirmLabel={confirm.label} onConfirm={reviewPurchaseRequest} onClose={() => setConfirm(null)} destructive={confirm.destructive}/>} {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)}/>}
  </div>
}

export default BuzzPointTreasury
