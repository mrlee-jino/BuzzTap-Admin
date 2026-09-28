import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import Modal from "../components/Modal"
import Toast from "../components/Toast"

const types = ["UPDATE", "EVENT", "PROMOTION", "ADVERTISEMENT"]
const statuses = ["SUBMITTED", "PUBLISHED", "DRAFT", "REJECTED", "ARCHIVED", "EXPIRED"]
const emptyAdminPost = { title: "", type: "UPDATE", content: "", mediaUrl: "", startDate: "", endDate: "", callToAction: "" }

function statusLabel(status = "") {
  return status.replaceAll("_", " ")
}

function formatDate(value) {
  if (!value) return "Recently"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString()
}

function isImageUrl(value = "") {
  return /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(value)
}

function ContentManagement() {
  const [contentItems, setContentItems] = useState([])
  const [businessNames, setBusinessNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [type, setType] = useState("All")
  const [status, setStatus] = useState("All")
  const [showAllSubmissions, setShowAllSubmissions] = useState(false)
  const [rejectItem, setRejectItem] = useState(null)
  const [reason, setReason] = useState("")
  const [workingId, setWorkingId] = useState(null)
  const [adminPost, setAdminPost] = useState(emptyAdminPost)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let active = true

    async function loadContent() {
      setLoading(true)
      setLoadError("")

      const [contentResult, businessResult] = await Promise.all([
        supabase
          .from("content_items")
          .select("id, business_id, title, content, description, type, status, media_url, start_date, end_date, call_to_action, created_at, updated_at")
          .order("created_at", { ascending: false }),
        supabase.from("businesses").select("id, name"),
      ])

      if (!active) return

      if (contentResult.error) {
        setLoadError(contentResult.error.message || "Unable to load submitted content.")
        setContentItems([])
      } else {
        setContentItems(contentResult.data || [])
      }

      if (!businessResult.error) {
        setBusinessNames(Object.fromEntries((businessResult.data || []).map((business) => [business.id, business.name])))
      }

      setLoading(false)
    }

    loadContent().catch((error) => {
      if (active) {
        setLoadError(error.message || "Unable to load submitted content.")
        setLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return contentItems.filter((item) => {
      const itemStatus = (item.status || "").toUpperCase()
      const matchesStatus = status === "All" || itemStatus === status
      const matchesType = type === "All" || item.type === type
      const matchesSearch = !query || `${item.title || ""} ${businessNames[item.business_id] || ""} ${item.business_id || ""} ${item.id}`.toLowerCase().includes(query)
      return matchesStatus && matchesType && matchesSearch
    })
  }, [businessNames, contentItems, search, status, type])

  const visibleItems = showAllSubmissions ? filteredItems : filteredItems.slice(0, 10)
  const approvedItems = contentItems.filter((item) => (item.status || "").toUpperCase() === "PUBLISHED")

  async function moderateContent(item, nextStatus, rejectionReason = "") {
    setWorkingId(item.id)
    const changes = { status: nextStatus }
    if (nextStatus === "REJECTED") changes.rejection_reason = rejectionReason

    const { data, error } = await supabase
      .from("content_items")
      .update(changes)
      .eq("id", item.id)
      .select("id")

    setWorkingId(null)

    if (error) {
      const missingReasonColumn = error.code === "PGRST204" || error.code === "42703"
      setToast({
        message: missingReasonColumn && nextStatus === "REJECTED"
          ? "Apply the content rejection reason migration before rejecting posts."
          : error.message || "Unable to update this post.",
        tone: "error",
      })
      return false
    }

    if (!data?.length) {
      setToast({ message: "No post was updated. Check the admin role and content table permissions.", tone: "error" })
      return false
    }

    setContentItems((items) => items.map((content) => content.id === item.id
      ? { ...content, status: nextStatus, rejection_reason: rejectionReason || null, updated_at: new Date().toISOString() }
      : content))
    setToast({ message: nextStatus === "PUBLISHED" ? "Post approved and published." : "Post rejected with a reason." })
    return true
  }

  async function rejectContent() {
    if (!reason.trim()) {
      setToast({ message: "A rejection reason is required.", tone: "error" })
      return
    }
    const saved = await moderateContent(rejectItem, "REJECTED", reason.trim())
    if (saved) {
      setRejectItem(null)
      setReason("")
    }
  }

  async function publishAdminPost(event) {
    event.preventDefault()
    if (!adminPost.title.trim() || !adminPost.content.trim()) {
      setToast({ message: "A title and post content are required.", tone: "error" })
      return
    }

    setPublishing(true)
    const { data: userResult, error: userError } = await supabase.auth.getUser()
    if (userError || !userResult.user) {
      setPublishing(false)
      setToast({ message: "Your admin session could not be verified. Sign in again and retry.", tone: "error" })
      return
    }

    const { data, error } = await supabase
      .from("content_items")
      .insert({
        business_id: null,
        title: adminPost.title.trim(),
        content: adminPost.content.trim(),
        type: adminPost.type,
        status: "PUBLISHED",
        media_url: adminPost.mediaUrl.trim() || null,
        start_date: adminPost.startDate || null,
        end_date: adminPost.endDate || null,
        call_to_action: adminPost.callToAction.trim() || null,
        created_by: userResult.user.id,
      })
      .select("id, business_id, title, content, description, type, status, media_url, start_date, end_date, call_to_action, created_at, updated_at")
      .single()

    setPublishing(false)
    if (error) {
      setToast({ message: error.message || "Unable to publish this post.", tone: "error" })
      return
    }

    setContentItems((items) => [data, ...items])
    setAdminPost(emptyAdminPost)
    setToast({ message: "Post published and added to Submissions." })
  }

  const businessLabel = (item) => businessNames[item.business_id] || (item.business_id ? "Business" : "BuzzTap Admin")

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold tracking-[0.25em] text-yellow-400">CONTENT WORKFLOW</p>
        <h1 className="mt-2 text-3xl font-bold">Content Management</h1>
        <p className="mt-2 text-sm text-gray-500">Review business submissions and preview how posts appear in the customer feed.</p>
      </header>

      <section className="rounded-xl border border-white/10 bg-[#111111] p-4" aria-label="Content filters">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setShowAllSubmissions(false) }}
            placeholder="Search content, business, or ID"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#080808] px-4 py-3 text-sm outline-none focus:border-yellow-400"
            aria-label="Search content"
          />
          <select value={type} onChange={(event) => { setType(event.target.value); setShowAllSubmissions(false) }} className="rounded-lg border border-white/10 bg-[#080808] px-3 py-2 text-sm" aria-label="Filter by content type">
            <option value="All">All types</option>
            {types.map((itemType) => <option key={itemType} value={itemType}>{itemType}</option>)}
          </select>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setShowAllSubmissions(false) }} className="rounded-lg border border-white/10 bg-[#080808] px-3 py-2 text-sm" aria-label="Filter by status">
            <option value="All">All statuses</option>
            {statuses.map((itemStatus) => <option key={itemStatus} value={itemStatus}>{statusLabel(itemStatus)}</option>)}
          </select>
        </div>
      </section>

      {loadError && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">Unable to load business content: {loadError}</div>}

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(360px,0.85fr)_minmax(680px,1.15fr)]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#111111]" aria-label="Submitted content">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="font-semibold">Submissions</h2>
              <p className="mt-1 text-xs text-gray-500">{filteredItems.length} matching posts</p>
            </div>
            {status === "SUBMITTED" && <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-300">Awaiting review</span>}
          </div>

          {loading ? (
            <p className="px-5 py-12 text-center text-sm text-gray-500">Loading business submissions...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Post</th>
                    <th className="px-3 py-3">Business</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Submitted</th>
                    <th className="px-5 py-3 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visibleItems.map((item) => {
                    const pending = ["SUBMITTED", "PENDING_REVIEW", "PENDING"].includes((item.status || "").toUpperCase())
                    return (
                      <tr key={item.id} className="align-top hover:bg-white/[0.02]">
                        <td className="max-w-[300px] px-5 py-4">
                          <p className="truncate font-medium text-white">{item.title || "Untitled post"}</p>
                          <p className="mt-1 text-xs text-gray-500">{item.type || "POST"} | {item.id}</p>
                        </td>
                        <td className="px-3 py-4 text-gray-300">{businessLabel(item)}</td>
                        <td className="px-3 py-4"><span className="rounded-full bg-white/5 px-2 py-1 text-xs text-gray-300">{statusLabel(item.status || "UNKNOWN")}</span></td>
                        <td className="whitespace-nowrap px-3 py-4 text-gray-500">{formatDate(item.created_at)}</td>
                        <td className="px-5 py-4">
                          {pending ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={workingId === item.id}
                                onClick={() => moderateContent(item, "PUBLISHED")}
                                className="rounded-md bg-yellow-400 px-3 py-2 text-xs font-semibold text-black hover:bg-yellow-300 disabled:opacity-50"
                              >
                                {workingId === item.id ? "Saving..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                disabled={workingId === item.id}
                                onClick={() => { setRejectItem(item); setReason("") }}
                                className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : <span className="block text-right text-xs text-gray-600">No action</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredItems.length === 0 && !loadError && <p className="px-5 py-12 text-center text-sm text-gray-500">No submissions match these filters.</p>}
              {filteredItems.length > 10 && (
                <div className="flex justify-center border-t border-white/5 py-3">
                  <button
                    type="button"
                    onClick={() => setShowAllSubmissions((expanded) => !expanded)}
                    className="text-sm font-medium text-yellow-400 hover:text-yellow-300"
                  >
                    {showAllSubmissions ? "See less..." : "See more..."}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.85fr)_minmax(300px,1.15fr)]">
        <aside className="rounded-xl border border-white/10 bg-[#111111] p-4" aria-label="Business post feed preview">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Post preview</h2>
              <p className="mt-1 text-xs text-gray-500">Approved posts | {approvedItems.length} posts</p>
            </div>
            <span className="text-xs text-gray-500">Scroll feed</span>
          </div>

          <div className="mx-auto w-full max-w-[340px] rounded-[2rem] border-[7px] border-[#252525] bg-[#252525] p-1.5 shadow-xl">
            <div className="overflow-hidden rounded-[1.45rem] bg-[#f0f2f5] text-[#1c1e21]">
              <div className="flex h-11 items-center justify-between border-b border-gray-200 bg-white px-4">
                <span className="font-bold tracking-tight text-[#202a36]">BuzzTap</span>
                <span className="text-xs font-medium text-gray-500">Business posts</span>
              </div>
              <div className="h-[570px] space-y-3 overflow-y-auto overscroll-contain p-2" aria-label="Scrollable customer feed">
                {approvedItems.map((item) => {
                  const mediaUrl = item.media_url || ""
                  const business = businessLabel(item)
                  return (
                    <article key={item.id} className="overflow-hidden rounded-lg border border-[#d8dce2] bg-white shadow-sm">
                      <div className="flex items-center gap-2.5 px-3 py-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-yellow-400 text-sm font-bold text-black" aria-hidden="true">{business.slice(0, 1).toUpperCase()}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{business}</p>
                          <p className="text-xs text-gray-500">{formatDate(item.created_at)} | {statusLabel(item.status || "")}</p>
                        </div>
                        <span className="text-lg leading-none text-gray-500" aria-hidden="true">...</span>
                      </div>

                      <div className="px-3 pb-3">
                        {item.title && <h3 className="text-base font-semibold leading-snug">{item.title}</h3>}
                        {(item.content || item.description) && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{item.content || item.description}</p>}
                      </div>

                      {mediaUrl && isImageUrl(mediaUrl) && (
                        <img src={mediaUrl} alt="Business post media" loading="lazy" className="max-h-72 w-full bg-gray-100 object-cover" />
                      )}
                      {mediaUrl && !isImageUrl(mediaUrl) && (
                        <a href={mediaUrl} target="_blank" rel="noreferrer" className="mx-3 mb-3 flex min-h-20 items-center justify-between rounded-md border border-gray-200 bg-[#f6f7f8] px-3 py-3 text-sm text-[#315b83] hover:bg-gray-100">
                          <span className="min-w-0 truncate">Open submitted media</span>
                          <span className="ml-3 shrink-0 text-xs">Open</span>
                        </a>
                      )}

                      <div className="mx-3 flex items-center justify-between border-b border-gray-200 py-2 text-xs text-gray-500">
                        <span>Like</span><span>Comment</span><span>Share</span>
                      </div>
                      {item.call_to_action && <div className="px-3 py-3"><span className="block rounded-md bg-[#1877f2] px-3 py-2 text-center text-sm font-semibold text-white">{item.call_to_action}</span></div>}
                    </article>
                  )
                })}
                {!loading && approvedItems.length === 0 && <p className="rounded-lg bg-white px-4 py-8 text-center text-sm text-gray-500">No approved posts to preview yet.</p>}
              </div>
            </div>
          </div>
        </aside>
        <section className="rounded-xl border border-white/10 bg-[#111111] p-4" aria-label="Create administrator post">
          <div className="mb-4 border-b border-white/10 pb-4">
            <h2 className="font-semibold">Create BuzzTap post</h2>
            <p className="mt-1 text-xs text-gray-500">Posts publish immediately and appear in Submissions.</p>
          </div>
          <form onSubmit={publishAdminPost} className="space-y-3">
            <label className="block text-xs font-medium text-gray-400">
              Title
              <input
                value={adminPost.title}
                onChange={(event) => setAdminPost((post) => ({ ...post, title: event.target.value }))}
                maxLength={120}
                required
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                placeholder="Post title"
              />
            </label>
            <label className="block text-xs font-medium text-gray-400">
              Content type
              <select
                value={adminPost.type}
                onChange={(event) => setAdminPost((post) => ({ ...post, type: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
              >
                {types.map((itemType) => <option key={itemType} value={itemType}>{itemType}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-400">
              Post content
              <textarea
                value={adminPost.content}
                onChange={(event) => setAdminPost((post) => ({ ...post, content: event.target.value }))}
                rows={5}
                required
                className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                placeholder="Write the post..."
              />
            </label>
            <label className="block text-xs font-medium text-gray-400">
              Media URL
              <input
                type="url"
                value={adminPost.mediaUrl}
                onChange={(event) => setAdminPost((post) => ({ ...post, mediaUrl: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                placeholder="https://..."
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-gray-400">
                Start date
                <input
                  type="date"
                  value={adminPost.startDate}
                  onChange={(event) => setAdminPost((post) => ({ ...post, startDate: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#080808] px-2 py-2.5 text-xs text-white outline-none focus:border-yellow-400"
                />
              </label>
              <label className="block text-xs font-medium text-gray-400">
                End date
                <input
                  type="date"
                  value={adminPost.endDate}
                  onChange={(event) => setAdminPost((post) => ({ ...post, endDate: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#080808] px-2 py-2.5 text-xs text-white outline-none focus:border-yellow-400"
                />
              </label>
            </div>
            <label className="block text-xs font-medium text-gray-400">
              Call to action
              <input
                value={adminPost.callToAction}
                onChange={(event) => setAdminPost((post) => ({ ...post, callToAction: event.target.value }))}
                maxLength={80}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400"
                placeholder="Optional button label"
              />
            </label>
            <button
              type="submit"
              disabled={publishing}
              className="w-full rounded-lg bg-yellow-400 px-4 py-3 text-sm font-semibold text-black hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60"
            >
              {publishing ? "Publishing..." : "Publish post"}
            </button>
          </form>
        </section>
        </div>
      </div>

      {rejectItem && (
        <Modal title="Reject business post" onClose={() => setRejectItem(null)}>
          <p className="mb-4 text-sm text-gray-400">Add a reason so the business can understand what needs to change.</p>
          <label className="text-sm text-gray-300" htmlFor="rejection-reason">Rejection reason</label>
          <textarea
            id="rejection-reason"
            rows="4"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#080808] p-3 text-sm text-white outline-none focus:border-yellow-400"
            placeholder="Explain why this post cannot be approved."
            autoFocus
          />
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setRejectItem(null)} className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300">Cancel</button>
            <button type="button" onClick={rejectContent} disabled={workingId === rejectItem.id} className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {workingId === rejectItem.id ? "Saving..." : "Reject post"}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}

export default ContentManagement