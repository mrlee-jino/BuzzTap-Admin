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
  stations: Number(business.stations ?? 0),
  status: normalizeStatus(business.status),
  joined: formatDisplayDate(business.created_at),
})

function Businesses() {
  const [businesses, setBusinesses] = useState([])
  const [filter, setFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: "", location: "", type: "Cafe", owner: "", email: "", phone: "", stations: "", status: "Pending" })
  const [error, setError] = useState("")
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

  const filteredBusinesses = businesses.filter((business) => {
    const query = search.toLowerCase()
    return (filter === "All" || business.status === filter) && [business.name, business.location, business.type, business.owner].some((value) => value.toLowerCase().includes(query))
  })
  const openAdd = () => { setForm({ name: "", location: "", type: "Cafe", owner: "", email: "", phone: "", stations: "", status: "Pending" }); setError(""); setModal("add") }
  const saveBusiness = (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.location.trim() || !form.owner.trim() || !form.stations || Number(form.stations) < 1) { setError("Name, location, owner, and a positive station count are required."); return }
    const business = { ...form, stations: Number(form.stations), joined: "Today" }
    setBusinesses((current) => modal === "edit" ? current.map((item) => item.name === form.originalName ? { ...item, ...business, status: item.status } : item) : [business, ...current])
    setModal(null); setToast(modal === "edit" ? "Business updated" : "Business added successfully.")
  }
  const changeStatus = () => { setBusinesses((current) => current.map((item) => item.name === confirm.business.name ? { ...item, status: confirm.status } : item)); setToast(`Business ${confirm.status.toLowerCase()}`); setConfirm(null) }
  const actionOptions = (business) => [
    { label: "View Details", onClick: () => setModal(business.name) },
    { label: "Edit", onClick: () => { setForm({ ...business, originalName: business.name }); setModal("edit") } },
    business.status === "Suspended" ? { label: "Activate", onClick: () => setConfirm({ business, status: "Active" }) } : { label: "Suspend", onClick: () => setConfirm({ business, status: "Suspended" }), destructive: true },
  ]

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

          <button onClick={openAdd} className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(250,204,21,0.2)]">
          + Add Business
        </button>

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
          <div className="hidden grid-cols-[2fr_1.3fr_1fr_0.8fr_1fr_0.6fr] border-b border-white/10 px-6 py-4 text-xs uppercase tracking-wider text-gray-600 md:grid">

            <span>Business</span>
            <span>Type</span>
            <span>Location</span>
            <span>Stations</span>
            <span>Status</span>
            <span></span>

          </div>


          {/* Businesses */}
          <div className="divide-y divide-white/5">

            {filteredBusinesses.map((business) => (

              <div
                key={business.id || business.name}
                className="grid grid-cols-1 gap-4 px-6 py-5 transition duration-200 hover:bg-white/[0.02] md:grid-cols-[2fr_1.3fr_1fr_0.8fr_1fr_0.6fr] md:items-center"
              >

                {/* Business */}
                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 font-bold text-yellow-400">
                    B
                  </div>

                  <div>

                    <p className="font-medium">
                      {business.name}
                    </p>

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


                {/* Stations */}
                <div>

                  <span className="font-medium">
                    {business.stations}
                  </span>

                  <span className="ml-1 text-xs text-gray-600">
                    stations
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

                  <div className="relative"><button onClick={() => setModal(modal === business.name ? null : business.name)} className="rounded-lg px-3 py-2 text-gray-500 transition hover:bg-white/5 hover:text-yellow-400" aria-label={`Actions for ${business.name}`}>
                    ⋮
                  </button>{modal === business.name && <DropdownMenu options={actionOptions(business)} onSelect={(option) => { option.onClick(); if (option.label !== "View Details") setModal(null) }} />}</div>

                </div>

              </div>

            ))}

          </div>
          {filteredBusinesses.length === 0 && <div className="px-6 py-12 text-center text-gray-500">No businesses found.</div>}

        </div>
      )}

      {(modal === "add" || modal === "edit") && <Modal title={modal === "add" ? "Add Business" : "Edit Business"} onClose={() => setModal(null)}><form onSubmit={saveBusiness} className="space-y-4"><input required placeholder="Business name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field" /><input required placeholder="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="field" /><input required placeholder="Owner" value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} className="field" /><input required type="email" placeholder="Email" value={form.email || ""} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field" /><input required placeholder="Phone" value={form.phone || ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="field" /><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="field"><option>Cafe</option><option>Computer Shop</option><option>Working Station</option></select><input required min="1" type="number" placeholder="Stations" value={form.stations} onChange={(event) => setForm({ ...form, stations: event.target.value })} className="field" /><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="field"><option>Active</option><option>Pending</option><option>Suspended</option></select>{error && <p className="text-sm text-red-400">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-gray-300">Cancel</button><button className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black">{modal === "add" ? "Add Business" : "Save Business"}</button></div></form></Modal>}
      {modal && !["add", "edit"].includes(modal) && <Modal title="Business Details" onClose={() => setModal(null)}><p className="text-lg font-semibold">{businesses.find((item) => item.name === modal)?.name}</p><p className="mt-2 text-gray-400">{businesses.find((item) => item.name === modal)?.owner} · {businesses.find((item) => item.name === modal)?.location}</p></Modal>}
      {confirm && <ConfirmModal title={`${confirm.status} business?`} description={`This will change ${confirm.business.name} to ${confirm.status}.`} confirmLabel={confirm.status} destructive={confirm.status === "Suspended"} onConfirm={changeStatus} onClose={() => setConfirm(null)} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

    </div>
  )
}

export default Businesses