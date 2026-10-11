import assert from "node:assert/strict"
import test from "node:test"
import { filterPreviewPosts, localCalendarDate, previewStatus } from "./postPreview.js"

const today = "2026-10-11"
const posts = [
  { id: "active-business", business_id: "business", status: "PUBLISHED", start_date: "2026-10-10", end_date: "2026-10-12" },
  { id: "today-admin", business_id: null, status: "PUBLISHED", start_date: today, end_date: today },
  { id: "expired", status: "PUBLISHED", end_date: "2026-10-10" },
  { id: "archived", status: "ARCHIVED", start_date: "2026-10-12" },
  { id: "future", status: "PUBLISHED", start_date: "2026-10-12" },
  { id: "no-end", status: "published", start_date: "2026-10-10", end_date: null },
  { id: "no-dates", status: "PUBLISHED", start_date: "", end_date: "" },
  { id: "draft", status: "DRAFT" },
  { id: "submitted", status: "SUBMITTED" },
  { id: "stored-expired", status: "EXPIRED" },
]

test("running includes active posts and inclusive boundaries from businesses and admin", () => {
  assert.deepEqual(filterPreviewPosts(posts, "running", today).map((post) => post.id), [
    "active-business", "today-admin", "no-end", "no-dates",
  ])
})

test("archive includes explicitly archived and expired published posts without mutating records", () => {
  const original = structuredClone(posts)
  assert.deepEqual(filterPreviewPosts(posts, "archive", today).map((post) => post.id), ["expired", "archived"])
  assert.equal(previewStatus(posts[2], today), "EXPIRED")
  assert.equal(previewStatus(posts[1], today), "PUBLISHED")
  assert.deepEqual(posts, original)
})

test("calendar dates retain their date boundary even with timestamp suffixes", () => {
  const post = { status: "PUBLISHED", start_date: `${today}T23:59:59Z`, end_date: `${today}T00:00:00Z` }
  assert.equal(filterPreviewPosts([post], "running", today).length, 1)
  assert.equal(filterPreviewPosts([post], "archive", "2026-10-12").length, 1)
  assert.equal(localCalendarDate(new Date(2026, 9, 11, 23, 59)), today)
})

test("empty views have zero saved posts", () => {
  assert.equal(filterPreviewPosts([], "running", today).length, 0)
  assert.equal(filterPreviewPosts([posts[4], posts[7]], "archive", today).length, 0)
})
