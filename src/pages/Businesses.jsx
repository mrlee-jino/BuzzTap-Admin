import { useEffect, useState } from "react"
import Modal from "../components/Modal"
import Toast from "../components/Toast"
import DropdownMenu from "../components/DropdownMenu"
import ConfirmModal from "../components/ConfirmModal"
import { supabase } from "../lib/supabaseClient"

const formatDisplayDate = (value) => {
  if (!value) return "N/A"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "N/A"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

const normalizeStatus = (status) => {
  const normalized = String(status || "").trim().toUpperCase()

  switch (normalized) {
    case "PENDING":
      return "Pending"
    case "ACTIVE":
      return "Active"
    case "SUSPENDED":
      return "Suspended"
    case "CLOSED":
      return "Closed"
    default:
      return "Pending"
  }
}

const normalizeBusiness = (business) => ({
  ...business,
  name: business.name || "Unnamed Business",
  type: business.business_type || business.type || "Unknown",
  location: business.address || business.location || "N/A",
  owner: business.owner || "Business owner",
  email: business.email || "",
  phone: business.phone || "",
  stations: business.stations == null ? null : Number(business.stations),
  status: normalizeStatus(business.status),
  joined: formatDisplayDate(business.created_at),
})

function Businesses() {
  const [businesses, setBusinesses] = useState([])
  const [filter, setFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [openMenuId, setOpenMenuId] = useState(null)
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [businessMembers, setBusinessMembers] = useState([])
  const [wallets, setWallets] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [messageTitle, setMessageTitle] = useState("")
  const [messageBody, setMessageBody] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [supabaseError, setSupabaseError] = useState("")
  const [toast, setToast] = useState("")
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchBusinesses = async () => {
      setLoading(true)
      setSupabaseError("")

      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        if (!isMounted) {
          return
        }

        setBusinesses((data ?? []).map(normalizeBusiness))
      } catch (fetchError) {
        if (isMounted) {
          setBusinesses([])
          setSupabaseError(fetchError.message || "Unable to load businesses.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchBusinesses()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedBusiness?.id) return undefined

    let active = true

    async function loadBusinessDetails() {
      const [membersResult, walletsResult] = await Promise.all([
        supabase
          .from("business_members")
          .select("id, user_id, role, status, created_at, profile:profiles(id, full_name, email, phone, status)")
          .eq("business_id", selectedBusiness.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("buzzpoint_wallets")
          .select("id, wallet_type, status, created_at")
          .eq("business_id", selectedBusiness.id)
          .order("created_at", { ascending: false }),
      ])

      if (!active) return

      if (membersResult.error || walletsResult.error) {
        setDetailError(membersResult.error?.message || walletsResult.error?.message || "Unable to load all business details.")
      }
      setBusinessMembers(membersResult.data || [])
      setWallets(walletsResult.data || [])
      setDetailLoading(false)
    }

    loadBusinessDetails().catch((error) => {
      if (active) {
        setDetailError(error.message || "Unable to load business details.")
        setDetailLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [selectedBusiness])

  const filteredBusinesses = businesses.filter((business) => {
    const query = search.toLowerCase()
    return (filter === "All" || business.status === filter) && [business.name, business.location, business.type, business.owner].some((value) => value.toLowerCase().includes(query))
  })
  const changeStatus = () => { setBusinesses((current) => current.map((item) => item.name === confirm.business.name ? { ...item, status: confirm.status } : item)); setToast(`Business ${confirm.status.toLowerCase()}`); setConfirm(null) }
  const actionOptions = (business) => [
    business.status === "Suspended" ? { label: "Activate", onClick: () => setConfirm({ business, status: "Active" }) } : { label: "Suspend", onClick: () => setConfirm({ business, status: "Suspended" }), destructive: true },
  ]

  const sendBusinessMessage = async (event) => {
    event.preventDefault()
    if (!selectedBusiness?.id || !messageTitle.trim() || !messageBody.trim()) return

    setSendingMessage(true)
    const { data: userResult, error: userError } = await supabase.auth.getUser()
    if (userError || !userResult.user) {
      setSendingMessage(false)
      setToast("Your admin session could not be verified. Sign in again and retry.")
      return
    }

    const { error } = await supabase.from("business_notifications").insert({
      business_id: selectedBusiness.id,
      created_by: userResult.user.id,
      title: messageTitle.trim(),
      message: messageBody.trim(),
    })

    setSendingMessage(false)
    if (error) {
      setToast(error.message || "Unable to send the business notification.")
      return
    }

    setMessageTitle("")
    setMessageBody("")
    setToast(`Notification sent to ${selectedBusiness.name}.`)
  }

  const stats = [
    {
      title: "Total Businesses",
      value: businesses.length,
    },
    {
      title: "Active",
      value: businesses.filter((business) => business.status === "Active").length,
    },
    {
      title: "Pending",
      value: businesses.filter((business) => business.status === "Pending").length,
    },
    {
      title: "Suspended",
      value: businesses.filter((business) => business.status === "Suspended").length,
    },
  ]

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

        <div>
          <p className="text-sm font-medium tracking-[0.25em] text-yellow-400">
            PLATFORM MANAGEMENT
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Businesses
          </h1>

          <p className="mt-2 text-gray-500">
            Manage businesses connected to the BuzzTap platform.
          </p>
        </div>
      </div>


      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition duration-300 hover:border-yellow-400/20"
          >

            <p className="text-sm text-gray-500">
              {stat.title}
            </p>

            <p className="mt-2 text-3xl font-bold">
              {stat.value}
            </p>

          </div>
        ))}

      </div>


      {/* Search and Filters */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#111111] p-4">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          <input
            type="text"
            placeholder="Search businesses..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 transition focus:border-yellow-400/50 lg:max-w-md"
          />

          <div className="flex gap-2 overflow-x-auto">

            {["All", "Active", "Pending", "Suspended"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${filter === item ? "bg-yellow-400 font-medium text-black" : "bg-[#181818] text-gray-400 hover:bg-[#222222] hover:text-white"}`}>{item}</button>)}

          </div>

        </div>

      </div>

      {loading && <div className="mt-6 rounded-2xl border border-dashed border-yellow-400/30 bg-[#111111] px-6 py-5 text-center text-sm text-yellow-400">Loading businesses from Supabase...</div>}
      {!loading && supabaseError && <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-4 text-sm text-red-300">{supabaseError}</div>}

      {/* Business Table */}
      {!loading && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">

          {/* Table Header */}
          <div className="hidden grid-cols-[2fr_1.3fr_1.6fr_1fr_0.6fr] border-b border-white/10 px-6 py-4 text-xs uppercase tracking-wider text-gray-600 md:grid">

            <span>Business</span>
            <span>Type</span>
            <span>Location</span>
            <span>Status</span>
            <span></span>

          </div>


          {/* Businesses */}
          <div className="divide-y divide-white/5">

            {filteredBusinesses.map((business) => (

              <div
                key={business.id || business.name}
                className="grid grid-cols-1 gap-4 px-6 py-5 transition duration-200 hover:bg-white/[0.02] md:grid-cols-[2fr_1.3fr_1.6fr_1fr_0.6fr] md:items-center"
              >

                {/* Business */}
                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 font-bold text-yellow-400">
                    B
                  </div>

                  <div>

                    <button type="button" onClick={() => { setSelectedBusiness(business); setOpenMenuId(null); setDetailLoading(true); setDetailError(""); setBusinessMembers([]); setWallets([]); setMessageTitle(""); setMessageBody("") }} className="text-left font-medium text-white hover:text-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
                      {business.name}
                    </button>

                    <p className="mt-1 text-xs text-gray-600">
                      Joined {business.joined}
                    </p>

                  </div>

                </div>


                {/* Type */}
                <div>

                  <span className="text-sm text-gray-400">
                    {business.type}
                  </span>

                </div>


                {/* Location */}
                <div>

                  <span className="text-sm text-gray-500">
                    {business.location}
                  </span>

                </div>


                {/* Status */}
                <div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      business.status === "Active"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : business.status === "Pending"
                        ? "bg-orange-400/10 text-orange-400"
                        : "bg-red-400/10 text-red-400"
                    }`}
                  >
                    <span className="mr-1.5">
                      •
                    </span>

                    {business.status}
                  </span>

                </div>


                {/* Action */}
                <div className="flex justify-start md:justify-end">

                  <div className="relative"><button onClick={() => setOpenMenuId(openMenuId === business.id ? null : business.id)} className="rounded-lg px-3 py-2 text-gray-500 transition hover:bg-white/5 hover:text-yellow-400" aria-label={`Actions for ${business.name}`}>
                    ⋮
                  </button>{openMenuId === business.id && <DropdownMenu options={actionOptions(business)} onSelect={(option) => { option.onClick(); setOpenMenuId(null) }} />}</div>

                </div>

              </div>

            ))}

          </div>
          {filteredBusinesses.length === 0 && <div className="px-6 py-12 text-center text-gray-500">No businesses found.</div>}

        </div>
      )}

      {selectedBusiness && (
        <Modal wide title={`${selectedBusiness.name} details`} onClose={() => setSelectedBusiness(null)}>
          <div className="space-y-6">
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold">{selectedBusiness.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{selectedBusiness.type} · Joined {selectedBusiness.joined}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedBusiness.status === "Active" ? "bg-yellow-400/10 text-yellow-300" : selectedBusiness.status === "Pending" ? "bg-orange-400/10 text-orange-300" : "bg-red-400/10 text-red-300"}`}>
                  {selectedBusiness.status}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-[#080808] p-4 sm:grid-cols-2">
                <div><dt className="text-xs text-gray-500">Address</dt><dd className="mt-1 text-sm text-gray-200">{selectedBusiness.address || selectedBusiness.location || "Not provided"}</dd></div>
                <div><dt className="text-xs text-gray-500">Business type</dt><dd className="mt-1 text-sm text-gray-200">{selectedBusiness.type}</dd></div>
                <div><dt className="text-xs text-gray-500">Email</dt><dd className="mt-1 break-all text-sm text-gray-200">{selectedBusiness.email || "Not provided"}</dd></div>
                <div><dt className="text-xs text-gray-500">Phone</dt><dd className="mt-1 text-sm text-gray-200">{selectedBusiness.phone || "Not provided"}</dd></div>
                <div><dt className="text-xs text-gray-500">Business ID</dt><dd className="mt-1 break-all font-mono text-xs text-gray-400">{selectedBusiness.id}</dd></div>
              </dl>
            </section>

            {detailLoading && <p className="text-sm text-yellow-300">Loading members and BuzzPoints status...</p>}
            {detailError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">Some details could not be loaded: {detailError}</p>}

            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">BuzzPoints status</h3>
                <span className="text-xs text-gray-500">{wallets.length} wallet records</span>
              </div>
              {wallets.length > 0 ? (
                <div className="divide-y divide-white/5 rounded-lg border border-white/10 bg-[#080808]">
                  {wallets.map((wallet) => (
                    <div key={wallet.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div><p className="text-sm font-medium text-gray-200">{wallet.wallet_type || "Business wallet"}</p><p className="mt-1 text-xs text-gray-500">Created {formatDisplayDate(wallet.created_at)}</p></div>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-300">{wallet.status || "Unknown status"}</span>
                    </div>
                  ))}
                </div>
              ) : !detailLoading && <p className="rounded-lg border border-white/10 bg-[#080808] px-4 py-5 text-sm text-gray-500">No BuzzPoints wallet records found for this business.</p>}
            </section>

            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">Business members</h3>
                <span className="text-xs text-gray-500">{businessMembers.length} members</span>
              </div>
              {businessMembers.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Name / account</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Member status</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {businessMembers.map((member) => (
                        <tr key={member.id}>
                          <td className="px-4 py-3"><p className="font-medium text-gray-200">{member.profile?.full_name || "Unnamed member"}</p><p className="mt-1 text-xs text-gray-500">{member.profile?.email || member.user_id}</p>{member.profile?.phone && <p className="mt-1 text-xs text-gray-500">{member.profile.phone}</p>}</td>
                          <td className="px-3 py-3 text-gray-300">{member.role || "Member"}</td>
                          <td className="px-3 py-3 text-gray-400">{member.status || member.profile?.status || "Unknown"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !detailLoading && <p className="rounded-lg border border-white/10 bg-[#080808] px-4 py-5 text-sm text-gray-500">No business members found.</p>}
            </section>

            <section className="border-t border-white/10 pt-5">
              <h3 className="font-semibold">Message this business</h3>
              <p className="mt-1 text-sm text-gray-500">Send a notification to this business. It will be available to the business web when its inbox is connected.</p>
              <form onSubmit={sendBusinessMessage} className="mt-4 space-y-3">
                <label className="block text-sm text-gray-300">Notification title
                  <input value={messageTitle} onChange={(event) => setMessageTitle(event.target.value)} maxLength={120} required className="mt-2 w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400" placeholder="Important update" />
                </label>
                <label className="block text-sm text-gray-300">Message
                  <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} rows={4} required className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400" placeholder="Write your message to this business..." />
                </label>
                <div className="flex justify-end">
                  <button type="submit" disabled={sendingMessage} className="rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60">
                    {sendingMessage ? "Sending..." : "Send message"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </Modal>
      )}
      {confirm && <ConfirmModal title={`${confirm.status} business?`} description={`This will change ${confirm.business.name} to ${confirm.status}.`} confirmLabel={confirm.status} destructive={confirm.status === "Suspended"} onConfirm={changeStatus} onClose={() => setConfirm(null)} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

    </div>
  )
}

export default Businesses