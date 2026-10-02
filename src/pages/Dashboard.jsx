import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

const formatDate = (value) => {
  if (!value) return "Not available"

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date)
}

const formatCount = (value) => value == null ? "—" : Number(value).toLocaleString()
const formatStatus = (value) => String(value || "Unknown").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase())
const relationName = (value) => Array.isArray(value) ? value[0]?.name || value[0]?.full_name : value?.name || value?.full_name

function Dashboard() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState({
    businessCount: null,
    activeBusinesses: null,
    pendingBusinesses: null,
    customerCount: null,
    activeCustomers: null,
    pendingCustomers: null,
    cardCount: null,
    activeCards: null,
    attentionCards: null,
    transactionCount: null,
    todayTransactions: null,
    pendingTransactions: null,
    pendingContentCount: null,
    purchaseRequestCount: null,
    recentBusinesses: [],
    recentTransactions: [],
    pendingContent: [],
    recentPurchaseRequests: [],
    recentAuditLogs: [],
  })
  const [loading, setLoading] = useState(true)
  const [loadErrors, setLoadErrors] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    const queries = [
      ["businesses", supabase.from("businesses").select("id, name, status, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(5)],
      ["activeBusinesses", supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "ACTIVE")],
      ["pendingBusinesses", supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "PENDING")],
      ["customers", supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "CUSTOMER")],
      ["activeCustomers", supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "CUSTOMER").eq("status", "ACTIVE")],
      ["pendingCustomers", supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "CUSTOMER").eq("status", "PENDING")],
      ["cards", supabase.from("nfc_cards").select("id", { count: "exact", head: true })],
      ["activeCards", supabase.from("nfc_cards").select("id", { count: "exact", head: true }).eq("status", "ACTIVE")],
      ["attentionCards", supabase.from("nfc_cards").select("id", { count: "exact", head: true }).in("status", ["LOST", "STOLEN", "BLOCKED"])],
      ["transactions", supabase.from("transactions").select("id, transaction_code, transaction_type, status, amount_bp, created_at, customer:profiles!transactions_customer_id_fkey(full_name), business:businesses!transactions_business_id_fkey(name)", { count: "exact" }).order("created_at", { ascending: false }).limit(6)],
      ["todayTransactions", supabase.from("transactions").select("id", { count: "exact", head: true }).gte("created_at", todayStart).lt("created_at", tomorrowStart)],
      ["pendingTransactions", supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "PENDING")],
      ["pendingContent", supabase.from("content_items").select("id, title, status, created_at, business:businesses(name)", { count: "exact" }).in("status", ["SUBMITTED", "PENDING_REVIEW", "PENDING"]).order("created_at", { ascending: false }).limit(5)],
      ["purchaseRequests", supabase.from("purchase_requests").select("id, amount, status, created_at, business:businesses(name)", { count: "exact" }).order("created_at", { ascending: false }).limit(5)],
      ["auditLogs", supabase.from("audit_logs").select("id, action, target_type, target_id, created_at").order("created_at", { ascending: false }).limit(6)],
    ]

    const loadDashboard = async () => {
      setLoading(true)

      try {
        const queryResults = await Promise.all(queries.map(async ([key, query]) => {
          try {
            return [key, await query]
          } catch (error) {
            return [key, { data: null, count: null, error }]
          }
        }))

        if (!active) return

        const results = Object.fromEntries(queryResults)
        const count = (key) => results[key]?.error ? null : results[key]?.count ?? 0
        const rows = (key) => results[key]?.error ? [] : results[key]?.data || []
        const failedQueries = queryResults.filter(([, result]) => result.error).map(([key]) => key)

        setDashboard({
          businessCount: count("businesses"),
          activeBusinesses: count("activeBusinesses"),
          pendingBusinesses: count("pendingBusinesses"),
          customerCount: count("customers"),
          activeCustomers: count("activeCustomers"),
          pendingCustomers: count("pendingCustomers"),
          cardCount: count("cards"),
          activeCards: count("activeCards"),
          attentionCards: count("attentionCards"),
          transactionCount: count("transactions"),
          todayTransactions: count("todayTransactions"),
          pendingTransactions: count("pendingTransactions"),
          pendingContentCount: count("pendingContent"),
          purchaseRequestCount: count("purchaseRequests"),
          recentBusinesses: rows("businesses"),
          recentTransactions: rows("transactions"),
          pendingContent: rows("pendingContent"),
          recentPurchaseRequests: rows("purchaseRequests"),
          recentAuditLogs: rows("auditLogs"),
        })
        setLoadErrors(failedQueries)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    return () => { active = false }
  }, [refreshKey])

  const stats = [
    { title: "Registered Businesses", value: formatCount(dashboard.businessCount), description: `${formatCount(dashboard.activeBusinesses)} active · ${formatCount(dashboard.pendingBusinesses)} pending`, path: "/businesses" },
    { title: "Customers", value: formatCount(dashboard.customerCount), description: `${formatCount(dashboard.activeCustomers)} active · ${formatCount(dashboard.pendingCustomers)} pending`, path: "/customers" },
    { title: "Active NFC Cards", value: formatCount(dashboard.activeCards), description: `${formatCount(dashboard.cardCount)} total · ${formatCount(dashboard.attentionCards)} need attention`, path: "/nfc-cards" },
    { title: "Transactions Today", value: formatCount(dashboard.todayTransactions), description: `${formatCount(dashboard.transactionCount)} all time`, path: "/transactions" },
  ]
  const recentBusinesses = dashboard.recentBusinesses

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm font-medium text-yellow-400">
          ADMINISTRATION
        </p>

        <h1 className="mt-1 text-4xl font-bold">
          Dashboard
        </h1>

        <p className="mt-2 text-gray-500">
          Live overview of BuzzTap operations and activity.
        </p>
        <button type="button" onClick={() => setRefreshKey((current) => current + 1)} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:border-yellow-400/40 disabled:opacity-50">
          {loading ? "Refreshing..." : "Refresh data"}
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

        {stats.map((stat) => (
          <button
            type="button"
            key={stat.title}
            onClick={() => navigate(stat.path)}
            className="rounded-2xl border border-white/10 bg-[#111111] p-6 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/30 hover:shadow-[0_0_25px_rgba(255,193,7,0.08)]"
          >
            <p className="text-sm text-gray-500">
              {stat.title}
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              {stat.value}
            </h2>

            <p className="mt-2 text-xs text-yellow-400">
              {stat.description}
            </p>
          </button>
        ))}

      </div>

      {loadErrors.length > 0 && (
        <div role="status" className="mt-5 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
          Some dashboard data could not be loaded: {loadErrors.join(", ")}. Refresh or check database permissions.
        </div>
      )}

      {/* Main Content */}
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Recent Businesses */}
        <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#111111]">

          <div className="flex items-center justify-between border-b border-white/10 p-6">

            <div>
              <h2 className="text-lg font-semibold">
                Recent Businesses
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Recently registered businesses on BuzzTap.
              </p>
            </div>

            <button onClick={() => navigate("/businesses")} className="rounded-lg border border-yellow-400/30 px-4 py-2 text-sm text-yellow-400 transition hover:bg-yellow-400 hover:text-black">
              View All
            </button>

          </div>

          <div className="divide-y divide-white/5">

            {recentBusinesses.length === 0 ? <p className="p-6 text-sm text-gray-500">{loading ? "Loading businesses..." : "No business records found."}</p> : recentBusinesses.map((business) => (

              <button type="button" onClick={() => navigate("/businesses")}
                key={business.id}
                className="flex items-center justify-between p-5 transition hover:bg-white/[0.02]"
              >

                <div>
                  <p className="font-medium">
                    {business.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {business.business_type || "Business"}
                  </p>
                </div>

                <div className="text-right">

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      String(business.status).toUpperCase() === "ACTIVE"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : "bg-orange-400/10 text-orange-400"
                    }`}
                  >
                    {formatStatus(business.status)}
                  </span>

                  <p className="mt-2 text-xs text-gray-600">
                    {formatDate(business.created_at)}
                  </p>

                </div>

              </button>

            ))}

          </div>

        </div>

        <section className="rounded-2xl border border-white/10 bg-[#111111]" aria-labelledby="attention-title">
          <div className="border-b border-white/10 p-6">
            <h2 id="attention-title" className="text-lg font-semibold">Needs attention</h2>
            <p className="mt-1 text-sm text-gray-500">Live records waiting for review or follow-up.</p>
          </div>
          <div className="divide-y divide-white/5">
            {[
              { label: "Business registrations", value: dashboard.pendingBusinesses, path: "/businesses" },
              { label: "Customer accounts", value: dashboard.pendingCustomers, path: "/customers" },
              { label: "Content submissions", value: dashboard.pendingContentCount, path: "/content" },
              { label: "Pending transactions", value: dashboard.pendingTransactions, path: "/transactions" },
              { label: "Lost, stolen, or blocked cards", value: dashboard.attentionCards, path: "/nfc-cards" },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => navigate(item.path)} className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-white/[0.03]">
                <span className="text-sm text-gray-300">{item.label}</span>
                <span className="font-semibold text-yellow-400">{formatCount(item.value)}</span>
              </button>
            ))}
          </div>
        </section>

      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111] xl:col-span-2" aria-labelledby="recent-transactions-title">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div>
              <h2 id="recent-transactions-title" className="text-lg font-semibold">Recent transactions</h2>
              <p className="mt-1 text-sm text-gray-500">Latest platform payment activity.</p>
            </div>
            <button type="button" onClick={() => navigate("/transactions")} className="text-sm text-yellow-400 hover:text-yellow-300">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-600">
                <tr><th className="px-5 py-3">Transaction</th><th>Customer / Business</th><th>Amount</th><th>Status</th><th className="pr-5">Created</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dashboard.recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-5 py-4 font-mono text-xs text-gray-300">{transaction.transaction_code || transaction.id}</td>
                    <td className="py-4 text-gray-300">{relationName(transaction.customer) || "Unknown customer"}<span className="block text-xs text-gray-600">{relationName(transaction.business) || "Unknown business"}</span></td>
                    <td className="py-4 whitespace-nowrap">{Number(transaction.amount_bp || 0).toLocaleString()} BP</td>
                    <td className="py-4 text-gray-400">{formatStatus(transaction.status)}</td>
                    <td className="py-4 pr-5 whitespace-nowrap text-gray-500">{formatDate(transaction.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && dashboard.recentTransactions.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No transactions found.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111111]" aria-labelledby="content-review-title">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div><h2 id="content-review-title" className="text-lg font-semibold">Content review</h2><p className="mt-1 text-sm text-gray-500">{formatCount(dashboard.pendingContentCount)} awaiting review</p></div>
            <button type="button" onClick={() => navigate("/content")} className="text-sm text-yellow-400 hover:text-yellow-300">Open</button>
          </div>
          <div className="divide-y divide-white/5">
            {dashboard.pendingContent.map((item) => (
              <div key={item.id} className="px-6 py-4">
                <p className="truncate text-sm font-medium text-gray-200">{item.title || "Untitled submission"}</p>
                <p className="mt-1 text-xs text-gray-500">{relationName(item.business) || "Business"} · {formatDate(item.created_at)}</p>
              </div>
            ))}
            {!loading && dashboard.pendingContent.length === 0 && <p className="p-6 text-sm text-gray-500">No content awaiting review.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111111]" aria-labelledby="purchase-requests-title">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div><h2 id="purchase-requests-title" className="text-lg font-semibold">BuzzPoint requests</h2><p className="mt-1 text-sm text-gray-500">{formatCount(dashboard.purchaseRequestCount)} total requests</p></div>
            <button type="button" onClick={() => navigate("/treasury")} className="text-sm text-yellow-400 hover:text-yellow-300">Open</button>
          </div>
          <div className="divide-y divide-white/5">
            {dashboard.recentPurchaseRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-200">{relationName(request.business) || "Business"}</p><p className="mt-1 text-xs text-gray-500">{formatDate(request.created_at)}</p></div>
                <div className="shrink-0 text-right"><p className="text-sm text-yellow-400">{Number(request.amount || 0).toLocaleString()} BP</p><p className="mt-1 text-xs text-gray-500">{formatStatus(request.status)}</p></div>
              </div>
            ))}
            {!loading && dashboard.recentPurchaseRequests.length === 0 && <p className="p-6 text-sm text-gray-500">No purchase requests found.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111111] xl:col-span-2" aria-labelledby="system-activity-title">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div><h2 id="system-activity-title" className="text-lg font-semibold">Recent system activity</h2><p className="mt-1 text-sm text-gray-500">Latest recorded audit events.</p></div>
            <button type="button" onClick={() => navigate("/system-logs")} className="text-sm text-yellow-400 hover:text-yellow-300">View logs</button>
          </div>
          <div className="divide-y divide-white/5">
            {dashboard.recentAuditLogs.map((log) => (
              <div key={log.id} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-200">{formatStatus(log.action)} <span className="text-gray-500">· {formatStatus(log.target_type)} {log.target_id ? `· ${String(log.target_id).slice(0, 8)}` : ""}</span></p>
                <time className="shrink-0 text-xs text-gray-500">{formatDate(log.created_at)}</time>
              </div>
            ))}
            {!loading && dashboard.recentAuditLogs.length === 0 && <p className="p-6 text-sm text-gray-500">No audit activity found.</p>}
          </div>
        </section>
      </div>

    </div>
  )
}

export default Dashboard