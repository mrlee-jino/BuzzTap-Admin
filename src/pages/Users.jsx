import { useState } from "react"
import Modal from "../components/Modal"
import Toast from "../components/Toast"
import DropdownMenu from "../components/DropdownMenu"
import ConfirmModal from "../components/ConfirmModal"

const users = [
  {
    id: "USR-001",
    name: "Juan Dela Cruz",
    email: "juan.delacruz@email.com",
    role: "Business Staff",
    business: "CyberHub Gaming Station",
    lastActive: "Just now",
    joined: "Aug 12, 2026",
    status: "Active",
  },
  {
    id: "USR-002",
    name: "Maria Santos",
    email: "maria.santos@email.com",
    role: "Business Owner",
    business: "Bean & Byte Cafe",
    lastActive: "5 minutes ago",
    joined: "Aug 10, 2026",
    status: "Active",
  },
  {
    id: "USR-003",
    name: "Alex Reyes",
    email: "alex.reyes@email.com",
    role: "Business Staff",
    business: "NextLevel Computer Shop",
    lastActive: "18 minutes ago",
    joined: "Aug 8, 2026",
    status: "Active",
  },
  {
    id: "USR-004",
    name: "Carlo Santos",
    email: "carlo.santos@email.com",
    role: "Business Owner",
    business: "Pixel Point",
    lastActive: "2 hours ago",
    joined: "Aug 5, 2026",
    status: "Pending",
  },
  {
    id: "USR-005",
    name: "Angela Cruz",
    email: "angela.cruz@email.com",
    role: "Business Staff",
    business: "CyberHub Gaming Station",
    lastActive: "Yesterday",
    joined: "Jul 29, 2026",
    status: "Suspended",
  },
  {
    id: "USR-006",
    name: "Mark Villanueva",
    email: "mark.villanueva@email.com",
    role: "Business Owner",
    business: "Bean & Byte Cafe",
    lastActive: "Today, 1:32 PM",
    joined: "Jul 25, 2026",
    status: "Active",
  },
  {
    id: "USR-007",
    name: "Lee Tejones",
    email: "lee.tejones@email.com",
    role: "Platform Admin",
    business: "BuzzTap",
    lastActive: "Today, 10:31 PM",
    joined: "Jul 20, 2026",
    status: "Active",
  },
]

