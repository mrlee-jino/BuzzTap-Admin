import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { fetchAllRows } from "../lib/businessPerformance"
import { PAGE_SIZE, PAYMENT_STATES, DISPUTE_STATES, paymentState, paymentDuration, validExplanation, filterPayments, buildPaymentRisk } from "../lib/paymentOversight"
import Modal from "../components/Modal"
import Toast from "../components/Toast"

const panel = "rounded-2xl border border-white/10 bg-[#111111] p-5"
const input = "rounded-xl border border-white/15 bg-[#080808] px-3 py-2 text-sm text-white focus:border-yellow-400 outline-none"
const button = "rounded-xl border border-white/15 px-4 py-2 text-sm hover:border-yellow-400 disabled:opacity-40"
const date = (value) => value ? new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : "—"
const initial = { business: "", customer: "", state: "", from: "", to: "", minAge: "" }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function ErrorBox({ message }) { return message ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-300">{message}</p> : null }
function Field({ label, children }) { return <div className="min-w-0"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 break-words text-sm text-gray-200">{children ?? "—"}</dd></div> }
function Pager({ page, hasMore, busy, onPage }) { return <div className="flex items-center justify-end gap-3 pt-4 text-sm"><button className={button} disabled={!page || busy} onClick={() => onPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button className={button} disabled={!hasMore || busy} onClick={() => onPage(page + 1)}>Next</button></div> }
function useNow() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  return now
}

export default function PaymentOversight() {
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const tab = ["requests", "disputes", "controls", "risk"].includes(params.get("tab")) ? params.get("tab") : "requests"
  const [businesses, setBusinesses] = useState([])
  const [lookupError, setLookupError] = useState("")
  const [draft, setDraft] = useState(initial)
  const [filters, setFilters] = useState(initial)
  const [page, setPage] = useState(0)
  const [version, setVersion] = useState(0)
  const [rows, setRows] = useState([])
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState("")

  useEffect(() => {
    if (!["requests", "disputes"].includes(tab)) return
    const timer = window.setInterval(() => setVersion((v) => v + 1), 30000)
    return () => window.clearInterval(timer)
  }, [tab])

  useEffect(() => {
    let active = true
    fetchAllRows(() => supabase.from("businesses").select("id,name").order("name"))
      .then((data) => { if (active) { setBusinesses(data); setLookupError("") } })
      .catch(() => { if (active) setLookupError("Business list unavailable. Refresh to retry.") })
    return () => { active = false }
  }, [version])

  useEffect(() => {
    if (!["requests", "disputes"].includes(tab)) return
    let active = true
    async function load() {
      setBusy(true); setError(""); setRows([])
      try {
        const query = filterPayments(supabase.from(tab === "requests" ? "customer_payment_requests" : "customer_payment_disputes").select("*"), filters, tab === "disputes")
        const { data, error } = await query.order("created_at", { ascending: false }).order("id").range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        if (error) throw error
        if (active) { setRows(data.slice(0, PAGE_SIZE)); setMore(data.length > PAGE_SIZE) }
      } catch (error) { if (active) setError(error.message || "Payment records unavailable.") }
      finally { if (active) setBusy(false) }
    }
    load()
    return () => { active = false }
  }, [tab, filters, page, version])

  function switchTab(value) {
    setParams({ tab: value }); setPage(0); setDraft(initial); setFilters(initial); setRows([]); setSelected(null)
  }
  function apply(event) {
    event.preventDefault()
    if (draft.customer && !uuid.test(draft.customer.trim())) { setError("Enter the global customer profile UUID, not the business registration ID."); return }
    if (draft.from && draft.to && draft.from > draft.to) { setError("Start date must be on or before end date."); return }
    setFilters({ ...draft }); setPage(0); setVersion((v) => v + 1)
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold tracking-[0.2em] text-yellow-400">PAYMENT SUPPORT</p><h1 className="mt-2 text-4xl font-bold">Payment Oversight</h1><p className="mt-2 text-gray-400">Investigate customer approvals, review disputes, and manage business points payments.</p></div><button className={button} onClick={() => setVersion((v) => v + 1)}>Refresh</button></header>
    <nav aria-label="Payment support sections" className="flex flex-wrap gap-2">{[["requests", "Payment explorer"], ["disputes", "Dispute queue"], ["controls", "Payment controls"], ["risk", "Risk monitoring"]].map(([value, name]) => <button key={value} onClick={() => switchTab(value)} aria-pressed={tab === value} className={`${button} ${tab === value ? "bg-yellow-400 text-black" : "text-gray-300"}`}>{name}</button>)}</nav>
    <ErrorBox message={lookupError} />
    {["requests", "disputes"].includes(tab) && <>
      <form onSubmit={apply} className={`${panel} grid gap-3 sm:grid-cols-2 xl:grid-cols-4`}>
        <label className="grid gap-1 text-xs text-gray-400">Business<select className={input} value={draft.business} onChange={(e) => setDraft({ ...draft, business: e.target.value })}><option value="">All businesses</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs text-gray-400">Global customer profile UUID<input className={input} value={draft.customer} onChange={(e) => setDraft({ ...draft, customer: e.target.value })} placeholder="Customer Auth UUID" /></label>
        <label className="grid gap-1 text-xs text-gray-400">State<select className={input} value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })}><option value="">All states</option>{tab === "disputes" && <option value="UNRESOLVED">Open + under review</option>}{(tab === "requests" ? PAYMENT_STATES : DISPUTE_STATES).map((s) => <option key={s}>{s}</option>)}</select></label>
        {tab === "disputes" && <label className="grid gap-1 text-xs text-gray-400">Minimum age<select className={input} value={draft.minAge} onChange={(e) => setDraft({ ...draft, minAge: e.target.value })}><option value="">Any age</option><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></label>}
        <label className="grid gap-1 text-xs text-gray-400">Created from (UTC+8)<input type="date" className={input} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></label><label className="grid gap-1 text-xs text-gray-400">Created through (UTC+8)<input type="date" className={input} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></label>
        <button className={`${button} self-end bg-yellow-400 text-black`}>Apply filters</button>
      </form>
      <ErrorBox message={error} />
      <div className={panel}>{busy ? <p role="status">Loading payment records…</p> : error ? <p className="text-sm text-gray-400">Records unavailable. Refresh to retry.</p> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="text-xs uppercase text-gray-500"><tr><th className="py-3">{tab === "requests" ? "Payment" : "Report"}</th><th>Customer / Business</th><th>State</th><th>Created / Age</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-white/10"><td className="max-w-xs py-4 pr-4"><p className="font-semibold">{tab === "requests" ? row.item_name : row.reason.slice(0, 100)}</p><p className="mt-1 break-all font-mono text-xs text-gray-500">{row.id}</p>{tab === "requests" && <p className="mt-1 text-yellow-400">{Number(row.amount).toLocaleString()} {row.payment_method === "CUSTOMIZED" ? "CBP at this business" : "shared BP"}</p>}</td><td className="max-w-xs pr-4"><p>{row.business_name || businesses.find((b) => b.id === row.business_id)?.name || row.business_id}</p><p className="mt-1 break-all font-mono text-xs text-gray-500">{row.profile_id}</p></td><td className="pr-4 text-yellow-400">{tab === "requests" ? paymentState(row, now) : row.state}</td><td className="pr-4 text-gray-400">{date(row.created_at)}{tab === "disputes" && <p className="text-xs">{Math.max(0, Math.floor((now - Date.parse(row.created_at)) / 3600000))} hours old</p>}</td><td><button className={button} onClick={() => setSelected({ requestId: tab === "requests" ? row.id : row.request_id, dispute: tab === "disputes" ? row : null })}>Inspect</button></td></tr>)}</tbody></table></div>
        {!rows.length && <p className="py-8 text-center text-gray-400">No matching records.</p>}<Pager page={page} hasMore={more} busy={busy} onPage={setPage} />
      </>}</div>
    </>}
    {tab === "controls" && <PaymentControls businesses={businesses} version={version} onSaved={() => { setVersion((v) => v + 1); setToast("Business points payment control saved.") }} />}
    {tab === "risk" && <RiskMonitoring version={version} />}
    {selected && <PaymentEvidence key={selected.requestId} selection={selected} onClose={() => setSelected(null)} onReviewed={() => { setVersion((v) => v + 1); setToast("Dispute review recorded. No funds were moved.") }} />}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div>
}

