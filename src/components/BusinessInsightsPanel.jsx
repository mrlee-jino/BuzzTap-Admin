import { businessInsightMetric, REPORTING_TIMEZONE } from "../lib/businessInsights"

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 })
const date = (value) => new Intl.DateTimeFormat("en-US", { timeZone: REPORTING_TIMEZONE, month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
const display = (metric, unit = "") => metric.available ? `${number.format(metric.value)}${unit ? ` ${unit}` : ""}` : "Not reported"

export function BusinessNetworkInsights({ businesses, insights, enrichment, loading }) {
  const cards = [
    { key: "shared_net", label: "Shared BP net sales", unit: "BP", note: "Purchases less refunds" },
    { key: "shared_refunds", label: "Shared BP refunds", unit: "BP", note: "Completed refund activity" },
    { key: "shared_bp_balance", label: "Shared BP balance", unit: "BP", note: "Current wallet balances" },
    { key: "active_staff", label: "Active staff", unit: "", note: "Active business memberships" },
  ]
  return (
    <section aria-label="Business financial and staff insights" className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const values = businesses.map((business) => businessInsightMetric(card.key, business.id, insights, enrichment)).filter((metric) => metric.available)
          const total = values.length ? values.reduce((sum, metric) => sum + metric.value, 0) : null
          return (
            <div key={card.key} className="min-w-0 rounded-2xl border border-white/10 bg-[#111111] p-5">
              <p className="text-sm text-gray-400">{card.label}</p>
              <p className={`mt-3 text-xl font-semibold tabular-nums ${total === null ? "text-gray-400" : "text-yellow-300"}`}>{loading ? "Loading..." : total === null ? "Not reported" : `${number.format(total)}${card.unit ? ` ${card.unit}` : ""}`}</p>
              <p className="mt-2 text-xs text-gray-400">{card.note}</p>
              <p className="mt-1 text-xs text-gray-500">{loading ? "Gathering available data" : `${values.length} of ${businesses.length} partners reported`}</p>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">Sales use shared BP purchase and refund records, separately from activity rankings. Totals cover reporting partners; missing data is not counted as zero. Cash and customized BP are kept separate.</p>
    </section>
  )
}

function BusinessInsightsPanel({ business, insights, enrichment, loading, period }) {
  const metric = (key) => businessInsightMetric(key, business.id, insights, enrichment)
  const lastSale = enrichment.summaries?.[String(business.id)]?.lastSharedSale || insights[String(business.id)]?.sales?.lastSale
  const change = metric("shared_net_change")
  const salesCards = [
    { key: "shared_gross", label: "Gross shared BP sales", unit: "BP" },
    { key: "shared_refunds", label: "Shared BP refunds", unit: "BP" },
    { key: "shared_net", label: "Net shared BP sales", unit: "BP" },
    { key: "shared_bp_balance", label: "Current shared BP balance", unit: "BP" },
    { key: "shared_customers", label: "Identified BP customers" },
    { key: "shared_repeat_customers", label: "Repeat BP customers" },
  ]
  const operations = [
    { key: "active_staff", label: "Active staff" },
    { key: "active_stations", label: "Active stations" },
    { key: "sessions", label: "Sessions in period" },
    { key: "published_posts", label: "Published posts" },
    { key: "current_promotions", label: "Current rebate promotions" },
    { key: "pending_purchase_count", label: "Pending BP purchases" },
    { key: "pending_purchase_amount", label: "Pending purchase amount", unit: "BP" },
    { key: "pending_settlement_count", label: "Pending settlements" },
    { key: "pending_settlement_amount", label: "Pending settlement amount" },
    { key: "customized_bp_balance", label: "Customized BP balance", unit: "CBP" },
  ]
  return (
    <div className="space-y-6" aria-busy={loading}>
      <section aria-label="Sales and customers">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold">Sales &amp; customers</h3><span className="text-xs text-gray-400">{period === "all" ? "All time" : "Last 30 days"}</span></div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {salesCards.map((card) => <div key={card.key} className="rounded-xl border border-white/10 bg-[#080808] p-4"><dt className="text-xs text-gray-400">{card.label}</dt><dd className="mt-2 text-lg font-semibold tabular-nums text-yellow-300">{loading ? "Loading..." : display(metric(card.key), card.unit)}</dd></div>)}
        </dl>
        {!loading && (
          <div className="mt-3 space-y-1.5 text-xs text-gray-400">
            <p>Repeat customer rate: {display(metric("shared_repeat_rate"), "%")} &middot; Guest sales: {display(metric("shared_guest_sales"))}</p>
            <p>Latest shared BP sale: {lastSale ? date(lastSale) : "Not reported"}</p>
            {period !== "all" && <p>Net sales vs previous 30 days: {change.available ? `${change.value > 0 ? "+" : ""}${number.format(change.value)}%` : "No confirmed comparison baseline"}</p>}
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-gray-500">Shared BP sales use PURCHASE rows marked COMPLETED or REFUNDED, less completed REFUND rows. Customer counts use identified buyers; repeat buyers have at least two sales in the period. Guest sales are counted separately.</p>
      </section>

      <section aria-label="Separate payment totals">
        <h3 className="mb-3 font-semibold">Other payment activity</h3>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="bg-white/[0.02] text-xs text-gray-400"><tr><th scope="col" className="p-3">Payment unit</th><th scope="col" className="p-3">Gross</th><th scope="col" className="p-3">Refunds</th><th scope="col" className="p-3">Net</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {[{ key: "cash", label: "Cash units" }, { key: "customized", label: "Customized BP" }].map((row) => <tr key={row.key}><th scope="row" className="p-3 font-normal text-gray-300">{row.label}</th>{["gross", "refunds", "net"].map((kind) => <td key={kind} className="p-3 tabular-nums text-gray-400">{loading ? "Loading..." : display(metric(`${row.key}_${kind}`))}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">Cash has no assumed currency or exchange rate. These amounts are never added to shared BP totals.</p>
      </section>

      <section aria-label="Business operations">
        <h3 className="mb-3 font-semibold">Operations &amp; requests</h3>
        <dl className="grid gap-x-5 gap-y-3 rounded-xl border border-white/10 bg-[#080808] p-4 sm:grid-cols-2">
          {operations.map((item) => <div key={item.key}><dt className="text-xs text-gray-400">{item.label}</dt><dd className="mt-1 text-sm tabular-nums text-gray-200" title={metric(item.key).reason}>{loading ? "Loading..." : display(metric(item.key), item.unit || metric(item.key).unit)}</dd></div>)}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">Unreported operations need a confirmed admin data source. Current balances, staff, posts, promotions and pending requests are snapshots; sales and session activity use the selected period.</p>
      </section>
      <p className="border-t border-white/10 pt-3 text-xs leading-relaxed text-gray-500">Reporting dates use record creation time. Rolling 30-day windows use UTC boundaries; dates are displayed in Asia/Shanghai. Missing or inaccessible data stays unreported.</p>
    </div>
  )
}

export default BusinessInsightsPanel
