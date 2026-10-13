import assert from "node:assert/strict"
import test from "node:test"
import { businessReportingWindow, transactionsInWindow, buildSharedBusinessInsights, normalizeAdminBusinessSummary, businessInsightMetric, normalizePublicBusinessProfile, loadBusinessEnrichment } from "./businessInsights.js"
import { buildBusinessPerformance } from "./businessPerformance.js"

const businesses = [{ id: "a", name: "Cafe", status: "Active" }, { id: "b", name: "Shop", status: "Active" }]
const window = businessReportingWindow("30", new Date("2026-10-13T08:00:00Z"))
const sale = (overrides = {}) => ({ business_id: "a", customer_id: "customer", transaction_type: "PURCHASE", status: "COMPLETED", amount_bp: 100, created_at: "2026-10-01T08:00:00Z", ...overrides })

test("reporting windows are consecutive, half open, and independent of host timezone", () => {
  assert.equal(window.start, "2026-09-13T08:00:00.000Z")
  assert.equal(window.previousStart, "2026-08-14T08:00:00.000Z")
  const rows = [sale({ created_at: window.start }), sale({ created_at: window.end }), sale({ created_at: "bad" })]
  assert.equal(transactionsInWindow(rows, window.start, window.end).length, 1)
  assert.equal(businessReportingWindow("all", new Date(window.end)).previousStart, null)
})

test("net sales include refunded originals exactly once and subtract completed refunds", () => {
  const rows = [sale(), sale({ status: "REFUNDED", amount_bp: 40 }), sale({ transaction_type: "REFUND", amount_bp: 40 }), sale({ transaction_type: "BUSINESS_PURCHASE", amount_bp: 999 }), sale({ status: "FAILED", amount_bp: 999 }), sale({ transaction_type: "CASH_PURCHASE", amount_bp: 999 })]
  const result = buildSharedBusinessInsights(businesses, rows, window)
  assert.equal(result.a.sales.gross, 140)
  assert.equal(result.a.sales.refunds, 40)
  assert.equal(result.a.sales.net, 100)
  assert.equal(result.a.sales.saleCount, 2)
  // The existing ranking still excludes REFUNDED originals and includes the
  // completed refund as activity; it is deliberately different from net sales.
  const ranked = buildBusinessPerformance(businesses, transactionsInWindow(rows, window.start, window.end))
  assert.equal(ranked.partners[0].transactions, 3)
  assert.equal(result.b.sales, null)
  assert.equal(businessInsightMetric("shared_net", "b", result).value, null)
})

test("repeat buyers are scoped to each business and guests are not deduplicated", () => {
  const rows = [sale(), sale(), sale({ customer_id: "other" }), sale({ customer_id: null }), sale({ customer_id: null }), sale({ business_id: "b" })]
  const result = buildSharedBusinessInsights(businesses, rows, window)
  assert.equal(result.a.sales.customers, 2)
  assert.equal(result.a.sales.repeatCustomers, 1)
  assert.equal(result.a.sales.repeatRate, 50)
  assert.equal(result.a.sales.guestSales, 2)
  assert.equal(result.b.sales.repeatCustomers, 0)
})

test("previous comparison excludes previous transactions from current ranking", () => {
  const rows = [sale({ amount_bp: 200 }), sale({ amount_bp: 100, created_at: "2026-09-01T08:00:00Z" })]
  const result = buildSharedBusinessInsights(businesses, rows, window)
  assert.equal(result.a.netChange, 100)
  assert.equal(result.a.sales.net, 200)
  const ranked = buildBusinessPerformance(businesses, transactionsInWindow(rows, window.start, window.end))
  assert.equal(ranked.partners[0].volume, 200)
  assert.equal(buildSharedBusinessInsights(businesses, [sale()], window).a.netChange, null)
})

test("invalid amounts stay unknown and refund-only periods can have negative net sales", () => {
  assert.equal(buildSharedBusinessInsights(businesses, [sale({ amount_bp: "bad" })], window).a.sales, null)
  const result = buildSharedBusinessInsights(businesses, [sale({ transaction_type: "REFUND", amount_bp: 50 })], window)
  assert.equal(result.a.sales.net, -50)
  assert.equal(result.a.sales.repeatRate, null)
})

test("unverified summaries cannot turn hidden or missing records into confirmed zero", () => {
  const response = { businesses: [{ business_id: "a", metrics: { active_staff: { available: true, value: 0 } } }] }
  assert.deepEqual(normalizeAdminBusinessSummary(response, ["a"]), {})
  response.access_verified = true
  const summaries = normalizeAdminBusinessSummary(response, ["a"])
  assert.equal(businessInsightMetric("active_staff", "a", {}, { summaries }).value, 0)
  assert.equal(businessInsightMetric("active_staff", "b", {}, { summaries }).available, false)
  assert.equal(businessInsightMetric("shared_bp_balance", "a", {}, { balances: {} }).available, false)
  assert.equal(businessInsightMetric("shared_bp_balance", "a", {}, { balances: { a: { value: 0 } } }).value, 0)
})

test("negative customized recovery balances remain valid and unexpected businesses are ignored", () => {
  const summaries = normalizeAdminBusinessSummary({ access_verified: true, businesses: [
    { business_id: "a", metrics: { customized_bp_balance: { available: true, value: -25, unit: "CBP" }, cash_net: { available: true, value: "100" } } },
    { business_id: "unexpected", metrics: {} },
  ] }, ["a"])
  assert.equal(summaries.a.metrics.customized_bp_balance.value, -25)
  assert.equal(summaries.a.metrics.cash_net.available, false)
  assert.equal(summaries.unexpected, undefined)
})

test("public profiles must match the business and retain free-text hours with safe links", () => {
  const data = { business_id: "a", display_name: " Cafe ", opening_hours: "Weekdays 9-5\nClosed Sundays", website: "javascript:alert(1)", logo_url: "https://example.com/logo.png" }
  const profile = normalizePublicBusinessProfile(data, "a")
  assert.equal(profile.displayName, "Cafe")
  assert.equal(profile.openingHours, data.opening_hours)
  assert.equal(profile.website, null)
  assert.equal(normalizePublicBusinessProfile(data, "b"), null)
})

test("optional source failures preserve usable profiles and never read legacy wallets", async () => {
  const queried = []
  const client = {
    async rpc(name, args) {
      if (name === "get_public_business_profile") return { data: { business_id: args.p_business_id, display_name: "Public name" }, error: null }
      return { data: null, error: { message: "RPC not deployed" } }
    },
    from(name) { queried.push(name); return { select() { return this }, async in() { return { data: [], error: null } } } },
  }
  const result = await loadBusinessEnrichment(client, businesses, window)
  assert.equal(result.profiles.a.displayName, "Public name")
  assert.deepEqual(result.balances, {})
  assert.deepEqual(result.summaries, {})
  assert.equal(result.errors.summary, "RPC not deployed")
  assert.deepEqual(queried, ["business_bp_wallets"])
})

test("a verified summary for a different reporting window is rejected", async () => {
  const client = {
    async rpc(name) {
      if (name === "get_public_business_profile") return { data: null, error: null }
      return { data: { access_verified: true, window: { start: null, end: "2026-01-01T00:00:00Z", previous_start: null, timezone: window.timezone, timestamp_basis: "created_at" }, businesses: [] }, error: null }
    },
    from() { return { select() { return this }, async in() { return { data: [], error: null } } } },
  }
  const result = await loadBusinessEnrichment(client, businesses, window)
  assert.deepEqual(result.summaries, {})
  assert.match(result.errors.summary, /reporting period/)
})