function Users() {
  const [records, setRecords] = useState(users)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: "", email: "", business: "", role: "Business Staff", status: "Pending" })
  const [toast, setToast] = useState("")
  const [confirm, setConfirm] = useState(null)

  const filteredUsers = records.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.id.toLowerCase().includes(search.toLowerCase()) ||
      user.business.toLowerCase().includes(search.toLowerCase()) ||
      user.role.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === "All" || user.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const activeUsers = records.filter(
    (user) => user.status === "Active"
  ).length

  const pendingUsers = records.filter(
    (user) => user.status === "Pending"
  ).length

  const suspendedUsers = records.filter(
    (user) => user.status === "Suspended"
  ).length

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-sm font-bold tracking-[0.25em] text-yellow-400">
            PLATFORM MANAGEMENT
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Users
          </h1>

          <p className="mt-2 text-gray-500">
            Manage BuzzTap platform users and their access.
          </p>
        </div>

        <button onClick={() => setModal("add")} className="rounded-xl bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(250,204,21,0.25)]">
          + Add User
        </button>

      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Active Users
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {activeUsers}
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            Currently active
          </p>

        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Pending Users
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {pendingUsers}
          </h2>

          <p className="mt-2 text-xs text-orange-400">
            Awaiting approval
          </p>

        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Suspended Users
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {suspendedUsers}
          </h2>

          <p className="mt-2 text-xs text-red-400">
            Access restricted
          </p>

        </div>

      </div>

      {/* Search + Filters */}
      <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <input
            type="text"
            placeholder="Search user, email, business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400 lg:w-[420px]"
          />

          <div className="flex flex-wrap gap-2">

            {["All", "Active", "Pending", "Suspended"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  statusFilter === status
                    ? "bg-yellow-400 font-semibold text-black"
                    : "bg-[#181818] text-gray-400 hover:bg-[#222222] hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}

          </div>

        </div>

      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">

          <h2 className="font-semibold">
            Platform Users
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Users registered across BuzzTap businesses.
          </p>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1100px]">

            <thead>

              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-600">

                <th className="px-6 py-4">
                  User
                </th>

                <th className="px-6 py-4">
                  Role
                </th>

                <th className="px-6 py-4">
                  Business
                </th>

                <th className="px-6 py-4">
                  Last Active
                </th>

                <th className="px-6 py-4">
                  Joined
                </th>

                <th className="px-6 py-4">
                  Status
                </th>

                <th className="px-6 py-4">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredUsers.map((user) => (

                <tr
                  key={user.id}
                  className="border-b border-white/5 transition hover:bg-white/[0.02]"
                >

                  {/* User */}
                  <td className="px-6 py-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10 font-bold text-yellow-400">
                        {user.name
                          .split(" ")
                          .map((name) => name[0])
                          .join("")
                          .slice(0, 2)}
                      </div>

                      <div>

                        <p className="font-semibold text-white">
                          {user.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-600">
                          {user.id}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {user.email}
                        </p>

                      </div>

                    </div>

                  </td>

                  {/* Role */}
                  <td className="px-6 py-5">

                    <span className="rounded-lg bg-white/5 px-3 py-1 text-xs text-gray-400">
                      {user.role}
                    </span>

                  </td>

                  {/* Business */}
                  <td className="px-6 py-5">

                    <p className="text-sm text-gray-300">
                      {user.business}
                    </p>

                  </td>

                  {/* Last Active */}
                  <td className="px-6 py-5">

                    <p className="text-sm text-gray-400">
                      {user.lastActive}
                    </p>

                  </td>

                  {/* Joined */}
                  <td className="px-6 py-5">

                    <p className="text-sm text-gray-400">
                      {user.joined}
                    </p>

                  </td>

                  {/* Status */}
                  <td className="px-6 py-5">

                    {user.status === "Active" && (
                      <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                        ● Active
                      </span>
                    )}

                    {user.status === "Pending" && (
                      <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-400">
                        ● Pending
                      </span>
                    )}

                    {user.status === "Suspended" && (
                      <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-400">
                        ● Suspended
                      </span>
                    )}

                  </td>

                  {/* Action */}
                  <td className="px-6 py-5">

                    <button onClick={() => setModal({ type: "menu", user })} className="text-xl text-gray-500 transition hover:text-yellow-400" aria-label={`Actions for ${user.name}`}>
                      ⋮
                    </button>
                    {modal?.type === "menu" && modal.user.id === user.id && <DropdownMenu options={[{ label: "View Profile", onClick: () => setModal({ type: "profile", user }) }, { label: "Edit", onClick: () => { setForm({ name: user.name, email: user.email, business: user.business, role: user.role, status: user.status, originalId: user.id }); setModal({ type: "edit" }) } }, user.status === "Suspended" ? { label: "Activate", onClick: () => setConfirm({ user, status: "Active" }) } : { label: "Deactivate", onClick: () => setConfirm({ user, status: "Suspended" }), destructive: true }]} onSelect={(option) => { option.onClick(); if (option.label !== "View Profile") setModal(null) }} />}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        {filteredUsers.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No users found.
          </div>
        )}

      </div>

      {(modal === "add" || modal === "edit") && <Modal title={modal === "add" ? "Add User" : "Edit User"} onClose={() => setModal(null)}><form onSubmit={(event) => { event.preventDefault(); if (!form.name.trim() || !form.email.includes("@") || !form.business.trim()) { setToast("Please complete all required fields."); return } if (modal === "edit") { setRecords((current) => current.map((item) => item.id === form.originalId ? { ...item, ...form } : item)); setToast("User updated successfully.") } else { setRecords((current) => [{ ...form, id: `USR-${String(current.length + 1).padStart(3, "0")}`, lastActive: "Never", joined: "Today" }, ...current]); setToast("User added successfully.") } setModal(null) }} className="space-y-4"><input required placeholder="Full Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field" /><input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field" /><input required placeholder="Business" value={form.business} onChange={(event) => setForm({ ...form, business: event.target.value })} className="field" /><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="field"><option>Business Staff</option><option>Business Owner</option><option>Platform Admin</option></select><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="field"><option>Active</option><option>Pending</option><option>Suspended</option></select><div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-gray-300">Cancel</button><button className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black">{modal === "add" ? "Add User" : "Save User"}</button></div></form></Modal>}
      {modal?.type === "profile" && <Modal title="User Profile" onClose={() => setModal(null)}><p className="text-lg font-semibold">{modal.user.name}</p><p className="mt-2 text-gray-400">{modal.user.email} · {modal.user.role}</p></Modal>}
      {confirm && <ConfirmModal title={`${confirm.status} user?`} description={`This will change ${confirm.user.name}'s access.`} confirmLabel={confirm.status} destructive={confirm.status === "Suspended"} onConfirm={() => { setRecords((current) => current.map((item) => item.id === confirm.user.id ? { ...item, status: confirm.status } : item)); setConfirm(null); setToast(`User ${confirm.status.toLowerCase()}`) }} onClose={() => setConfirm(null)} />}{toast && <Toast message={toast} onClose={() => setToast("")} />}

    </div>
  )
}

export default Users