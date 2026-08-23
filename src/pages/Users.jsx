import { useState } from "react"

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
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.id.toLowerCase().includes(search.toLowerCase()) ||
      user.business.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === "All" || user.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const activeUsers = users.filter(
    (user) => user.status === "Active"
  ).length

  const pendingUsers = users.filter(
    (user) => user.status === "Pending"
  ).length

  const suspendedUsers = users.filter(
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

        <button className="rounded-xl bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(250,204,21,0.25)]">
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

                    <button className="text-xl text-gray-500 transition hover:text-yellow-400">
                      ⋮
                    </button>

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

    </div>
  )
}

export default Users