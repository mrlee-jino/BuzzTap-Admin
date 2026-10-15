import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

const sources = [
  { table: "customer_payment_disputes", fields: "id, state, created_at", statusColumn: "state", statuses: ["OPEN", "UNDER_REVIEW"], title: "Payment dispute needs review", path: "/payments?tab=disputes", describe: (row) => `Customer payment report: ${row.state.replaceAll("_", " ").toLowerCase()}. Open the dispute queue to investigate.` },
  { table: "purchase_requests", fields: "id, amount, created_at", statuses: ["PENDING", "SUBMITTED"], title: "BuzzPoints purchase request", path: "/treasury", describe: (row) => `${Number(row.amount || 0).toLocaleString()} BP requested. Review in Treasury.` },
  { table: "businesses", fields: "id, name, created_at", statuses: ["PENDING"], title: "Business awaiting review", path: "/businesses", describe: (row) => `${row.name || "A business"} is awaiting approval.` },
  { table: "transactions", fields: "id, transaction_code, created_at", statuses: ["FAILED"], title: "Failed transaction", path: "/transactions", describe: (row) => `${row.transaction_code || "A transaction"} failed. Review the transaction details.` },
]

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [read, setRead] = useState([])
  const [storageKey, setStorageKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refresh, setRefresh] = useState(0)
  const container = useRef(null)
  const trigger = useRef(null)
  const location = useLocation()

  useEffect(() => {
    let active = true
    let busy = false
    async function load() {
      if (busy) return
      busy = true
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error("Session unavailable")
        const results = await Promise.all(sources.map(async (source) => {
          const { data, error } = await supabase.from(source.table).select(source.fields)
            .in(source.statusColumn || "status", source.statuses).order("created_at", { ascending: false }).limit(50)
          if (error) throw error
          return (data || []).map((row) => ({ id: `${source.table}:${row.id}`, title: source.title, description: source.describe(row), date: row.created_at, path: source.path }))
        }))
        if (!active) return
        const key = `buzztap-admin-notifications:${user.id}`
        let saved = []
        try {
          const value = JSON.parse(localStorage.getItem(key) || "[]")
          if (Array.isArray(value)) saved = value.filter((id) => typeof id === "string")
        } catch { /* Reading still works when browser storage is unavailable. */ }
        setStorageKey(key)
        setRead(saved)
        setItems(results.flat().sort((a, b) => new Date(b.date) - new Date(a.date)))
        setError("")
      } catch {
        if (active) setError("Unable to refresh notifications. Please try again.")
      } finally {
        busy = false
        if (active) setLoading(false)
      }
    }
    load()
    const timer = window.setInterval(load, 30000)
    window.addEventListener("focus", load)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", load) }
  }, [refresh, location.key])

  useEffect(() => {
    if (!open) return
    function outside(event) {
      if (!container.current?.contains(event.target)) setOpen(false)
    }
    function escape(event) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape) }
  }, [open])

  function markRead(ids) {
    const next = [...new Set([...read, ...ids])].slice(-2000)
    setRead(next)
    try { if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* Keep read state for this session. */ }
  }
  const unread = items.filter((item) => !read.includes(item.id)).length

  return (
    <div ref={container} className="relative z-40 shrink-0">
      <button ref={trigger} type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} aria-controls="admin-notifications" onClick={() => { setOpen(!open); if (!open) setRefresh((value) => value + 1) }} style={{ width: 46, minWidth: 46, height: 46, padding: 0, borderRadius: 16 }} className="relative flex shrink-0 items-center justify-center border border-white/70 bg-[#111111] text-gray-300 transition hover:border-yellow-400/50 hover:text-yellow-400 focus-visible:outline-2 focus-visible:outline-yellow-400">
        <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
        {unread > 0 && <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-yellow-400 px-1 text-center text-[11px] font-bold leading-5 text-black">{unread > 99 ? "99+" : unread}</span>}
        {error && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-orange-400" />}
      </button>
      {open && <section id="admin-notifications" aria-label="Notifications" style={{ width: "min(384px, calc(100vw - 2rem))" }} className="absolute right-0 top-14 overflow-hidden rounded-2xl border border-white/15 bg-[#111111] shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4"><div><h2 className="font-semibold text-white">Notifications</h2><p className="mt-1 text-xs text-gray-400">{unread} unread · Updates every 30 seconds</p></div><button type="button" disabled={!unread} onClick={() => markRead(items.map((item) => item.id))} className="shrink-0 whitespace-nowrap text-xs text-yellow-400 hover:underline disabled:opacity-40">Mark all read</button></div>
        {error && <div role="status" className="border-b border-white/10 p-4 text-sm text-orange-300">{error} <button type="button" className="text-yellow-400 underline" onClick={() => setRefresh((value) => value + 1)}>Retry</button></div>}
        <div className="max-h-[min(440px,60vh)] overflow-y-auto">
          {loading ? <p className="p-6 text-center text-sm text-gray-400">Loading notifications…</p> : !items.length && !error ? <p className="p-8 text-center text-sm text-gray-400">You’re all caught up. No important updates.</p> : items.map((item) => <Link key={item.id} to={item.path} onClick={() => { markRead([item.id]); setOpen(false) }} className={`flex gap-3 border-b border-white/5 p-4 transition hover:bg-white/5 focus-visible:outline-yellow-400 ${!read.includes(item.id) ? "bg-yellow-400/5" : ""}`}>
            <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${read.includes(item.id) ? "bg-gray-600" : "bg-yellow-400"}`} />
            <div><p className="text-sm font-semibold text-white">{item.title}</p><p className="mt-1 text-sm text-gray-400">{item.description}</p><p className="mt-2 text-xs text-gray-500">{item.date ? new Date(item.date).toLocaleString() : ""}</p></div>
          </Link>)}
        </div>
        <p className="border-t border-white/10 px-4 py-3 text-xs text-gray-500">Latest 50 per category. Read status is saved in this browser.</p>
      </section>}
    </div>
  )
}
