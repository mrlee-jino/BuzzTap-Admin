import { useEffect, useState } from "react"
import { useAdminData } from "../context/AdminDataContext"
import Modal from "../components/Modal"
import ConfirmModal from "../components/ConfirmModal"
import Toast from "../components/Toast"
import { supabase } from "../lib/supabaseClient"

const cardClass = "rounded-2xl border border-white/10 bg-[#111111] p-5"
const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
const emptyForm = { amount: "", reason: "", reference: "", notes: "", customerId: "", businessId: "" }
const highlightedPurchaseRequestId = "05769257-c1c4-42ba-ac00-e643a8d6df4b"

function BuzzPointTreasury() {
  const { MAX_SUPPLY, treasury, metrics, ledger, businesses, customers, settlementRequests, issueBuzzPoints, loadCustomer, purchaseBusiness, updateSettlement, requestSettlementInformation } = useAdminData()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  const [ledgerSearch, setLedgerSearch] = useState("")
  const [ledgerType, setLedgerType] = useState("All")
  const [mockTransferConfirmed, setMockTransferConfirmed] = useState(false)
  const [purchaseRequests, setPurchaseRequests] = useState([])
  const [purchaseRequestsLoading, setPurchaseRequestsLoading] = useState(true)
  const [purchaseRequestsError, setPurchaseRequestsError] = useState("")

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
  const submit = (operation, message) => {
    if (!form.amount || Number(form.amount) <= 0 || !form.reason) return setToast({ message: "Enter a positive amount and reason.", tone: "error" })
    if (modal === "purchase" && !mockTransferConfirmed) return setToast({ message: "Confirm the demo bank transfer before recording this purchase.", tone: "error" })
    const result = operation(form)
    if (!result.ok) return setToast({ message: result.error, tone: "error" })
    close(); setToast({ message })
  }
  const filteredLedger = ledger.filter((item) => (ledgerType === "All" || item.type === ledgerType) && `${item.id} ${item.destination} ${item.reason}`.toLowerCase().includes(ledgerSearch.toLowerCase()))
  const confirmSettlement = (request, status) => setConfirm({ title: `${status === "APPROVED" ? "Approve" : "Reject"} settlement?`, description: `${request.businessName} requested ${request.amount.toLocaleString()} BuzzPoints.`, label: status === "APPROVED" ? "Approve" : "Reject", action: () => { updateSettlement(request.id, status); setConfirm(null); setToast({ message: `Settlement ${status.toLowerCase()}.` }) } })

  return <div className="space-y-8">
    <header><p className="text-sm font-bold tracking-[0.25em] text-yellow-400">TREASURY</p><h1 className="mt-2 text-4xl font-bold">BuzzPoint Treasury</h1><p className="mt-2 text-gray-500">No live treasury data is available.</p></header>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: "Maximum Supply", value: MAX_SUPPLY }, { label: "Issued", value: treasury.issued }, { label: "Available", value: metrics.available }, { label: "In Circulation", value: metrics.circulation }, { label: "Reserved", value: treasury.reserved }, { label: "Business Holdings", value: metrics.businessHoldings }, { label: "Customer Holdings", value: metrics.customerHoldings }, { label: "Pending Settlement", value: treasury.pendingSettlement }].map((item) => <div className={cardClass} key={item.label}><p className="text-sm text-gray-500">{item.label}</p><p className="mt-3 text-2xl font-bold text-white">{item.value.toLocaleString()}</p><p className="mt-1 text-xs text-yellow-400">BuzzPoints</p></div>)}
    </div>
    {metrics.mismatch !== 0 && <div className="rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">Reconciliation warning: holdings differ from issued supply by {Math.abs(metrics.mismatch).toLocaleString()} BuzzPoints.</div>}
    <div className="flex flex-wrap gap-3"><button onClick={() => open("issue")} className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300">Issue BuzzPoints</button><button onClick={() => open("load")} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:border-yellow-400/40 hover:text-white">Load Customer</button><button onClick={() => open("purchase")} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:border-yellow-400/40 hover:text-white">Business Purchase</button></div>
    <section className={cardClass}><div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Ledger</h2><p className="mt-1 text-sm text-gray-500">Live ledger entries will appear here when connected.</p></div><div className="flex gap-2"><input aria-label="Search ledger" value={ledgerSearch} onChange={(event) => setLedgerSearch(event.target.value)} placeholder="Search ledger" className="rounded-xl border border-white/10 bg-[#080808] px-3 py-2 text-sm outline-none focus:border-yellow-400"/><select aria-label="Filter ledger type" value={ledgerType} onChange={(event) => setLedgerType(event.target.value)} className="rounded-xl border border-white/10 bg-[#080808] px-3 py-2 text-sm"><option>All</option><option>ISSUE</option><option>CUSTOMER_LOAD</option><option>BUSINESS_PURCHASE</option></select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-gray-600"><tr><th className="py-4">ID</th><th>Type</th><th>Amount</th><th>Destination</th><th>Reason</th><th>Created</th></tr></thead><tbody className="divide-y divide-white/5">{filteredLedger.map((item) => <tr key={item.id}><td className="py-4 font-mono text-gray-400">{item.id}</td><td className="text-yellow-400">{item.type}</td><td>{item.amount.toLocaleString()}</td><td className="text-gray-400">{item.destination}</td><td className="text-gray-400">{item.reason}</td><td className="text-gray-500">{item.createdAt}</td></tr>)}</tbody></table>{filteredLedger.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No ledger entries match.</p>}</div></section>
    <section className={cardClass}><div className="mb-3"><h2 className="font-semibold">Settlement Requests</h2><p className="mt-1 text-sm text-gray-500">Review requests before a future real settlement integration.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-gray-600"><tr><th className="py-3">Request</th><th>Business</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody className="divide-y divide-white/5">{settlementRequests.map((request) => <tr key={request.id}><td className="py-4 font-mono text-gray-400">{request.id}</td><td>{request.businessName}</td><td>{request.amount.toLocaleString()}</td><td><span className="rounded-full bg-yellow-400/10 px-2 py-1 text-xs text-yellow-400">{request.status}</span></td><td className="flex gap-2 py-3">{request.status === "PENDING" ? <><button onClick={() => setToast({ message: `${request.id} viewed.` })} className="text-xs text-gray-400 hover:text-white">View</button><button onClick={() => requestSettlementInformation(request.id)} className="text-xs text-orange-400">Request Information</button><button onClick={() => confirmSettlement(request, "APPROVED")} className="text-xs text-yellow-400">Approve</button><button onClick={() => confirmSettlement(request, "REJECTED")} className="text-xs text-red-400">Reject</button></> : <span className="text-xs text-gray-600">{request.status}</span>}</td></tr>)}</tbody></table></div></section>
    <section className={cardClass} aria-labelledby="purchase-requests-title">
      <div className="mb-4 border-b border-white/10 pb-4">
        <h2 id="purchase-requests-title" className="font-semibold">BuzzPoints Purchase Requests</h2>
        <p className="mt-1 text-sm text-gray-500">Requests from businesses to purchase BuzzPoints. These rows are not payment confirmations and do not credit points.</p>
      </div>
      {purchaseRequestsError && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">Unable to load purchase requests: {purchaseRequestsError}</p>}
      {!purchaseRequestsLoading && !purchaseRequestsError && !purchaseRequests.some((request) => request.id === highlightedPurchaseRequestId) && (
        <p role="status" className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-100/80">
          Target request {highlightedPurchaseRequestId} is not visible to this admin session. It may not exist or row-level security may hide it.
        </p>
      )}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {purchaseRequests.map((request) => (
                <tr key={request.id} className={`align-top ${request.id === highlightedPurchaseRequestId ? "bg-yellow-400/10 ring-1 ring-inset ring-yellow-400/40" : ""}`}>
                  <td className="py-4 pr-4 font-mono text-xs text-gray-300">
                    <span className="break-all">{request.id}</span>
                    {request.id === highlightedPurchaseRequestId && <span className="mt-1 block font-sans font-semibold text-yellow-300">Target request</span>}
                  </td>
                  <td className="pr-4 font-mono text-xs text-gray-400">{request.reference || "—"}</td>
                  <td className="pr-4 text-gray-200">{request.businessName || request.business_id}</td>
                  <td className="whitespace-nowrap pr-4 font-medium text-yellow-300">{Number(request.amount || 0).toLocaleString()} BP</td>
                  <td className="max-w-xs whitespace-pre-wrap pr-4 text-gray-400">{request.notes || "—"}</td>
                  <td className="pr-4"><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-300">{request.status || "Unknown"}</span></td>
                  <td className="break-all pr-4 font-mono text-xs text-gray-400">{request.created_by || "—"}</td>
                  <td className="whitespace-nowrap text-gray-500">{request.created_at ? new Date(request.created_at).toLocaleString() : "—"}</td>
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
        <p className="mb-4 text-sm text-gray-500">Prototype operation. Supply checks apply; no real funds move.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {modal === "load" && (
            <label className="text-sm text-gray-400">Customer
              <select value={form.customerId} onChange={(event) => field("customerId", event.target.value)} className={inputClass}>
                <option value="">Select customer</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} ({customer.id})</option>)}
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
            <input type="number" min="1" value={form.amount} onChange={(event) => field("amount", event.target.value)} className={inputClass} />
          </label>
          <label className="text-sm text-gray-400">Reason
            <input value={form.reason} onChange={(event) => field("reason", event.target.value)} className={inputClass} />
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
            disabled={modal === "purchase" && !mockTransferConfirmed}
            onClick={() => modal === "issue" ? submit(issueBuzzPoints, "BuzzPoints issued.") : modal === "load" ? submit(loadCustomer, "Customer loaded.") : submit(purchaseBusiness, "Demo business purchase recorded.")}
            className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {modal === "purchase" ? "Confirm demo purchase" : "Confirm"}
          </button>
        </div>
      </Modal>
    )}
    {confirm && <ConfirmModal title={confirm.title} description={confirm.description} confirmLabel={confirm.label} onConfirm={confirm.action} onClose={() => setConfirm(null)} destructive={confirm.label === "Reject"}/>} {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)}/>} 
  </div>
}

export default BuzzPointTreasury
