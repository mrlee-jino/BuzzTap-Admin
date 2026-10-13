const DAY = 24 * 60 * 60 * 1000
export const REPORTING_TIMEZONE = "Asia/Shanghai"
const normalize = (value) => String(value || "").trim().toUpperCase()
const validAmount = (value) => (typeof value === "number" || (typeof value === "string" && value.trim() !== ""))
  && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= Number.MAX_SAFE_INTEGER

export function businessReportingWindow(period, now = new Date()) {
  const end = now.toISOString()
  return {
    start: period === "all" ? null : new Date(now.getTime() - 30 * DAY).toISOString(),
    previousStart: period === "all" ? null : new Date(now.getTime() - 60 * DAY).toISOString(),
    end,
    timezone: REPORTING_TIMEZONE,
  }
}

export function transactionsInWindow(rows, start, end) {
  const lower = start ? Date.parse(start) : -Infinity
  const upper = Date.parse(end)
  return rows.filter((row) => {
    const timestamp = Date.parse(row.created_at)
    return Number.isFinite(timestamp) && timestamp >= lower && timestamp < upper
  })
}

// Only the shared transaction representation is used. Local mirrored rows must
// never be added to these totals. REFUNDED original purchases retain their gross.
function sharedSales(rows) {
  const purchases = rows.filter((row) => normalize(row.transaction_type) === "PURCHASE"
    && ["COMPLETED", "REFUNDED"].includes(normalize(row.status)))
  const refunds = rows.filter((row) => normalize(row.transaction_type) === "REFUND" && normalize(row.status) === "COMPLETED")
  if (!purchases.length && !refunds.length) return null
  if ([...purchases, ...refunds].some((row) => !validAmount(row.amount_bp))) return null

  const gross = purchases.reduce((sum, row) => sum + Number(row.amount_bp), 0)
  const refundAmount = refunds.reduce((sum, row) => sum + Number(row.amount_bp), 0)
  const customerSales = new Map()
  let guestSales = 0
  let lastSale = null
  for (const sale of purchases) {
    if (sale.customer_id) customerSales.set(String(sale.customer_id), (customerSales.get(String(sale.customer_id)) || 0) + 1)
    else guestSales += 1
    if (!lastSale || Date.parse(sale.created_at) > Date.parse(lastSale)) lastSale = sale.created_at
  }
  const customers = customerSales.size
  const repeatCustomers = [...customerSales.values()].filter((count) => count >= 2).length
  return {
    gross, refunds: refundAmount, net: gross - refundAmount,
    saleCount: purchases.length, customers, repeatCustomers,
    repeatRate: customers ? repeatCustomers / customers * 100 : null,
    guestSales, lastSale, coverage: "visible",
  }
}

export function buildSharedBusinessInsights(businesses, rows, window) {
  const current = transactionsInWindow(rows, window.start, window.end)
  const previous = window.previousStart ? transactionsInWindow(rows, window.previousStart, window.start) : []
  const grouped = (transactions) => {
    const map = new Map()
    for (const row of transactions) {
      const id = String(row.business_id || "")
      if (!map.has(id)) map.set(id, [])
      map.get(id).push(row)
    }
    return map
  }
  const currentByBusiness = grouped(current)
  const previousByBusiness = grouped(previous)
  return Object.fromEntries(businesses.map((business) => {
    const id = String(business.id)
    const sales = sharedSales(currentByBusiness.get(id) || [])
    const previousSales = window.previousStart ? sharedSales(previousByBusiness.get(id) || []) : null
    const netChange = sales && previousSales && previousSales.net !== 0
      ? (sales.net - previousSales.net) / Math.abs(previousSales.net) * 100
      : null
    return [id, { sales, previousSales, netChange }]
  }))
}

export function safeWebUrl(value) {
  try {
    const url = new URL(value)
    return ["https:", "http:"].includes(url.protocol) ? url.href : null
  } catch { return null }
}

export function normalizePublicBusinessProfile(data, businessId) {
  if (!data || Array.isArray(data) || String(data.business_id) !== String(businessId)) return null
  const text = (key) => typeof data[key] === "string" ? data[key].trim() : ""
  return {
    displayName: text("display_name"), type: text("business_type"), about: text("about"),
    logoUrl: safeWebUrl(data.logo_url), coverUrl: safeWebUrl(data.cover_url),
    address: text("address"), phone: text("phone"), email: text("email"),
    website: safeWebUrl(data.website), openingHours: text("opening_hours"),
  }
}

