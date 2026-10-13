import { useId } from "react"

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 })
const countFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
const percentageFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })

const statuses = [
  { name: "Active", color: "#34d399", dot: "bg-emerald-400", text: "text-emerald-300" },
  { name: "Pending", color: "#fb923c", dot: "bg-orange-400", text: "text-orange-300" },
  { name: "Suspended", color: "#f87171", dot: "bg-red-400", text: "text-red-300" },
  { name: "Closed", color: "#64748b", dot: "bg-slate-500", text: "text-slate-400" },
]

const metricLabels = {
  volume: "BP volume",
  transactions: "transactions",
  customers: "customers",
}

const formatPercentage = (value) => value > 0 && value < 0.1
  ? "<0.1%"
  : `${percentageFormatter.format(value)}%`

function TrophyIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3h8v5a4 4 0 0 1-8 0V3Z" />
      <path d="M8 5H5v2a4 4 0 0 0 4 4m7-6h3v2a4 4 0 0 1-4 4M12 12v5m-4 4v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2H8Z" />
    </svg>
  )
}

function OverviewMessage({ title, children, error = false }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center" role={error ? "status" : undefined}>
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${error ? "bg-orange-400/10 text-orange-300" : "bg-yellow-400/10 text-yellow-400"}`}>
        <TrophyIcon className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-gray-200">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">{children}</p>
    </div>
  )
}

function BusinessPartnerOverview({
  businesses = [],
  leaders = [],
  metric = "volume",
  period = "30",
  performanceLoading = false,
  performanceError = "",
  loading = false,
  businessError = "",
  onSelectBusiness,
  onFilterStatus,
  filter,
}) {
  const headingId = useId()
  const metricLabel = metricLabels[metric] || metricLabels.volume
  const periodLabel = String(period) === "all" ? "All time" : "Last 30 days"
  const total = businesses.length
  const statusCounts = statuses.map((status) => ({
    ...status,
    count: businesses.filter((business) => business.status === status.name).length,
  }))
  const activeCount = statusCounts[0].count
  const activePercentage = total ? (activeCount / total) * 100 : 0
  const topLeaders = leaders.slice(0, 5)
  const leadingValue = topLeaders[0]?.metricValue || 0
  const overviewLoading = loading || performanceLoading
  const donutSegments = statusCounts.map((status, index) => {
    const precedingCount = statusCounts.slice(0, index).reduce((count, precedingStatus) => count + precedingStatus.count, 0)
    const start = total ? (precedingCount / total) * 100 : 0
    const end = total ? ((precedingCount + status.count) / total) * 100 : 0
    return `${status.color} ${start}% ${end}%`
  })

  return (
    <div className="mt-6 grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#111111]" aria-labelledby={`${headingId}-leaders`} aria-busy={overviewLoading}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <TrophyIcon className="h-5 w-5 shrink-0 text-yellow-400" />
              <h2 id={`${headingId}-leaders`} className="text-lg font-semibold text-white">Top business partners</h2>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">Active partners &bull; completed customer activity</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-gray-400">{periodLabel}</span>
        </div>

        {overviewLoading ? (
          <div className="space-y-5 px-5 py-6 sm:px-6" role="status">
            <span className="sr-only">Loading partner rankings...</span>
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3 motion-safe:animate-pulse" aria-hidden="true">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-white/5" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-3 w-2/5 rounded bg-white/5" />
                  <div className="h-2 w-full rounded-full bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : businessError || performanceError ? (
          <OverviewMessage title="Partner rankings unavailable" error>
            {businessError ? "Business records could not be loaded." : "Completed activity could not be loaded."} Refresh the page to try again.
          </OverviewMessage>
        ) : topLeaders.length === 0 ? (
          <OverviewMessage title="No partner activity yet">
            {total === 0
              ? "Register business partners to start tracking their performance."
              : activeCount === 0
                ? "Rankings will appear when an active business partner completes customer activity."
                : metric === "customers"
                  ? "Active partners need completed activity linked to customer accounts to appear in this period's customer ranking."
                  : metric === "volume"
                    ? "Active partners need completed customer activity with a positive BP amount to appear in this period's ranking."
                    : "Active partners need completed customer activity to appear in this period's ranking."}
          </OverviewMessage>
        ) : (
          <ol className="space-y-2 p-3 sm:p-4">
            {topLeaders.map((business, index) => {
              const rank = business.rank || index + 1
              const barWidth = leadingValue > 0 ? Math.min(100, (business.metricValue / leadingValue) * 100) : 0
              const share = Math.min(100, Math.max(0, business.share || 0))
              const value = metric === "volume"
                ? `${numberFormatter.format(business.metricValue)} BP`
                : countFormatter.format(business.metricValue)
              const initials = String(business.name || "Business").trim().charAt(0).toUpperCase()

              return (
                <li key={business.id || `${business.name}-${index}`}>
                  <button
                    type="button"
                    onClick={() => onSelectBusiness?.(business)}
                    disabled={!onSelectBusiness}
                    aria-label={`View ${business.name}, rank ${rank}, ${value} ${metric === "volume" ? "volume" : metricLabel}, ${formatPercentage(share)} of active partners' ${metricLabel}`}
                    className={`group grid w-full min-w-0 grid-cols-[1.5rem_2.25rem_minmax(0,1fr)] items-start gap-x-3 rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 disabled:cursor-default sm:p-4 ${rank === 1 ? "border-yellow-400/15 bg-yellow-400/[0.035] enabled:hover:border-yellow-400/35 enabled:hover:bg-yellow-400/[0.06]" : "border-transparent enabled:hover:border-white/10 enabled:hover:bg-white/[0.025]"}`}
                  >
                    <span className={`mt-2 text-center text-xs font-semibold tabular-nums ${rank === 1 ? "text-yellow-400" : "text-gray-500"}`} aria-label={`Rank ${rank}`}>{rank}</span>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${rank === 1 ? "bg-yellow-400/15 text-yellow-400" : "bg-white/5 text-gray-300"}`} aria-hidden="true">{initials}</span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <div className="min-w-0 flex-1 basis-24">
                          <p className="text-sm font-medium text-gray-100 [overflow-wrap:anywhere] group-enabled:group-hover:text-yellow-300">{business.name}</p>
                          <p className="mt-0.5 text-xs text-gray-500 [overflow-wrap:anywhere]">{business.type || "Business partner"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-semibold tabular-nums ${rank === 1 ? "text-yellow-400" : "text-gray-200"}`}>{value}</p>
                          <p className="mt-0.5 text-[11px] text-gray-500">{metricLabel}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
                        <div className={`h-full rounded-full ${rank === 1 ? "bg-yellow-400" : "bg-yellow-400/40"}`} style={{ width: `${barWidth}%` }} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-gray-500">
                        <span>{countFormatter.format(business.transactions || 0)} transactions &bull; {countFormatter.format(business.customers || 0)} customers</span>
                        <span className="tabular-nums text-gray-400">{formatPercentage(share)} share</span>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        )}

        <div className="border-t border-white/5 px-5 py-3.5 text-[11px] leading-relaxed text-gray-500 sm:px-6">
          <p>Share is each partner's portion of all active partners' {metricLabel}. Bars compare partners with the leader.</p>
          <p className="mt-1">BP volume excludes BP purchases and customer loads. Equal values share a rank.</p>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#111111]" aria-labelledby={`${headingId}-status`} aria-busy={loading}>
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <h2 id={`${headingId}-status`} className="text-lg font-semibold text-white">Business status</h2>
          <p className="mt-1.5 text-xs text-gray-500">Across all registered businesses</p>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-6 p-6" role="status">
            <span className="sr-only">Loading business status...</span>
            <div className="h-32 w-32 rounded-full border-[14px] border-white/5 motion-safe:animate-pulse" aria-hidden="true" />
          </div>
        ) : businessError ? (
          <OverviewMessage title="Business status unavailable" error>
            Business records could not be loaded. Refresh the page to try again.
          </OverviewMessage>
        ) : total === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-4 h-16 w-16 rounded-full border-8 border-white/5" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-200">No businesses registered</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-500">The status breakdown will appear when partners join BuzzTap.</p>
          </div>
        ) : (
          <div className="px-5 py-5 sm:px-6">
            <div className="flex justify-center py-2">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full" style={{ background: `conic-gradient(${donutSegments.join(", ")})` }} aria-hidden="true">
                <div className="flex h-[116px] w-[116px] flex-col items-center justify-center rounded-full bg-[#111111]">
                  <span className="text-3xl font-semibold tabular-nums text-white">{countFormatter.format(activeCount)}</span>
                  <span className="mt-0.5 text-xs text-gray-500">Active partners</span>
                  <span className="mt-1 text-xs font-medium tabular-nums text-emerald-400">{formatPercentage(activePercentage)}</span>
                </div>
              </div>
            </div>
            <p className="sr-only">{countFormatter.format(activeCount)} of {countFormatter.format(total)} business partners are active, {formatPercentage(activePercentage)}.</p>
            <div className="mt-4 space-y-1">
              {statusCounts.map((status) => {
                const percentage = (status.count / total) * 100
                const selected = filter === status.name

                return (
                  <button
                    key={status.name}
                    type="button"
                    onClick={() => onFilterStatus?.(status.name)}
                    disabled={!onFilterStatus}
                    aria-label={`Show ${status.name.toLowerCase()} businesses: ${countFormatter.format(status.count)}, ${formatPercentage(percentage)} of all businesses`}
                    aria-pressed={filter === undefined ? undefined : selected}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 disabled:cursor-default ${selected ? "bg-white/[0.06]" : "enabled:hover:bg-white/[0.04]"}`}
                  >
                    <span className="flex items-center gap-2.5 text-gray-300"><span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />{status.name}</span>
                    <span className="flex items-baseline gap-3 tabular-nums"><span className={`font-medium ${status.text}`}>{countFormatter.format(status.count)}</span><span className="w-12 text-right text-xs text-gray-500">{formatPercentage(percentage)}</span></span>
                  </button>
                )
              })}
            </div>
            <p className="mt-4 border-t border-white/5 pt-3.5 text-[11px] leading-relaxed text-gray-500">
              {countFormatter.format(total)} registered {total === 1 ? "partner" : "partners"}.{onFilterStatus ? " Select a status to filter the directory." : ""}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export default BusinessPartnerOverview
