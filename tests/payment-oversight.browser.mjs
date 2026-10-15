// Mocked HTTP browser checks. No hosted payment actions are performed.
import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright")
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const user = { id: id(1), aud: "authenticated", role: "authenticated", email: "admin@example.test", app_metadata: {}, user_metadata: {} }
const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })).toString("base64url")}.test`
await context.addInitScript(({ user, jwt }) => {
  localStorage.setItem("sb-giuobtmzjptxzjzkvbgc-auth-token", JSON.stringify({ access_token: jwt, refresh_token: "mock-refresh", token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user }))
}, { user, jwt })
const request = { id: id(10), business_id: id(2), business_name: "Test Business", customer_id: "business-customer-text", profile_id: id(3), created_by: id(4), kind: "WORKSTATION", payment_method: "CUSTOMIZED", amount: 100, item_name: "Saved Station Name", hourly_rate: 99, duration_seconds: 3661, state: "CAPTURED", consent_version: "payment-v1", created_at: "2026-10-15T10:00:00Z", expires_at: "2026-10-15T10:05:00Z", approved_at: "2026-10-15T10:01:00Z", approved_by: id(3), captured_at: "2026-10-15T10:02:00Z", transaction_id: id(5), session_id: id(6), input_payload: { kind: "WORKSTATION" } }
let dispute = { id: id(20), request_id: request.id, business_id: id(2), profile_id: id(3), reason: "I do not recognize this charge.", state: "OPEN", created_at: "2026-10-14T10:00:00Z" }
let control = null
let controlHistory = []
let failControlRead = false
const mutations = []
const queries = []
const runtimeErrors = []
page.on("pageerror", (error) => runtimeErrors.push(error.message))
await page.route("https://*.supabase.co/**", async (route) => {
  const req = route.request()
  const url = new URL(req.url())
  const table = url.pathname.split("/").at(-1)
  queries.push(url.toString())
  const json = async (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
  if (url.pathname.endsWith("/auth/v1/user")) return json(user)
  if (url.pathname.includes("/rpc/")) {
    const body = req.postDataJSON()
    mutations.push({ table, body })
    if (table === "admin_review_payment_dispute") {
      dispute = { ...dispute, state: body.p_state, resolution: body.p_resolution, reviewed_by: user.id, resolved_at: new Date().toISOString() }
      return json(dispute)
    }
    if (table === "admin_set_business_points_payments") {
      control = { business_id: body.p_business_id, points_payments_enabled: body.p_enabled, reason: body.p_reason, updated_by: user.id, updated_at: new Date().toISOString() }
      controlHistory.unshift({ ...control, id: id(100 + controlHistory.length), actor_id: user.id, created_at: control.updated_at })
      return json(control)
    }
    return json({ message: "Unexpected RPC" }, 400)
  }
  if (table === "profiles") return json({ role: "ADMIN", status: "ACTIVE" })
  if (table === "businesses") return json(url.searchParams.get("status") ? [] : [{ id: id(2), name: "Test Business" }])
  if (table === "customer_payment_requests") {
    if (url.searchParams.has("id")) return json(request)
    const offset = Number(url.searchParams.get("offset") || 0)
    return json(Array.from({ length: offset ? 1 : 26 }, (_, n) => ({ ...request, id: id(offset + n + 10) })))
  }
  if (table === "customer_payment_disputes") return json(url.searchParams.has("request_id") ? dispute : [dispute])
  if (table === "customer_payment_events") return json([{ id: id(30), request_id: request.id, event_type: "REFUNDED", actor_id: id(4), created_at: request.captured_at, details: { transaction_id: id(31), amount: 100 } }])
  if (table === "business_transactions") return json({ id: id(5), amount: 100, status: "COMPLETED", metadata: { payment_request_id: request.id } })
  if (table === "business_payment_controls") return failControlRead ? json({ message: "Simulated network failure" }, 503) : json(control)
  if (table === "business_payment_control_events") return json(controlHistory)
  return json([])
})
try {
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:5173/payments")
  await page.getByRole("heading", { name: "Payment Oversight", exact: true }).waitFor()
  await page.getByRole("button", { name: "Inspect", exact: true }).first().waitFor()
  assert.equal(await page.getByRole("button", { name: "Inspect", exact: true }).count(), 25)
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.getByText("Page 2", { exact: true }).waitFor()
  await page.getByRole("button", { name: "Inspect", exact: true }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByText("1h 1m 1s", { exact: true }).waitFor()
  await dialog.getByText("REFUNDED", { exact: false }).first().waitFor()
  assert.equal(await dialog.getByText("CAPTURED", { exact: false }).count() > 0, true)
  await dialog.getByRole("button", { name: "Close", exact: true }).click()

  await page.getByRole("button", { name: "Dispute queue", exact: true }).click()
  await page.getByRole("button", { name: "Inspect", exact: true }).first().click()
  await dialog.getByLabel("Customer-visible explanation (10–2,000 characters)").fill("   short  ")
  assert.equal(await dialog.getByRole("button", { name: "Review outcome", exact: true }).isDisabled(), true)
  await dialog.getByLabel("Customer-visible explanation (10–2,000 characters)").fill("The payment evidence has been investigated.")
  await dialog.getByLabel("Review state").selectOption("RESOLVED")
  await dialog.getByRole("button", { name: "Review outcome", exact: true }).click()
  await dialog.getByRole("button", { name: "Confirm RESOLVED", exact: true }).click()
  await dialog.getByText("Review outcome is final.", { exact: false }).waitFor()
  assert.equal(mutations.filter((m) => m.table === "admin_review_payment_dispute").length, 1)
  await dialog.getByRole("button", { name: "Close", exact: true }).click()

  await page.getByRole("button", { name: "Payment controls", exact: true }).click()
  await page.getByRole("combobox").first().selectOption(id(2))
  await page.getByText("Current points payments: ENABLED", { exact: true }).waitFor()
  await page.getByLabel("Reason (5–1,000 characters)").fill("Investigating payment reports.")
  await page.getByRole("button", { name: "Review change", exact: true }).click()
  await page.getByRole("button", { name: "Confirm pause", exact: true }).click()
  await page.getByText("Current points payments: PAUSED", { exact: true }).waitFor()
  assert.equal(mutations.at(-1).body.p_enabled, false)
  failControlRead = true
  await page.getByRole("button", { name: "Refresh", exact: true }).click()
  await page.getByRole("alert").filter({ hasText: "Simulated network failure" }).waitFor()
  assert.equal(await page.getByText("Current points payments: ENABLED", { exact: true }).count(), 0)
  failControlRead = false
  await page.getByRole("button", { name: "Refresh", exact: true }).click()
  await page.getByText("Current points payments: PAUSED", { exact: true }).waitFor()
  await page.getByLabel("Reason (5–1,000 characters)").fill("Investigation complete, resuming payments.")
  await page.getByRole("button", { name: "Review change", exact: true }).click()
  await page.getByRole("button", { name: "Confirm resume", exact: true }).click()
  await page.getByText("Current points payments: ENABLED", { exact: true }).waitFor()
  await page.getByRole("button", { name: "Risk monitoring", exact: true }).click()
  await page.getByText("Failed capture attempts are unavailable", { exact: false }).waitFor()
  await mkdir("test-results", { recursive: true })
  await page.screenshot({ path: "test-results/payment-risk-desktop.png", fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole("button", { name: "Dispute queue", exact: true }).click()
  await page.getByRole("button", { name: "Inspect", exact: true }).first().click()
  await dialog.getByText("Review outcome is final.", { exact: false }).waitFor()
  await page.screenshot({ path: "test-results/payment-evidence-mobile.png", fullPage: true })
  assert.deepEqual(runtimeErrors, [])
  assert.ok(mutations.every((m) => ["admin_review_payment_dispute", "admin_set_business_points_payments"].includes(m.table)))
  assert.ok(queries.some((q) => q.includes("offset=25")))
  console.log("PASS: explorer pagination, evidence/seconds/refunds, dispute validation/review, pause/resume, failed reads, risk monitoring, mobile layout, and restricted RPC actions")
} finally { await browser.close() }
