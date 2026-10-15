export const PAGE_SIZE = 25
export const PAYMENT_STATES = ["PENDING", "APPROVED", "DECLINED", "CANCELLED", "CAPTURED", "EXPIRED"]
export const DISPUTE_STATES = ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"]
export function paymentState(request, now = Date.now()) {
  return ["PENDING", "APPROVED"].includes(request.state) && Date.parse(request.expires_at) <= now ? "EXPIRED" : request.state
}
export function paymentDuration(value) {
  const seconds = Number(value)
  if (!Number.isSafeInteger(seconds) || seconds < 0) return "Unavailable"
  return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`
}
export function validExplanation(value, min, max) {
  const length = Array.from(value.trim()).length
  return length >= min && length <= max
}
export function filterPayments(query, filters, disputes = false, now = Date.now()) {
  if (filters.business) query = query.eq("business_id", filters.business)
  if (filters.customer) query = query.eq("profile_id", filters.customer.trim())
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00+08:00`)
  if (filters.to) query = query.lt("created_at", new Date(Date.parse(`${filters.to}T00:00:00+08:00`) + 86400000).toISOString())
  if (filters.minAge) query = query.lte("created_at", new Date(now - Number(filters.minAge) * 3600000).toISOString())
  if (filters.state === "EXPIRED" && !disputes) query = query.in("state", ["PENDING", "APPROVED"]).lte("expires_at", new Date(now).toISOString())
  else if (filters.state === "UNRESOLVED") query = query.in("state", ["OPEN", "UNDER_REVIEW"])
  else if (filters.state) {
    query = query.eq("state", filters.state)
    if (!disputes && ["PENDING", "APPROVED"].includes(filters.state)) query = query.gt("expires_at", new Date(now).toISOString())
  }
  return query
}

export function buildPaymentRisk(requests, events, disputes, now = Date.now()) {
  const byRequest = new Map(requests.map((request) => [request.id, request]))
  const groups = new Map()
  const group = (row) => {
    const key = `${row.business_id}:${row.profile_id}`
    if (!groups.has(key)) groups.set(key, { business: row.business_name || row.business_id, businessId: row.business_id, customer: row.profile_id, requests: 0, declines: 0, refunds: 0, unresolved: 0, oldestHours: 0 })
    return groups.get(key)
  }
  for (const request of requests) {
    const row = group(request)
    row.requests++
    if (request.state === "DECLINED") row.declines++
  }
  for (const event of events) {
    const request = byRequest.get(event.request_id)
    if (request && event.event_type === "REFUNDED") group(request).refunds++
  }
  for (const dispute of disputes) {
    if (!["OPEN", "UNDER_REVIEW"].includes(dispute.state)) continue
    const row = group(dispute)
    row.unresolved++
    row.oldestHours = Math.max(row.oldestHours, Math.max(0, (now - Date.parse(dispute.created_at)) / 3600000))
  }
  return [...groups.values()].sort((a, b) => b.unresolved - a.unresolved || b.declines - a.declines || b.refunds - a.refunds || b.requests - a.requests)
}