function PaymentEvidence({ selection, onClose, onReviewed }) {
  const now = useNow()
  const [request, setRequest] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [receiptError, setReceiptError] = useState("")
  const [dispute, setDispute] = useState(selection.dispute)
  const [events, setEvents] = useState([])
  const [eventPage, setEventPage] = useState(0)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState("")
  const [version, setVersion] = useState(0)
  const [state, setState] = useState("UNDER_REVIEW")
  const [resolution, setResolution] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let active = true
    async function load() {
      setBusy(true); setError("")
      try {
        const results = await Promise.all([
          supabase.from("customer_payment_requests").select("*").eq("id", selection.requestId).single(),
          supabase.from("customer_payment_events").select("*").eq("request_id", selection.requestId).order("created_at").order("id").range(eventPage * PAGE_SIZE, (eventPage + 1) * PAGE_SIZE),
          supabase.from("customer_payment_disputes").select("*").eq("request_id", selection.requestId).maybeSingle(),
        ])
        for (const result of results) if (result.error) throw result.error
        let merchant = null
        if (results[0].data.transaction_id) merchant = await supabase.from("business_transactions").select("id,business_id,customer_id,type,amount,status,metadata,created_by,created_at").eq("id", results[0].data.transaction_id).maybeSingle()
        if (active) {
          setReceipt(merchant?.data || null)
          setReceiptError(merchant?.error?.message || (results[0].data.transaction_id && !merchant?.data ? "Merchant receipt is unavailable under this session. Use its UUID with authorized business support." : ""))
        }
        if (active) { setRequest(results[0].data); setEvents(results[1].data.slice(0, PAGE_SIZE)); setMore(results[1].data.length > PAGE_SIZE); setDispute(results[2].data) }
      } catch (error) { if (active) setError(error.message || "Evidence unavailable.") }
      finally { if (active) setBusy(false) }
    }
    load()
    return () => { active = false }
  }, [selection.requestId, eventPage, version])
  async function review() {
    if (saving || error || !validExplanation(resolution, 10, 2000)) return
    setSaving(true); setError("")
    try {
      const { data, error } = await supabase.rpc("admin_review_payment_dispute", { p_dispute_id: dispute.id, p_state: state, p_resolution: resolution.trim() }).single()
      if (error) throw error
      setDispute(data); setResolution(""); setConfirming(false); setVersion((v) => v + 1); onReviewed()
    } catch (error) { setError(`${error.message} Refresh evidence before retrying if the response was interrupted.`); setConfirming(false) }
    finally { setSaving(false) }
  }
  return <Modal title="Payment evidence" wide onClose={() => { if (!saving) onClose() }}>
    <div className="space-y-5"><button className={button} disabled={busy || saving} onClick={() => setVersion((v) => v + 1)}>Refresh evidence</button><ErrorBox message={error} />
      {busy ? <p role="status">Loading saved payment evidence…</p> : request && <>
        <p className="rounded-xl bg-yellow-400/10 p-3 text-sm text-yellow-300">{paymentState(request, now) === "APPROVED" ? "Approved — waiting for the business to complete payment." : `Payment status: ${paymentState(request, now)}`}</p>
        <dl className="grid gap-4 sm:grid-cols-2">{[
          ["Request ID", request.id], ["Business snapshot", request.business_name], ["Business UUID", request.business_id], ["Item / station snapshot", request.item_name], ["Amount", `${Number(request.amount).toLocaleString()} ${request.payment_method === "CUSTOMIZED" ? "CBP usable at this business" : "shared BP"}`], ["Kind", request.kind], ["Customer global profile UUID", request.profile_id], ["Business registration ID (text)", request.customer_id], ["Requester UUID", request.created_by], ["Approver UUID", request.approved_by], ["Approval time", date(request.approved_at)], ["Consent wording version", request.consent_version], ["Created", date(request.created_at)], ["Expires", date(request.expires_at)], ["Captured", date(request.captured_at)], ["Merchant receipt UUID", request.transaction_id], ["Session UUID", request.session_id], ["Product ID", request.product_id], ["Quantity", request.quantity], ["Unit price snapshot", request.unit_price], ["Workstation ID", request.workstation_id], ["Hourly rate snapshot", request.hourly_rate], ["Purchased time", request.duration_seconds == null ? "—" : paymentDuration(request.duration_seconds)],
        ].map(([label, value]) => <Field key={label} label={label}>{value}</Field>)}</dl>
        <details className={panel}><summary className="cursor-pointer text-sm">Original request payload</summary><pre className="mt-3 whitespace-pre-wrap break-all text-xs text-gray-400">{JSON.stringify(request.input_payload, null, 2)}</pre></details>
        <div className={panel}><h3 className="font-semibold">Refund investigation</h3><p className="mt-2 text-sm text-gray-400">Use the original merchant receipt UUID above with the business’s verified BP/CBP refund flow. Closing a dispute does not issue a refund. Platform admin status does not grant merchant refund authority.</p><Link className="mt-3 inline-block text-sm text-yellow-400 underline" to={`/transactions?search=${encodeURIComponent(request.transaction_id || request.id)}`}>Find linked shared BP history</Link><p className="mt-1 text-xs text-gray-500">The merchant receipt and shared BP history are separate records of the same payment. Refund proof appears in REFUNDED events below.</p></div>
        {receiptError && <p role="status" className="text-sm text-orange-300">{receiptError}</p>}
        {receipt && <details className={panel}><summary className="cursor-pointer text-sm">Saved merchant receipt</summary><pre className="mt-3 whitespace-pre-wrap break-all text-xs text-gray-400">{JSON.stringify(receipt, null, 2)}</pre></details>}
        <section><h3 className="font-semibold">Evidence timeline</h3><p className="mb-3 text-xs text-gray-500">Saved server events, earliest first. Times shown in UTC+8.</p>{events.map((event) => <div key={event.id} className="border-l-2 border-yellow-400/40 py-3 pl-4"><p className="text-sm font-semibold">{event.event_type} <span className="font-normal text-gray-500">{date(event.created_at)}</span></p><p className="mt-1 break-all text-xs text-gray-500">Actor: {event.actor_id || "System"} · Event: {event.id}</p>{Object.entries(event.details || {}).map(([key, value]) => <p key={key} className="mt-1 break-words text-sm text-gray-300">{key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}</p>)}</div>)}{!events.length && <p className="text-sm text-gray-400">No events on this page.</p>}<Pager page={eventPage} hasMore={more} busy={busy} onPage={setEventPage} /></section>
        {dispute && <section className={panel}><h3 className="font-semibold">Customer dispute · {dispute.state}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm">{dispute.reason}</p><p className="mt-2 text-xs text-gray-500">Report {dispute.id} · {date(dispute.created_at)} · Reviewed by {dispute.reviewed_by || "Not yet reviewed"}</p>{dispute.resolution && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-300">Customer-visible outcome: {dispute.resolution}</p>}
          {["OPEN", "UNDER_REVIEW"].includes(dispute.state) ? <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (validExplanation(resolution, 10, 2000)) setConfirming(true) }}><label className="grid gap-1 text-sm">Review state<select disabled={saving || confirming || Boolean(error)} className={input} value={state} onChange={(e) => setState(e.target.value)}>{["UNDER_REVIEW", "RESOLVED", "REJECTED"].map((s) => <option key={s}>{s}</option>)}</select></label><label className="grid gap-1 text-sm">Customer-visible explanation (10–2,000 characters)<textarea disabled={saving || confirming || Boolean(error)} required minLength={10} maxLength={2000} className={`${input} min-h-28`} value={resolution} onChange={(e) => setResolution(e.target.value)} /></label><p className="text-xs text-gray-500">A closed dispute cannot be rewritten. This action moves no funds.</p>{confirming ? <div className="flex gap-3"><button type="button" disabled={saving || Boolean(error)} className={button} onClick={review}>{saving ? "Saving…" : `Confirm ${state}`}</button><button type="button" disabled={saving} className={button} onClick={() => setConfirming(false)}>Back</button></div> : <button disabled={saving || Boolean(error) || !validExplanation(resolution, 10, 2000)} className={button}>Review outcome</button>}</form> : <p className="mt-3 text-sm text-gray-500">Closed {date(dispute.resolved_at)}. Review outcome is final.</p>}
        </section>}
      </>}
    </div>
  </Modal>
}

