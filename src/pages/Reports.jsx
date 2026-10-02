import { useEffect, useState } from "react"
import Toast from "../components/Toast"
import { supabase } from "../lib/supabaseClient"

const periodOptions = ["7 Days", "30 Days", "90 Days", "This Year"]
const emptyReport = { transactions: null, totalBusinesses: null, activeBusinesses: null, pendingBusinesses: null, totalCards: null, activeCards: null, treasury: null }

const getDateRange = (period) => {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  end.setDate(end.getDate() + 1)
  const start = new Date(end)

  if (period === "This Year") {
    start.setFullYear(start.getFullYear(), 0, 1)
  } else {
    start.setDate(start.getDate() - (period === "90 Days" ? 90 : period === "30 Days" ? 30 : 7))
  }

  return { start, end }
}

const fetchAllRows = async (queryFactory) => {
  const pageSize = 1000
  const rows = []

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await queryFactory().range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) return rows
  }
}

const isCompleted = (transaction) => String(transaction.status || "").toUpperCase() === "COMPLETED"
const isCustomerLoad = (transaction) => String(transaction.transaction_type || "").toUpperCase() === "CUSTOMER_LOAD"
const isBusinessPurchase = (transaction) => String(transaction.transaction_type || "").toUpperCase() === "BUSINESS_PURCHASE"
const getBusinessName = (transaction) => Array.isArray(transaction.business) ? transaction.business[0]?.name : transaction.business?.name

