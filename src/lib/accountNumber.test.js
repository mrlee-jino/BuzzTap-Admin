import test from "node:test"
import assert from "node:assert/strict"
import { formatAccountNumber } from "./accountNumber.js"

test("formats the date, region, and six-digit sequence in four groups", () => {
  assert.equal(formatAccountNumber("2026091513000001"), "2026 0915 1300 0001")
  assert.equal(formatAccountNumber("2026101513999999"), "2026 1015 1399 9999")
  assert.equal(formatAccountNumber("2026 0915 1300 0001"), "2026 0915 1300 0001")
})
test("keeps missing and malformed account numbers distinguishable", () => {
  assert.equal(formatAccountNumber(null), "Not assigned")
  assert.equal(formatAccountNumber("UID 001"), "UID 001")
})