function PaymentControls({ businesses, version, onSaved }) {
  const [business, setBusiness] = useState("")
  const [control, setControl] = useState(null)
  const [history, setHistory] = useState([])
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    if (!business) return
    let active = true
    async function load() {
      setBusy(true); setLoaded(false); setError("")
      try {
        const [current, events] = await Promise.all([
          supabase.from("business_payment_controls").select("*").eq("business_id", business).maybeSingle(),
          supabase.from("business_payment_control_events").select("*").eq("business_id", business).order("created_at", { ascending: false }).order("id").range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        ])
        if (current.error || events.error) throw current.error || events.error
        if (active) { setControl(current.data); setEnabled(current.data?.points_payments_enabled === false); setHistory(events.data.slice(0, PAGE_SIZE)); setMore(events.data.length > PAGE_SIZE); setLoaded(true) }
      } catch (error) { if (active) setError(error.message) }
      finally { if (active) setBusy(false) }
    }
    load(); return () => { active = false }
  }, [business, page, version])
  async function save() {
    if (saving || !loaded || !validExplanation(reason, 5, 1000)) return
    setSaving(true); setError("")
    try {
      const { error } = await supabase.rpc("admin_set_business_points_payments", { p_business_id: business, p_enabled: enabled, p_reason: reason.trim() }).single()
      if (error) throw error
      setConfirming(false); setReason(""); onSaved()
    } catch (error) { setLoaded(false); setConfirming(false); setError(`${error.message} Refresh before retrying; the change may have committed.`) }
    finally { setSaving(false) }
  }
  return <section className={`${panel} space-y-4`}><h2 className="text-xl font-semibold">Business points payment controls</h2><p className="text-sm text-gray-400">Pause blocks new BP/CBP requests and captures. Cash, refunds and saved receipts remain available. Existing approvals remain approved until cancelled or expired.</p><label className="grid gap-1 text-sm">Business<select className={input} disabled={saving} value={business} onChange={(e) => { setBusiness(e.target.value); setLoaded(false); setPage(0); setConfirming(false); setReason("") }}><option value="">Choose business</option>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><ErrorBox message={error} />{busy ? <p>Loading controls…</p> : business && loaded && <>
    <p className="text-sm text-yellow-400">Current points payments: {control?.points_payments_enabled === false ? "PAUSED" : "ENABLED"}</p>{control && <p className="text-sm text-gray-400">{control.reason} · {date(control.updated_at)} · Admin {control.updated_by}</p>}
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (validExplanation(reason, 5, 1000)) setConfirming(true) }}><label className="grid gap-1 text-sm">Action<select disabled={saving || confirming || Boolean(error)} className={input} value={String(enabled)} onChange={(e) => setEnabled(e.target.value === "true")}><option value="false">Pause points payments</option><option value="true">Resume points payments</option></select></label><label className="grid gap-1 text-sm">Reason (5–1,000 characters)<textarea className={input} disabled={saving || confirming || Boolean(error)} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} maxLength={1000} /></label>{confirming ? <div className="flex gap-3"><button type="button" disabled={saving} className={button} onClick={save}>{saving ? "Saving…" : `Confirm ${enabled ? "resume" : "pause"}`}</button><button type="button" disabled={saving} className={button} onClick={() => setConfirming(false)}>Back</button></div> : <button className={button} disabled={!validExplanation(reason, 5, 1000)}>Review change</button>}</form>
    <h3 className="pt-4 font-semibold">Pause / resume history</h3>{history.map((event) => <div key={event.id} className="border-t border-white/10 py-3 text-sm"><p>{event.points_payments_enabled ? "RESUMED" : "PAUSED"} · {date(event.created_at)}</p><p className="mt-1 whitespace-pre-wrap text-gray-400">{event.reason}</p><p className="mt-1 break-all text-xs text-gray-500">Admin {event.actor_id} · Event {event.id}</p></div>)}{!history.length && <p className="text-sm text-gray-400">No payment control changes recorded.</p>}<Pager page={page} hasMore={more} busy={busy || saving} onPage={setPage} />
  </>}</section>
}

