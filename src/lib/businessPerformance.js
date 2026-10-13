const normalizedValue = (value) => String(value || "").trim().toUpperCase()
const reserveTransfers = new Set(["CUSTOMER_LOAD", "BUSINESS_PURCHASE"])
const metricFields = new Set(["volume", "transactions", "customers"])

/** Read every page so partner rankings are not limited by the API row cap. */
export async function fetchAllRows(queryFactory, isCancelled = () => false) {
  const rows = []
  const pageSize = 500

  const checkCancellation = () => {
    if (isCancelled()) {
      const error = new Error("Data loading was cancelled.")
      error.name = "AbortError"
      throw error
    }
  }

  for (let offset = 0; ; offset += pageSize) {
    checkCancellation()
    // Preserve any primary order and use the unique ID to break timestamp ties.
    const { data, error } = await queryFactory()
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)
    checkCancellation()
    if (error) throw error

    const page = data || []
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

/** Completed merchant activity is the basis for partner performance. */
export function buildBusinessPerformance(businesses, transactions, metric = "volume") {
  const metricField = metricFields.has(metric) ? metric : "volume"
  const partners = businesses.map((business) => ({
    ...business,
    volume: 0,
    transactions: 0,
    customers: 0,
    lastActivity: null,
    rank: null,
    metricValue: 0,
    share: 0,
  }))
  const byId = new Map(partners.map((partner) => [partner.id, partner]))
  const customerIds = new Map()

  for (const transaction of transactions) {
    if (
      !transaction.business_id ||
      normalizedValue(transaction.status) !== "COMPLETED" ||
      reserveTransfers.has(normalizedValue(transaction.transaction_type))
    ) continue

    const partner = byId.get(transaction.business_id)
    if (!partner) continue

    partner.transactions += 1
    const amount = Number(transaction.amount_bp)
    if (Number.isFinite(amount) && amount > 0) partner.volume += amount

    if (transaction.customer_id) {
      if (!customerIds.has(partner.id)) customerIds.set(partner.id, new Set())
      customerIds.get(partner.id).add(transaction.customer_id)
    }

    const completedAt = transaction.completed_at
    const activity = completedAt && Number.isFinite(Date.parse(completedAt))
      ? completedAt
      : transaction.created_at
    const activityTime = activity ? Date.parse(activity) : NaN
    if (Number.isFinite(activityTime) && (!partner.lastActivity || activityTime > Date.parse(partner.lastActivity))) {
      partner.lastActivity = new Date(activityTime).toISOString()
    }
  }

  for (const partner of partners) {
    partner.customers = customerIds.get(partner.id)?.size || 0
    partner.metricValue = partner[metricField]
  }

  const leaders = partners
    .filter((partner) => normalizedValue(partner.status) === "ACTIVE" && partner.metricValue > 0)
    .sort((first, second) => second.metricValue - first.metricValue
      || String(first.name || "").localeCompare(String(second.name || ""))
      || String(first.id || "").localeCompare(String(second.id || "")))
  const activeTotal = leaders.reduce((total, partner) => total + partner.metricValue, 0)

  leaders.forEach((partner, index) => {
    partner.rank = index > 0 && partner.metricValue === leaders[index - 1].metricValue
      ? leaders[index - 1].rank
      : index + 1
    partner.share = activeTotal > 0 ? partner.metricValue / activeTotal * 100 : 0
  })

  return { partners, leaders, activeTotal }
}
