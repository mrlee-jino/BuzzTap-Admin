import test from "node:test"
import assert from "node:assert/strict"
import { paymentState, paymentDuration, validExplanation, filterPayments, buildPaymentRisk } from "./paymentOversight.js"

const now = Date.parse("2026-10-15T12:00:00Z")
test("expiry is derived only for pending/approved requests, including exact deadline", () => {
  for (const state of ["PENDING", "APPROVED"]) {
    assert.equal(paymentState({ state, expires_at: new Date(now).toISOString() }, now), "EXPIRED")
    assert.equal(paymentState({ state, expires_at: new Date(now + 1).toISOString() }, now), state)
  }
  for (const state of ["CAPTURED", "DECLINED", "CANCELLED"]) assert.equal(paymentState({ state, expires_at: new Date(now - 1).toISOString() }, now), state)
})
test("workstation time preserves seconds and invalid values remain unavailable", () => {
  assert.equal(paymentDuration(3661), "1h 1m 1s")
  assert.equal(paymentDuration("59"), "0h 0m 59s")
  assert.equal(paymentDuration(-1), "Unavailable")
})
test("trimmed customer-visible explanations obey backend bounds and Unicode character counts", () => {
  assert.equal(validExplanation("     short     ", 10, 2000), false)
  assert.equal(validExplanation(" x".repeat(1001), 10, 2000), false)
  assert.equal(validExplanation("😀".repeat(10), 10, 2000), true)
  assert.equal(validExplanation(" clear explanation ", 10, 2000), true)
  assert.equal(validExplanation("x".repeat(1000), 5, 1000), true)
})
function recorder() {
  const calls = []
  const query = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return query } })
  return { query, calls }
}
test("server query derives expired/live states and uses an inclusive UTC+8 date range", () => {
  const { query, calls } = recorder()
  filterPayments(query, { state: "EXPIRED", from: "2026-10-15", to: "2026-10-15", business: "business", customer: " profile " }, false, now)
  assert.ok(calls.some((c) => JSON.stringify(c) === JSON.stringify(["in", "state", ["PENDING", "APPROVED"]])))
  assert.ok(calls.some((c) => JSON.stringify(c) === JSON.stringify(["lte", "expires_at", "2026-10-15T12:00:00.000Z"])))
  assert.ok(calls.some((c) => JSON.stringify(c) === JSON.stringify(["lt", "created_at", "2026-10-15T16:00:00.000Z"])))
  assert.ok(calls.some((c) => JSON.stringify(c) === JSON.stringify(["eq", "profile_id", "profile"])))
  const live = recorder()
  filterPayments(live.query, { state: "APPROVED" }, false, now)
  assert.ok(live.calls.some(([method, field]) => method === "gt" && field === "expires_at"))
})
test("unresolved dispute and age filters apply in the database", () => {
  const { query, calls } = recorder()
  filterPayments(query, { state: "UNRESOLVED", minAge: "24" }, true, now)
  assert.deepEqual(calls, [["lte", "created_at", "2026-10-14T12:00:00.000Z"], ["in", "state", ["OPEN", "UNDER_REVIEW"]]])
})
test("risk signals keep business/customer pairs separate and include old unresolved reports", () => {
  const rows = buildPaymentRisk([
    { id: "a", business_id: "b1", profile_id: "p", state: "DECLINED" },
    { id: "b", business_id: "b2", profile_id: "p", state: "CAPTURED" },
  ], [{ request_id: "b", event_type: "REFUNDED" }], [
    { business_id: "b1", profile_id: "p", state: "OPEN", created_at: "2026-10-13T12:00:00Z" },
    { business_id: "b2", profile_id: "p", state: "RESOLVED", created_at: "2026-10-12T12:00:00Z" },
  ], now)
  assert.equal(rows[0].businessId, "b1")
  assert.equal(rows[0].oldestHours, 48)
  assert.equal(rows[0].declines, 1)
  assert.equal(rows[0].refunds, 0)
  assert.equal(rows[1].refunds, 1)
  assert.equal(rows[1].unresolved, 0)
})