function RiskMonitoring({ version }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    async function load() {
      setBusy(true); setError("")
      try {
        const since = new Date(Date.now() - 30 * 86400000).toISOString()
        const [requests, events, disputes] = await Promise.all([
          fetchAllRows(() => supabase.from("customer_payment_requests").select("id,business_id,business_name,profile_id,state").gte("created_at", since)),
          fetchAllRows(() => supabase.from("customer_payment_events").select("id,request_id,event_type").eq("event_type", "REFUNDED").gte("created_at", since)),
          fetchAllRows(() => supabase.from("customer_payment_disputes").select("id,business_id,profile_id,state,created_at").in("state", ["OPEN", "UNDER_REVIEW"])),
        ])
        if (active) setRows(buildPaymentRisk(requests, events, disputes))
      } catch (error) { if (active) setError(error.message) }
      finally { if (active) setBusy(false) }
    }
    load(); return () => { active = false }
  }, [version])
  return <section className={`${panel} space-y-4`}><h2 className="text-xl font-semibold">Payment activity monitoring</h2><p className="text-sm text-gray-400">Requests and declines in the last 30 days, refunds for those requests during this window, and all unresolved disputes. Higher counts are investigation leads, not fraud findings.</p><p className="rounded-xl bg-yellow-400/10 p-3 text-sm text-yellow-300">Failed capture attempts are unavailable: the payment event log records successful state changes only. Track denied attempts and persistent operational alerts in a separate monitoring system. Support owners and response-time targets must be assigned operationally.</p><ErrorBox message={error} />{busy ? <p>Loading activity…</p> : !error && <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-xs uppercase text-gray-500"><tr><th>Business / Customer</th><th>Requests</th><th>Declines</th><th>Refunds</th><th>Unresolved</th><th>Oldest open</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.businessId}:${row.customer}`} className="border-t border-white/10"><td className="py-4 pr-3"><p>{row.business}</p><p className="break-all font-mono text-xs text-gray-500">{row.customer}</p></td><td>{row.requests}</td><td>{row.declines}</td><td>{row.refunds}</td><td>{row.unresolved}</td><td>{Math.floor(row.oldestHours)}h</td></tr>)}</tbody></table>{!rows.length && <p className="py-6 text-gray-400">No recorded payment activity.</p>}</div>}</section>
}
