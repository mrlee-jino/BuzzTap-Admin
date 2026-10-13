import { useEffect, useMemo, useState } from "react"
import Modal from "../components/Modal"
import Toast from "../components/Toast"
import BusinessPartnerOverview from "../components/BusinessPartnerOverview"
import { buildBusinessPerformance, fetchAllRows } from "../lib/businessPerformance"
import { supabase } from "../lib/supabaseClient"

const statusStyles = {
  Active: { badge: "bg-emerald-400/10 text-emerald-300", dot: "bg-emerald-400", bar: "bg-emerald-400" },
  Pending: { badge: "bg-orange-400/10 text-orange-300", dot: "bg-orange-400", bar: "bg-orange-400" },
  Suspended: { badge: "bg-red-400/10 text-red-300", dot: "bg-red-400", bar: "bg-red-400" },
  Closed: { badge: "bg-slate-400/10 text-slate-300", dot: "bg-slate-400", bar: "bg-slate-400" },
}
const metricOptions = [
  { value: "volume", label: "BP volume" },
  { value: "transactions", label: "Transactions" },
  { value: "customers", label: "Customers" },
]
const formatNumber = (value) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)

function StatusBadge({ status }) {
  const style = statusStyles[status] || statusStyles.Closed
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  )
}

const formatDisplayDate = (value) => {
  if (!value) return "N/A"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "N/A"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

const normalizeStatus = (status) => {
  const normalized = String(status || "").trim().toUpperCase()

  switch (normalized) {
    case "PENDING":
      return "Pending"
    case "ACTIVE":
      return "Active"
    case "SUSPENDED":
      return "Suspended"
    case "CLOSED":
      return "Closed"
    default:
      return "Pending"
  }
}

const normalizeBusiness = (business) => ({
  ...business,
  name: business.name || "Unnamed Business",
  type: business.business_type || business.type || "Unknown",
  location: business.address || business.location || "N/A",
  owner: business.owner || "Business owner",
  email: business.email || "",
  phone: business.phone || "",
  stations: business.stations == null ? null : Number(business.stations),
  status: normalizeStatus(business.status),
  joined: formatDisplayDate(business.created_at),
})

function Businesses() {
  const [businesses, setBusinesses] = useState([])
  const [filter, setFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [businessMembers, setBusinessMembers] = useState([])
  const [wallets, setWallets] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [messageTitle, setMessageTitle] = useState("")
  const [messageBody, setMessageBody] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [supabaseError, setSupabaseError] = useState("")
  const [toast, setToast] = useState("")
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")
  const [metric, setMetric] = useState("volume")
  const [sort, setSort] = useState("rank")
  const [refreshKey, setRefreshKey] = useState(0)
  const [performance, setPerformance] = useState({ period: "30", refreshKey: 0, rows: null, error: "" })

  useEffect(() => {
    let isMounted = true

    const fetchBusinesses = async () => {
      setLoading(true)
      setSupabaseError("")

      try {
        const data = await fetchAllRows(() => supabase
          .from("businesses")
          .select("*")
          .order("created_at", { ascending: false }), () => !isMounted)

        if (!isMounted) {
          return
        }

        setBusinesses((data ?? []).map(normalizeBusiness))
      } catch (fetchError) {
        if (isMounted) {
          setBusinesses([])
          setSupabaseError(fetchError.message || "Unable to load businesses.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchBusinesses()

    return () => {
      isMounted = false
    }
  }, [refreshKey])

  useEffect(() => {
    let active = true
    const now = new Date()
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    async function loadPerformance() {
      try {
        const rows = await fetchAllRows(() => {
          let query = supabase.from("transactions")
            .select("id, business_id, customer_id, amount_bp, transaction_type, status, created_at, completed_at")
            .eq("status", "COMPLETED")
            .not("business_id", "is", null)
            .lte("created_at", now.toISOString())
            .order("created_at", { ascending: true })

          if (period === "30") query = query.gte("created_at", start.toISOString())
          return query
        }, () => !active)

        if (active) setPerformance({ period, refreshKey, rows, error: "" })
      } catch (error) {
        if (active) setPerformance({ period, refreshKey, rows: null, error: error.message || "Unable to load partner activity." })
      }
    }

    loadPerformance()
    return () => { active = false }
  }, [period, refreshKey])

  useEffect(() => {
    if (!selectedBusiness?.id) return undefined

    let active = true

    async function loadBusinessDetails() {
      const [membersResult, walletsResult] = await Promise.all([
        supabase
          .from("business_members")
          .select("id, user_id, role, status, created_at, profile:profiles(id, full_name, email, phone, status)")
          .eq("business_id", selectedBusiness.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("buzzpoint_wallets")
          .select("id, wallet_type, status, created_at")
          .eq("business_id", selectedBusiness.id)
          .order("created_at", { ascending: false }),
      ])

      if (!active) return

      if (membersResult.error || walletsResult.error) {
        setDetailError(membersResult.error?.message || walletsResult.error?.message || "Unable to load all business details.")
      }
      setBusinessMembers(membersResult.data || [])
      setWallets(walletsResult.data || [])
      setDetailLoading(false)
    }

    loadBusinessDetails().catch((error) => {
      if (active) {
        setDetailError(error.message || "Unable to load business details.")
        setDetailLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [selectedBusiness])

  const performanceLoading = performance.period !== period || performance.refreshKey !== refreshKey || (performance.rows === null && !performance.error)
  const performanceError = performanceLoading ? "" : performance.error
  const performanceAvailable = !performanceLoading && !performanceError
  const { partners, leaders } = useMemo(
    () => buildBusinessPerformance(businesses, performance.rows || [], metric),
    [businesses, performance.rows, metric],
  )
  const filteredBusinesses = partners.filter((business) => {
    const query = search.trim().toLowerCase()
    return (filter === "All" || business.status === filter) && [business.name, business.location, business.type, business.owner].some((value) => value.toLowerCase().includes(query))
  }).sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name)
    if (sort === "rank" && performanceAvailable) {
      const rankDifference = (a.rank ?? Infinity) - (b.rank ?? Infinity)
      if (a.rank !== b.rank) return rankDifference
      return b.metricValue - a.metricValue || a.name.localeCompare(b.name)
    }
    return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || a.name.localeCompare(b.name)
  })
  const openBusiness = (business) => {
    setSelectedBusiness(business)
    setDetailLoading(true)
    setDetailError("")
    setBusinessMembers([])
    setWallets([])
    setMessageTitle("")
    setMessageBody("")
  }
  const selectedPerformance = partners.find((business) => business.id === selectedBusiness?.id)
  const sendBusinessMessage = async (event) => {
    event.preventDefault()
    if (!selectedBusiness?.id || !messageTitle.trim() || !messageBody.trim()) return

    setSendingMessage(true)
    const { data: userResult, error: userError } = await supabase.auth.getUser()
    if (userError || !userResult.user) {
      setSendingMessage(false)
      setToast("Your admin session could not be verified. Sign in again and retry.")
      return
    }

    const { error } = await supabase.from("business_notifications").insert({
      business_id: selectedBusiness.id,
      created_by: userResult.user.id,
      title: messageTitle.trim(),
      message: messageBody.trim(),
    })

    setSendingMessage(false)
    if (error) {
      setToast(error.message || "Unable to send the business notification.")
      return
    }

    setMessageTitle("")
    setMessageBody("")
    setToast(`Notification sent to ${selectedBusiness.name}.`)
  }

  const stats = [
    {
      title: "Total Businesses",
      value: businesses.length,
      filter: "All",
      description: `${businesses.filter((business) => business.status === "Closed").length} closed`,
      bar: "bg-yellow-400",
    },
    {
      title: "Active",
      value: businesses.filter((business) => business.status === "Active").length,
      filter: "Active",
      description: "Ready to serve customers",
      bar: statusStyles.Active.bar,
    },
    {
      title: "Pending",
      value: businesses.filter((business) => business.status === "Pending").length,
      filter: "Pending",
      description: "Awaiting activation",
      bar: statusStyles.Pending.bar,
    },
    {
      title: "Suspended",
      value: businesses.filter((business) => business.status === "Suspended").length,
      filter: "Suspended",
      description: "Requires attention",
      bar: statusStyles.Suspended.bar,
    },
  ]

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

        <div>
          <p className="text-sm font-medium tracking-[0.25em] text-yellow-400">
            PLATFORM MANAGEMENT
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Businesses
          </h1>

          <p className="mt-2 text-gray-400">
            See your leading partners and keep the business network in view.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-400">
            Activity period
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-2 block rounded-xl border border-white/10 bg-[#111111] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400">
              <option value="30">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </label>
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading || performanceLoading} aria-label="Refresh business and partner activity data" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#111111] px-4 py-2.5 text-sm text-gray-300 transition hover:border-yellow-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-yellow-400 disabled:cursor-wait disabled:opacity-50">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={`h-4 w-4 ${loading || performanceLoading ? "motion-safe:animate-spin" : ""}`}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 3M18 17a7 7 0 0 1-12 1l-2-3" /></svg>
            Refresh
          </button>
        </div>
      </div>


      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {stats.map((stat) => (
          <button
            type="button"
            key={stat.title}
            onClick={() => setFilter(stat.filter)}
            aria-pressed={filter === stat.filter}
            className="rounded-2xl border border-white/10 bg-[#111111] p-5 text-left transition hover:border-yellow-400/30 focus-visible:outline-2 focus-visible:outline-yellow-400"
          >
            <p className="flex items-center justify-between gap-3 text-sm text-gray-400">
              {stat.title}
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${stat.bar}`} />
            </p>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {loading || supabaseError ? "\u2014" : formatNumber(stat.value)}
            </p>
            <p className="mt-2 text-xs text-gray-400">{loading ? "Loading partners..." : supabaseError ? "Data unavailable" : stat.description}</p>
            <div aria-hidden="true" className="mt-4 h-1 overflow-hidden rounded-full bg-white/5">
              <div className={`h-full rounded-full ${stat.bar}`} style={{ width: `${!loading && !supabaseError && businesses.length ? stat.value / businesses.length * 100 : 0}%` }} />
            </div>
          </button>
        ))}

      </div>


      <div className="mb-4 mt-7 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Partner overview</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-400">Rank by</span>
          <div role="group" aria-label="Partner ranking metric" className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#111111] p-1">
            {metricOptions.map((option) => (
              <button key={option.value} type="button" aria-pressed={metric === option.value} onClick={() => setMetric(option.value)} className={`rounded-lg px-3 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-yellow-400 ${metric === option.value ? "bg-yellow-400 text-black" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <BusinessPartnerOverview
        businesses={businesses}
        leaders={leaders}
        metric={metric}
        period={period}
        performanceLoading={performanceLoading}
        performanceError={performanceError}
        loading={loading}
        businessError={supabaseError}
        onSelectBusiness={openBusiness}
        onFilterStatus={setFilter}
        filter={filter}
      />

      <section aria-labelledby="business-directory-title" className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
        <div className="border-b border-white/10 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="business-directory-title" className="text-lg font-semibold">Business directory</h2>
            <p className="text-xs text-gray-400">{loading ? "Loading partners..." : supabaseError ? "Data unavailable" : `${filteredBusinesses.length} of ${businesses.length} partners`}</p>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row xl:max-w-lg xl:flex-1">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Search businesses</span>
                <input type="search" placeholder="Search businesses..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 transition focus:border-yellow-400/50" />
              </label>
              <label>
                <span className="sr-only">Sort businesses</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-yellow-400/50">
                  <option value="rank">Top partners</option>
                  <option value="newest">Newest first</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            </div>
            <div role="group" aria-label="Filter businesses by status" className="flex flex-wrap gap-2">
              {["All", "Active", "Pending", "Suspended", "Closed"].map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs transition focus-visible:outline-2 focus-visible:outline-yellow-400 ${filter === item ? "bg-yellow-400 font-medium text-black" : "bg-[#181818] text-gray-400 hover:bg-[#222222] hover:text-white"}`}>{item}</button>)}
            </div>
          </div>
        </div>
        {loading && <p role="status" className="px-6 py-10 text-center text-sm text-yellow-300">Loading businesses...</p>}
        {!loading && supabaseError && <p role="alert" className="m-5 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">Unable to load businesses: {supabaseError}</p>}
        {!loading && !supabaseError && (
          <>
            <div aria-hidden="true" className="hidden grid-cols-[56px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_120px] gap-4 border-b border-white/10 px-6 py-4 text-xs uppercase tracking-wider text-gray-400 lg:grid">
              <span>Rank</span><span>Business</span><span>BP volume</span><span>Customer activity</span><span>Status</span>
            </div>
            <div className="divide-y divide-white/5">
              {filteredBusinesses.map((business) => (
                <div key={business.id || business.name} className="grid grid-cols-1 gap-4 px-5 py-5 transition hover:bg-white/[0.02] sm:px-6 lg:grid-cols-[56px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_120px] lg:items-center">
                  <div className="flex items-center gap-2 text-xs text-gray-400 lg:block" title={performanceAvailable ? business.rank ? `Active partner rank ${business.rank} by ${metricOptions.find((option) => option.value === metric).label}` : business.status !== "Active" ? "Only active partners are ranked" : "No activity for the selected metric" : "Ranking unavailable"}>
                    <span className="lg:sr-only">Partner rank</span>
                    <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-1 font-semibold tabular-nums ${performanceAvailable && business.rank && business.rank <= 3 ? "border border-yellow-400/20 bg-yellow-400/10 text-yellow-300" : "bg-white/5 text-gray-400"}`}>
                      {performanceAvailable && business.rank ? `#${business.rank}` : "\u2014"}
                    </span>
                    {performanceAvailable && !business.rank && <span className="lg:sr-only">Unranked</span>}
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 font-bold text-yellow-400">{business.name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0">
                      <button type="button" onClick={() => openBusiness(business)} className="max-w-full text-left font-medium text-white [overflow-wrap:anywhere] hover:text-yellow-400 focus-visible:outline-2 focus-visible:outline-yellow-400">{business.name}</button>
                      <p className="mt-1 text-xs text-gray-400 [overflow-wrap:anywhere]">{business.type} &middot; {business.location}</p>
                      <p className="mt-1 text-xs text-gray-500">Joined {business.joined}</p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-400 lg:hidden">BP volume</p>
                    <p className="text-sm font-medium tabular-nums text-yellow-300">{performanceAvailable ? `${formatNumber(business.volume)} BP` : performanceLoading ? "Loading..." : "Unavailable"}</p>
                    {performanceAvailable && <p className="mt-1 text-xs text-gray-500">{business.lastActivity ? `Last activity ${formatDisplayDate(business.lastActivity)}` : "No completed activity"}</p>}
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-400 lg:hidden">Customer activity</p>
                    <p className="text-sm tabular-nums text-gray-300">{performanceAvailable ? `${formatNumber(business.transactions)} transactions` : performanceLoading ? "Loading..." : "Unavailable"}</p>
                    {performanceAvailable && <p className="mt-1 text-xs tabular-nums text-gray-400">{formatNumber(business.customers)} unique customers</p>}
                  </div>
                  <div><StatusBadge status={business.status} /></div>
                </div>
              ))}
            </div>
            {filteredBusinesses.length === 0 && <p className="px-6 py-12 text-center text-sm text-gray-400">{businesses.length ? "No businesses match your search or status filter." : "No businesses have joined yet."}</p>}
            {filteredBusinesses.length > 0 && <p className="border-t border-white/5 px-6 py-3 text-xs text-gray-500">Ranks compare all active partners by {metricOptions.find((option) => option.value === metric).label.toLowerCase()}. {period === "30" ? "Activity recorded in the last 30 days." : "All-time activity."} Ties share a rank.</p>}
          </>
        )}
      </section>

      {selectedBusiness && (
        <Modal wide title={`${selectedBusiness.name} details`} onClose={() => setSelectedBusiness(null)}>
          <div className="space-y-6">
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold">{selectedBusiness.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{selectedBusiness.type} · Joined {selectedBusiness.joined}</p>
                </div>
                <StatusBadge status={selectedBusiness.status} />
              </div>
              <dl className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-[#080808] p-4 sm:grid-cols-2">
                <div><dt className="text-xs text-gray-500">Address</dt><dd className="mt-1 text-sm text-gray-200">{selectedBusiness.address || selectedBusiness.location || "Not provided"}</dd></div>
                <div><dt className="text-xs text-gray-500">Business type</dt><dd className="mt-1 text-sm text-gray-200">{selectedBusiness.type}</dd></div>
                <div><dt className="text-xs text-gray-500">Email</dt><dd className="mt-1 break-all text-sm text-gray-200">{selectedBusiness.email || "Not provided"}</dd></div>
                <div><dt className="text-xs text-gray-500">Phone</dt><dd className="mt-1 text-sm text-gray-200">{selectedBusiness.phone || "Not provided"}</dd></div>
                <div><dt className="text-xs text-gray-500">Business ID</dt><dd className="mt-1 break-all font-mono text-xs text-gray-400">{selectedBusiness.id}</dd></div>
              </dl>
            </section>

            <section aria-label="Partner performance">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">Partner performance</h3>
                <span className="text-xs text-gray-400">{period === "30" ? "Last 30 days" : "All time"}{performanceAvailable && selectedPerformance?.rank ? ` · Rank #${selectedPerformance.rank} by ${metricOptions.find((option) => option.value === metric).label.toLowerCase()}` : ""}</span>
              </div>
              {performanceAvailable && selectedPerformance ? (
                <dl className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "BP volume", value: `${formatNumber(selectedPerformance.volume)} BP` },
                    { label: "Completed transactions", value: formatNumber(selectedPerformance.transactions) },
                    { label: "Unique customers", value: formatNumber(selectedPerformance.customers) },
                  ].map((item) => <div key={item.label} className="rounded-xl border border-white/10 bg-[#080808] p-4"><dt className="text-xs text-gray-400">{item.label}</dt><dd className="mt-2 text-lg font-semibold tabular-nums text-yellow-300">{item.value}</dd></div>)}
                </dl>
              ) : <p className="text-sm text-gray-400">{performanceLoading ? "Loading partner activity..." : "Partner activity is unavailable."}</p>}
            </section>

            {detailLoading && <p className="text-sm text-yellow-300">Loading members and BuzzPoints status...</p>}
            {detailError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">Some details could not be loaded: {detailError}</p>}

            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">BuzzPoints status</h3>
                <span className="text-xs text-gray-500">{wallets.length} wallet records</span>
              </div>
              {wallets.length > 0 ? (
                <div className="divide-y divide-white/5 rounded-lg border border-white/10 bg-[#080808]">
                  {wallets.map((wallet) => (
                    <div key={wallet.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div><p className="text-sm font-medium text-gray-200">{wallet.wallet_type || "Business wallet"}</p><p className="mt-1 text-xs text-gray-500">Created {formatDisplayDate(wallet.created_at)}</p></div>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-300">{wallet.status || "Unknown status"}</span>
                    </div>
                  ))}
                </div>
              ) : !detailLoading && <p className="rounded-lg border border-white/10 bg-[#080808] px-4 py-5 text-sm text-gray-500">No BuzzPoints wallet records found for this business.</p>}
            </section>

            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">Business members</h3>
                <span className="text-xs text-gray-500">{businessMembers.length} members</span>
              </div>
              {businessMembers.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Name / account</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Member status</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {businessMembers.map((member) => (
                        <tr key={member.id}>
                          <td className="px-4 py-3"><p className="font-medium text-gray-200">{member.profile?.full_name || "Unnamed member"}</p><p className="mt-1 text-xs text-gray-500">{member.profile?.email || member.user_id}</p>{member.profile?.phone && <p className="mt-1 text-xs text-gray-500">{member.profile.phone}</p>}</td>
                          <td className="px-3 py-3 text-gray-300">{member.role || "Member"}</td>
                          <td className="px-3 py-3 text-gray-400">{member.status || member.profile?.status || "Unknown"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !detailLoading && <p className="rounded-lg border border-white/10 bg-[#080808] px-4 py-5 text-sm text-gray-500">No business members found.</p>}
            </section>

            <section className="border-t border-white/10 pt-5">
              <h3 className="font-semibold">Message this business</h3>
              <p className="mt-1 text-sm text-gray-500">Send a notification to this business. It will be available to the business web when its inbox is connected.</p>
              <form onSubmit={sendBusinessMessage} className="mt-4 space-y-3">
                <label className="block text-sm text-gray-300">Notification title
                  <input value={messageTitle} onChange={(event) => setMessageTitle(event.target.value)} maxLength={120} required className="mt-2 w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400" placeholder="Important update" />
                </label>
                <label className="block text-sm text-gray-300">Message
                  <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} rows={4} required className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400" placeholder="Write your message to this business..." />
                </label>
                <div className="flex justify-end">
                  <button type="submit" disabled={sendingMessage} className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60">
                    {sendingMessage ? "Sending..." : "Send message"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

    </div>
  )
}

export default Businesses