function Reports() {
  const [period, setPeriod] = useState("7 Days")
  const [report, setReport] = useState(emptyReport)
  const [loading, setLoading] = useState(true)
  const [loadErrors, setLoadErrors] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState("")
  useEffect(() => {
    let active = true
    const { start, end } = getDateRange(period)
    const jobs = [
      ["transactions", () => fetchAllRows(() => supabase.from("transactions")
        .select("id, transaction_code, business_id, nfc_card_id, transaction_type, status, amount_bp, created_at, business:businesses!transactions_business_id_fkey(name)")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: true }))],
      ["totalBusinesses", () => supabase.from("businesses").select("id", { count: "exact", head: true })],
      ["activeBusinesses", () => supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "ACTIVE")],
      ["pendingBusinesses", () => supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "PENDING")],
      ["totalCards", () => supabase.from("nfc_cards").select("id", { count: "exact", head: true })],
      ["activeCards", () => supabase.from("nfc_cards").select("id", { count: "exact", head: true }).eq("status", "ACTIVE")],
      ["treasury", () => supabase.rpc("admin_get_bp_treasury_summary")],
    ]

    async function loadReport() {
      setLoading(true)
      setReport(emptyReport)
      setLoadErrors([])
      const results = await Promise.all(jobs.map(async ([key, run]) => {
        try {
          const value = await run()
          if (value?.error) throw value.error
          return { key, value }
        } catch (error) {
          return { key, error }
        }
      }))

      if (!active) return

      const values = Object.fromEntries(results.filter((result) => !result.error).map(({ key, value }) => [key, value]))
      setReport({
        transactions: values.transactions ?? null,
        totalBusinesses: values.totalBusinesses?.count ?? null,
        activeBusinesses: values.activeBusinesses?.count ?? null,
        pendingBusinesses: values.pendingBusinesses?.count ?? null,
        totalCards: values.totalCards?.count ?? null,
        activeCards: values.activeCards?.count ?? null,
        treasury: values.treasury?.data ?? null,
      })
      setLoadErrors(results.filter((result) => result.error).map(({ key }) => key))
      setLoading(false)
    }

    loadReport().catch((error) => {
      if (active) {
        setLoadErrors([error.message || "report data"])
        setLoading(false)
      }
    })

    return () => { active = false }
  }, [period, refreshKey])

  const transactions = report.transactions || []
  const merchantTransactions = transactions.filter((item) => !isCustomerLoad(item) && !isBusinessPurchase(item) && item.business_id)
  const completedTransactions = merchantTransactions.filter(isCompleted)
  const totalBpVolume = completedTransactions.reduce((sum, item) => sum + Number(item.amount_bp || 0), 0)
  const successRate = merchantTransactions.length ? completedTransactions.length / merchantTransactions.length * 100 : null
  const customerLoads = transactions.filter(isCustomerLoad).length
  const businessPurchases = transactions.filter(isBusinessPurchase).length
  const nfcTransactions = merchantTransactions.filter((item) => item.nfc_card_id).length

  const range = getDateRange(period)
  const isYear = period === "This Year"
  const bucketCount = isYear ? 12 : period === "90 Days" ? 13 : period === "30 Days" ? 30 : 7
  const revenueData = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(range.start)
    if (isYear) date.setMonth(index)
    else date.setDate(date.getDate() + index * (period === "90 Days" ? 7 : 1))
    return { index, day: isYear ? new Intl.DateTimeFormat("en-US", { month: "short" }).format(date) : period === "90 Days" ? `Week ${index + 1}` : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date), amount: 0, transactions: 0 }
  })
  const rangeStartDay = Date.UTC(range.start.getFullYear(), range.start.getMonth(), range.start.getDate())
  completedTransactions.forEach((transaction) => {
    const date = new Date(transaction.created_at)
    if (Number.isNaN(date.getTime())) return
    const index = isYear ? date.getMonth() : Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - rangeStartDay) / 86400000 / (period === "90 Days" ? 7 : 1))
    if (revenueData[index]) {
      revenueData[index].amount += Number(transaction.amount_bp || 0)
      revenueData[index].transactions += 1
    }
  })

  const businessTotals = new Map()
  merchantTransactions.forEach((transaction) => {
    const business = businessTotals.get(transaction.business_id) || { id: transaction.business_id, name: getBusinessName(transaction) || `Business ${String(transaction.business_id).slice(0, 8)}`, transactions: 0, completed: 0, revenue: 0 }
    business.transactions += 1
    if (isCompleted(transaction)) {
      business.completed += 1
      business.revenue += Number(transaction.amount_bp || 0)
    }
    businessTotals.set(transaction.business_id, business)
  })
  const businesses = [...businessTotals.values()].sort((first, second) => second.revenue - first.revenue || second.transactions - first.transactions).slice(0, 10)
  const maxRevenue = Math.max(...revenueData.map((item) => item.amount), 0)
  const peakBucket = maxRevenue > 0 ? revenueData.reduce((peak, item) => item.amount > peak.amount ? item : peak) : null
  const totalRevenue = totalBpVolume
  const totalTransactions = merchantTransactions.length
  const treasury = report.treasury || {}
  const metrics = { available: treasury.available_balance ?? 0, circulation: treasury.customer_balance_total ?? 0 }
  const generating = loading
  const generateReport = () => setRefreshKey((key) => key + 1)

  const downloadReport = () => {
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`
    const rows = [
      ["Period", period],
      ["Completed merchant BP volume", totalBpVolume],
      ["Merchant transactions", totalTransactions],
      ["Transaction success rate", successRate == null ? "N/A" : `${successRate.toFixed(1)}%`],
      [],
      ["Transaction code", "Business", "Type", "Status", "Amount BP", "NFC", "Created at"],
      ...transactions.map((item) => [item.transaction_code || item.id, getBusinessName(item) || (isCustomerLoad(item) ? "BuzzTap Treasury" : ""), item.transaction_type, item.status, item.amount_bp, item.nfc_card_id ? "Yes" : "No", item.created_at]),
    ]
    const link = document.createElement("a")
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }))
    link.href = url
    link.download = `buzztap-report-${period.toLowerCase().replaceAll(" ", "-")}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setToast("Report exported.")
  }

  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>
        <div className="rounded-2xl border border-yellow-400/20 bg-[#111111] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-yellow-400">TREASURY SNAPSHOT</p>
              <p className="mt-2 text-sm text-gray-500">Persisted reserve plus customer and business wallet balances.</p>
            </div>
            <div className="grid grid-cols-2 gap-5 text-right text-sm sm:grid-cols-5">
              <span><b className="block text-lg text-white">{treasury.initial_supply == null ? "—" : Number(treasury.initial_supply).toLocaleString()}</b><small className="text-gray-500">Initial</small></span>
              <span><b className="block text-lg text-white">{treasury.total_loaded == null ? "—" : Number(treasury.total_loaded).toLocaleString()}</b><small className="text-gray-500">Loaded</small></span>
              <span><b className="block text-lg text-yellow-400">{treasury.available_balance == null ? "—" : Number(metrics.available).toLocaleString()}</b><small className="text-gray-500">Reserve</small></span>
              <span><b className="block text-lg text-white">{treasury.customer_balance_total == null ? "—" : Number(treasury.customer_balance_total).toLocaleString()}</b><small className="text-gray-500">Customer wallets</small></span>
              <span><b className="block text-lg text-white">{treasury.business_balance_total == null ? "—" : Number(treasury.business_balance_total).toLocaleString()}</b><small className="text-gray-500">Business wallets</small></span>
            </div>
          </div>
        </div>

          <p className="text-sm font-bold tracking-[0.25em] text-yellow-400">
            PLATFORM ANALYTICS
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Reports
          </h1>

          <p className="mt-2 text-gray-500">
            Monitor BuzzTap platform performance and activity.
          </p>

        </div>

        <div className="flex gap-3">
          <button type="button" onClick={downloadReport} disabled={loading || report.transactions == null} className="rounded-xl border border-white/10 bg-[#111111] px-5 py-3 text-sm text-gray-400 transition hover:border-yellow-400/30 hover:text-white disabled:opacity-50">
            Export CSV
          </button>
          <button type="button" onClick={generateReport} disabled={generating} className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 disabled:opacity-50">
            {generating ? "Refreshing..." : "Refresh report"}
          </button>
        </div>

      </div>


      {/* Period Selector */}

      <div className="flex flex-wrap gap-2">

        {periodOptions.map((item) => (

          <button
            key={item}
            onClick={() => setPeriod(item)}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              period === item
                ? "bg-yellow-400 font-semibold text-black"
                : "bg-[#111111] text-gray-500 hover:bg-[#181818] hover:text-white"
            }`}
          >
            {item}
          </button>

        ))}

      </div>

      {loadErrors.length > 0 && <div role="alert" className="rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">Some report sources could not be loaded: {loadErrors.join(", ")}. Check database permissions and treasury migration status.</div>}

      {/* Overview Cards */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">Completed merchant BP volume</p>

          <h2 className="mt-3 text-3xl font-bold">
            {report.transactions == null ? "—" : `${totalRevenue.toLocaleString()} BP`}
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            {report.transactions == null ? "Transaction data unavailable" : `${period} · excludes customer loads`}
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Merchant transactions
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {report.transactions == null ? "—" : totalTransactions.toLocaleString()}
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            {report.transactions == null ? "Treasury transfer data unavailable" : `${customerLoads.toLocaleString()} customer loads · ${businessPurchases.toLocaleString()} business purchases`}
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Active Businesses
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {report.activeBusinesses == null ? "—" : report.activeBusinesses.toLocaleString()}
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            {report.pendingBusinesses == null ? "—" : report.pendingBusinesses.toLocaleString()} pending · {report.totalBusinesses == null ? "—" : report.totalBusinesses.toLocaleString()} total
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Active NFC Cards
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {report.activeCards == null ? "—" : report.activeCards.toLocaleString()}
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            {report.totalCards == null ? "—" : report.totalCards.toLocaleString()} total · {nfcTransactions.toLocaleString()} NFC transactions
          </p>

        </div>

      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}


      {/* BP Volume Chart */}

      <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="font-semibold">Completed merchant BP volume</h2>

            <p className="mt-1 text-sm text-gray-500">
              Completed business transactions only; BP loads are excluded.
            </p>

          </div>

          <span className="text-sm text-yellow-400">
            {period}
          </span>

        </div>


        {/* Chart */}

        <div className="mt-8 overflow-x-auto">
          <div className="flex h-64 items-end gap-3 sm:gap-5" style={{ minWidth: `${Math.max(560, revenueData.length * 38)}px` }}>

          {loading ? <p className="mb-3 w-full text-center text-sm text-gray-500">Loading report data...</p> : revenueData.map((item) => {

            const height = maxRevenue ? Math.max(item.amount ? 4 : 1, (item.amount / maxRevenue) * 100) : 1

            return (

              <div
                key={item.index}
                className="flex h-full flex-1 flex-col justify-end"
                title={`${item.day}: ${item.amount.toLocaleString()} BP, ${item.transactions} transactions`}
              >

                <div className="group relative flex h-full items-end">

                  <div
                    className="w-full rounded-t-lg bg-yellow-400/80 transition-all duration-300 hover:bg-yellow-300"
                    style={{
                      height: `${height}%`,
                    }}
                  />

                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-white/10 bg-[#080808] px-3 py-2 text-xs opacity-0 shadow-xl transition group-hover:opacity-100">

                    {item.amount.toLocaleString()} BP · {item.transactions} transactions

                  </div>

                </div>

                <p className="mt-3 text-center text-xs text-gray-600">
                  {item.day}
                </p>

              </div>

            )
          })}

          </div>
        </div>
        {!loading && report.transactions != null && completedTransactions.length === 0 && <p className="mt-4 text-center text-sm text-gray-500">No completed merchant transactions in this period.</p>}
        {!loading && report.transactions == null && <p className="mt-4 text-center text-sm text-gray-500">Transaction data is unavailable.</p>}

      </div>


      {/* Business Performance */}

      <div className="rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">

          <h2 className="font-semibold">
            Business Performance
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Businesses ranked by completed BP volume for {period.toLowerCase()}.
          </p>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[800px]">

            <thead>

              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-600">

                <th className="px-6 py-4">
                  Business
                </th>

                <th className="px-6 py-4">
                  Transactions
                </th>

                <th className="px-6 py-4">Completed BP volume</th>

                <th className="px-6 py-4">Success rate</th>

              </tr>

            </thead>


            <tbody>

              {businesses.map((business) => (

                <tr
                  key={business.id}
                  className="border-b border-white/5 transition hover:bg-white/[0.02]"
                >

                  <td className="px-6 py-5">

                    <p className="font-medium">
                      {business.name}
                    </p>

                  </td>

                  <td className="px-6 py-5 text-gray-400">

                    {business.transactions.toLocaleString()}

                  </td>

                  <td className="px-6 py-5 font-semibold">

                    {business.revenue.toLocaleString()} BP

                  </td>

                  <td className="px-6 py-5">

                    <span className="text-gray-400">{business.transactions ? `${(business.completed / business.transactions * 100).toFixed(1)}%` : "—"}</span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>
          {!loading && report.transactions != null && businesses.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No business transactions found in this period.</p>}
        </div>

      </div>


      {/* Platform Health */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <h2 className="font-semibold">Measured platform activity</h2>
          <div className="mt-6 space-y-5">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Merchant transaction success</span><span className="text-yellow-400">{successRate == null ? "—" : `${successRate.toFixed(1)}%`}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-yellow-400" style={{ width: `${successRate ?? 0}%` }} /></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Completed merchant transactions</span><span className="text-white">{completedTransactions.length.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">NFC-linked merchant transactions</span><span className="text-white">{report.transactions == null ? "—" : nfcTransactions.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Active NFC cards</span><span className="text-white">{report.activeCards == null || report.totalCards == null ? "—" : `${report.activeCards.toLocaleString()} / ${report.totalCards.toLocaleString()}`}</span></div>
          </div>
        </div>


        {/* Quick Summary */}

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <h2 className="font-semibold">
            Report Summary
          </h2>

          <div className="mt-6 space-y-4">

            <div className="flex items-center justify-between border-b border-white/5 pb-4">

              <span className="text-sm text-gray-500">
                Best performing business
              </span>

              <span className="text-sm font-medium">
                {report.transactions == null ? "Unavailable" : businesses[0]?.name || "No completed business activity"}
              </span>

            </div>


            <div className="flex items-center justify-between border-b border-white/5 pb-4">

              <span className="text-sm text-gray-500">
                Peak volume period
              </span>

              <span className="text-sm font-medium">
                {report.transactions == null ? "Unavailable" : peakBucket?.day || "No data"}
              </span>

            </div>


            <div className="flex items-center justify-between border-b border-white/5 pb-4">

              <span className="text-sm text-gray-500">
                Customer BP loads
              </span>

              <span className="text-sm font-medium">
                {report.transactions == null ? "Unavailable" : `${customerLoads.toLocaleString()} loads`}
              </span>

            </div>


            <div className="flex items-center justify-between">

              <span className="text-sm text-gray-500">
                Peak BP volume
              </span>

              <span className="font-semibold text-yellow-400">{report.transactions == null ? "—" : peakBucket ? `${peakBucket.amount.toLocaleString()} BP` : "No data"}</span>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default Reports