// A successful but RLS-filtered empty select is not proof of zero. Only an
// explicitly verified ADMIN summary may confirm absent records and zero totals.
export function normalizeAdminBusinessSummary(data, expectedIds) {
  if (data?.access_verified !== true || !Array.isArray(data.businesses)) return {}
  const ids = new Set(expectedIds.map(String))
  const result = {}
  for (const row of data.businesses) {
    const id = String(row.business_id)
    if (!ids.has(id)) continue
    const metrics = {}
    for (const [key, metric] of Object.entries(row.metrics || {})) {
      const negativeAllowed = ["shared_net", "shared_net_change", "cash_net", "customized_net", "customized_bp_balance"].includes(key)
      const isNumber = typeof metric?.value === "number" && Number.isFinite(metric.value)
        && Math.abs(metric.value) <= Number.MAX_SAFE_INTEGER && (negativeAllowed || metric.value >= 0)
        && (key !== "shared_repeat_rate" || metric.value <= 100)
      metrics[key] = metric?.available === true && isNumber
        ? { value: metric.value, available: true, reason: "", unit: typeof metric.unit === "string" ? metric.unit : "" }
        : { value: null, available: false, reason: typeof metric?.reason === "string" ? metric.reason : "Not available", unit: typeof metric?.unit === "string" ? metric.unit : "" }
    }
    result[id] = { metrics, lastSharedSale: typeof row.last_shared_sale === "string" && Number.isFinite(Date.parse(row.last_shared_sale)) ? row.last_shared_sale : null }
  }
  return result
}

export function businessInsightMetric(key, businessId, insights = {}, enrichment = {}) {
  const id = String(businessId)
  const reported = enrichment.summaries?.[id]?.metrics?.[key]
  if (reported?.available) return { ...reported, coverage: "verified" }
  if (key === "shared_bp_balance" && enrichment.balances?.[id]) {
    return { value: enrichment.balances[id].value, available: true, coverage: "visible" }
  }
  const insight = insights[id]
  const saleKeys = {
    shared_gross: "gross", shared_refunds: "refunds", shared_net: "net",
    shared_sale_count: "saleCount", shared_customers: "customers",
    shared_repeat_customers: "repeatCustomers", shared_repeat_rate: "repeatRate", shared_guest_sales: "guestSales",
  }
  const value = key === "shared_net_change" ? insight?.netChange : insight?.sales?.[saleKeys[key]]
  return value !== null && value !== undefined && Number.isFinite(value)
    ? { value, available: true, coverage: "visible" }
    : { value: null, available: false, reason: reported?.reason || "Not reported" }
}

export async function loadBusinessEnrichment(client, businesses, window, isCancelled = () => false) {
  const ids = businesses.map((business) => String(business.id))
  const profiles = {}
  const balances = {}
  const summaries = {}
  const errors = {}
  const safely = async (key, work) => {
    try { await work() } catch (error) { errors[key] = error.message || "Data unavailable" }
  }
  const checkCancelled = () => {
    if (isCancelled()) throw new Error("Loading cancelled")
  }

  await Promise.all([
    safely("profiles", async () => {
      const activeBusinesses = businesses.filter((business) => normalize(business.status) === "ACTIVE")
      let next = 0
      await Promise.all(Array.from({ length: Math.min(4, activeBusinesses.length) }, async () => {
        while (next < activeBusinesses.length && !isCancelled()) {
          const business = activeBusinesses[next++]
          try {
            const { data, error } = await client.rpc("get_public_business_profile", { p_business_id: business.id })
            if (error) { errors[`profile:${business.id}`] = error.message; continue }
            const profile = normalizePublicBusinessProfile(data, business.id)
            if (profile) profiles[String(business.id)] = profile
          } catch (error) { errors[`profile:${business.id}`] = error.message || "Public profile unavailable" }
        }
      }))
    }),
    safely("balances", async () => {
      // One row per business. Batches stay below the normal REST row limit.
      for (let offset = 0; offset < ids.length; offset += 100) {
        checkCancelled()
        const { data, error } = await client.from("business_bp_wallets")
          .select("business_id, balance, updated_at")
          .in("business_id", ids.slice(offset, offset + 100))
        if (error) throw error
        for (const row of data || []) {
          if (ids.includes(String(row.business_id)) && validAmount(row.balance)) {
            balances[String(row.business_id)] = { value: Number(row.balance), updatedAt: row.updated_at || null }
          }
        }
      }
    }),
    safely("summary", async () => {
      for (let offset = 0; offset < ids.length; offset += 100) {
        checkCancelled()
        const batch = ids.slice(offset, offset + 100)
        const { data, error } = await client.rpc("admin_get_business_partner_summary", {
          p_business_ids: batch, p_start: window.start, p_end: window.end,
          p_previous_start: window.previousStart, p_timezone: window.timezone,
        })
        if (error) throw error
        if (data?.access_verified !== true) throw new Error("Admin data coverage could not be confirmed.")
        const sameDate = (actual, expected) => expected === null ? actual === null : Number.isFinite(Date.parse(actual)) && Date.parse(actual) === Date.parse(expected)
        if (!data.window || data.window.timestamp_basis !== "created_at" || data.window.timezone !== window.timezone
          || !sameDate(data.window.start, window.start) || !sameDate(data.window.end, window.end)
          || !sameDate(data.window.previous_start, window.previousStart)) {
          throw new Error("The admin summary did not match the requested reporting period.")
        }
        Object.assign(summaries, normalizeAdminBusinessSummary(data, batch))
      }
    }),
  ])
  return { profiles, balances, summaries, errors }
}
