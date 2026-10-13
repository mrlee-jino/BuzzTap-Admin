import assert from "node:assert/strict"
import test from "node:test"
import { buildBusinessPerformance, fetchAllRows } from "./businessPerformance.js"

const businesses = [
  { id: "cafe", name: "Cafe", status: "Active" },
  { id: "gym", name: "Gym", status: "ACTIVE" },
  { id: "shop", name: "Shop", status: "Active" },
  { id: "pending", name: "Pending", status: "Pending" },
  { id: "empty", name: "Empty", status: "Active" },
]
const merchantTransaction = (overrides = {}) => ({
  business_id: "cafe", customer_id: "customer-a", amount_bp: 100,
  transaction_type: "BUSINESS_TO_CUSTOMER", status: "COMPLETED",
  created_at: "2026-10-01T10:00:00Z", ...overrides,
})

test("completed merchant volume excludes treasury transfers and unsuccessful activity", () => {
  const activity = [
    merchantTransaction(),
    merchantTransaction({ amount_bp: "25", completed_at: "2026-10-03T10:00:00Z" }),
    merchantTransaction({ amount_bp: 10, customer_id: "customer-b", status: " completed " }),
    merchantTransaction({ transaction_type: "CUSTOMER_LOAD", amount_bp: 900 }),
    merchantTransaction({ transaction_type: " business_purchase ", amount_bp: 800 }),
    merchantTransaction({ status: "FAILED", amount_bp: 700 }),
    merchantTransaction({ status: "REFUNDED", amount_bp: 600 }),
    merchantTransaction({ business_id: null, amount_bp: 500 }),
    merchantTransaction({ business_id: "unknown", amount_bp: 400 }),
  ]
  const originals = structuredClone({ businesses, activity })
  const { partners, leaders, activeTotal } = buildBusinessPerformance(businesses, activity)
  const cafe = partners.find((partner) => partner.id === "cafe")

  assert.equal(cafe.volume, 135)
  assert.equal(cafe.transactions, 3)
  assert.equal(cafe.customers, 2)
  assert.equal(cafe.lastActivity, "2026-10-03T10:00:00.000Z")
  assert.equal(cafe.rank, 1)
  assert.equal(cafe.share, 100)
  assert.equal(activeTotal, 135)
  assert.equal(leaders.length, 1)
  assert.deepEqual({ businesses, activity }, originals)
})

test("equal selected metrics share competition rank and inactive partners stay unranked", () => {
  const { partners, leaders, activeTotal } = buildBusinessPerformance(businesses, [
    merchantTransaction(),
    merchantTransaction({ business_id: "gym" }),
    merchantTransaction({ business_id: "shop", amount_bp: 50 }),
    merchantTransaction({ business_id: "pending", amount_bp: 1000 }),
  ])

  assert.deepEqual(leaders.map(({ id, rank }) => ({ id, rank })), [
    { id: "cafe", rank: 1 }, { id: "gym", rank: 1 }, { id: "shop", rank: 3 },
  ])
  assert.deepEqual(leaders.map((partner) => partner.share), [40, 40, 20])
  assert.equal(activeTotal, 250)
  assert.equal(partners.find((partner) => partner.id === "pending").volume, 1000)
  assert.equal(partners.find((partner) => partner.id === "pending").rank, null)
  assert.equal(partners.find((partner) => partner.id === "empty").rank, null)
})

test("transaction and customer rankings use their own metrics without inventing identities", () => {
  const activity = [
    merchantTransaction({ amount_bp: 200 }),
    merchantTransaction({ business_id: "gym", customer_id: "customer-b", amount_bp: 1 }),
    merchantTransaction({ business_id: "gym", customer_id: "customer-b", amount_bp: 1 }),
    merchantTransaction({ business_id: "gym", customer_id: "customer-c", amount_bp: 1 }),
    merchantTransaction({ business_id: "shop", customer_id: null, amount_bp: 25 }),
  ]

  const countRanking = buildBusinessPerformance(businesses, activity, "transactions")
  assert.deepEqual(countRanking.leaders.map((partner) => partner.id), ["gym", "cafe", "shop"])
  assert.equal(countRanking.activeTotal, 5)
  assert.equal(countRanking.leaders[0].metricValue, 3)

  const customerRanking = buildBusinessPerformance(businesses, activity, "customers")
  assert.deepEqual(customerRanking.leaders.map((partner) => partner.id), ["gym", "cafe"])
  assert.equal(customerRanking.activeTotal, 3)
  assert.equal(customerRanking.partners.find((partner) => partner.id === "shop").rank, null)
})

test("invalid and nonpositive BP amounts do not create volume; missing dates stay unknown", () => {
  const activity = [NaN, Infinity, -10, null, "invalid", 0].map((amount_bp) => merchantTransaction({
    amount_bp, customer_id: null, created_at: null, completed_at: "invalid-date",
  }))
  const { partners, leaders, activeTotal } = buildBusinessPerformance(businesses, activity)

  assert.equal(partners[0].transactions, 6)
  assert.equal(partners[0].volume, 0)
  assert.equal(partners[0].lastActivity, null)
  assert.equal(partners[0].rank, null)
  assert.equal(partners[0].share, 0)
  assert.equal(activeTotal, 0)
  assert.deepEqual(leaders, [])
  assert.deepEqual(buildBusinessPerformance([], []).partners, [])
})

test("paged loading includes every row with deterministic ID ordering", async () => {
  const rows = Array.from({ length: 1107 }, (_, id) => ({ id }))
  const ranges = []
  const orders = []
  const loaded = await fetchAllRows(() => ({
    order(field, options) { orders.push([field, options]); return this },
    async range(start, end) { ranges.push([start, end]); return { data: rows.slice(start, end + 1), error: null } },
  }))

  assert.deepEqual(loaded, rows)
  assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]])
  assert.deepEqual(orders, Array.from({ length: 3 }, () => ["id", { ascending: true }]))
})

test("paged loading propagates failures and stops after cancellation", async () => {
  const failure = new Error("Access denied")
  await assert.rejects(fetchAllRows(() => ({
    order() { return this },
    async range() { return { data: null, error: failure } },
  })), failure)

  let cancelled = false
  let calls = 0
  await assert.rejects(fetchAllRows(() => ({
    order() { return this },
    async range() { calls += 1; cancelled = true; return { data: [], error: null } },
  }), () => cancelled), { name: "AbortError" })
  assert.equal(calls, 1)
})
