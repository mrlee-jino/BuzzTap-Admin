import { useState } from "react"

const logs = [
  {
    id: "LOG-001",
    time: "10:42 PM",
    date: "Aug 23, 2026",
    type: "Transaction",
    action: "Transaction completed",
    description: "Transaction TXN-001284 was successfully completed.",
    actor: "System",
    target: "TXN-001284",
    status: "Success",
  },
  {
    id: "LOG-002",
    time: "10:40 PM",
    date: "Aug 23, 2026",
    type: "Device",
    action: "Device connected",
    description: "Device DEV-004 established a connection with BuzzTap.",
    actor: "System",
    target: "DEV-004",
    status: "Success",
  },
  {
    id: "LOG-003",
    time: "10:38 PM",
    date: "Aug 23, 2026",
    type: "NFC Card",
    action: "NFC card registered",
    description: "A new NFC card was registered and assigned to a customer.",
    actor: "Admin",
    target: "NFC-00082",
    status: "Success",
  },
  {
    id: "LOG-004",
    time: "10:35 PM",
    date: "Aug 23, 2026",
    type: "Business",
    action: "Business settings updated",
    description: "Business configuration was modified.",
    actor: "Business Admin",
    target: "CyberHub Gaming Station",
    status: "Success",
  },
  {
    id: "LOG-005",
    time: "10:31 PM",
    date: "Aug 23, 2026",
    type: "Authentication",
    action: "Admin login",
    description: "Administrator successfully logged into the platform.",
    actor: "Lee Tejones",
    target: "Admin Portal",
    status: "Success",
  },
  {
    id: "LOG-006",
    time: "10:25 PM",
    date: "Aug 23, 2026",
    type: "Device",
    action: "Device disconnected",
    description: "Device DEV-005 stopped responding.",
    actor: "System",
    target: "DEV-005",
    status: "Warning",
  },
  {
    id: "LOG-007",
    time: "10:18 PM",
    date: "Aug 23, 2026",
    type: "User",
    action: "User suspended",
    description: "User access was temporarily suspended.",
    actor: "Admin",
    target: "USR-005",
    status: "Warning",
  },
  {
    id: "LOG-008",
    time: "10:12 PM",
    date: "Aug 23, 2026",
    type: "Business",
    action: "Business registered",
    description: "A new business successfully joined the BuzzTap platform.",
    actor: "Admin",
    target: "Pixel Point",
    status: "Success",
  },
  {
    id: "LOG-009",
    time: "9:58 PM",
    date: "Aug 23, 2026",
    type: "System",
    action: "Database backup completed",
    description: "Scheduled platform database backup completed successfully.",
    actor: "System",
    target: "Database",
    status: "Success",
  },
  {
    id: "LOG-010",
    time: "9:44 PM",
    date: "Aug 23, 2026",
    type: "Authentication",
    action: "Failed login attempt",
    description: "An unsuccessful administrator login attempt was detected.",
    actor: "Unknown",
    target: "Admin Portal",
    status: "Failed",
  },
]

function SystemLogs() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.id.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase())

    const matchesType =
      typeFilter === "All" || log.type === typeFilter

    const matchesStatus =
      statusFilter === "All" || log.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const successfulLogs = logs.filter(
    (log) => log.status === "Success"
  ).length

  const warningLogs = logs.filter(
    (log) => log.status === "Warning"
  ).length

  const failedLogs = logs.filter(
    (log) => log.status === "Failed"
  ).length

  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <p className="text-sm font-bold tracking-[0.25em] text-yellow-400">
            PLATFORM AUDIT
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            System Logs
          </h1>

          <p className="mt-2 text-gray-500">
            Monitor important activities and events across BuzzTap.
          </p>

        </div>

        <button
          onClick={() => {
            setSearch("")
            setTypeFilter("All")
            setStatusFilter("All")
          }}
          className="rounded-xl border border-white/10 bg-[#111111] px-5 py-3 text-sm text-gray-400 transition hover:border-yellow-400/30 hover:text-white"
        >
          Clear Filters
        </button>

      </div>


      {/* Statistics */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Successful Events
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {successfulLogs}
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            Normal platform activity
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Warnings
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {warningLogs}
          </h2>

          <p className="mt-2 text-xs text-orange-400">
            Requires attention
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Failed Events
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {failedLogs}
          </h2>

          <p className="mt-2 text-xs text-red-400">
            Potential issues
          </p>

        </div>

      </div>


      {/* Filters */}

      <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">

        <div className="flex flex-col gap-4">

          {/* Search */}

          <input
            type="text"
            placeholder="Search logs, users, devices, transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400"
          />


          {/* Filters */}

          <div className="flex flex-wrap gap-2">

            {[
              "All",
              "Transaction",
              "Device",
              "NFC Card",
              "Business",
              "User",
              "Authentication",
              "System",
            ].map((type) => (

              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  typeFilter === type
                    ? "bg-yellow-400 font-semibold text-black"
                    : "bg-[#181818] text-gray-400 hover:bg-[#222222] hover:text-white"
                }`}
              >
                {type}
              </button>

            ))}

          </div>


          {/* Status Filters */}

          <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">

            {["All", "Success", "Warning", "Failed"].map((status) => (

              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  statusFilter === status
                    ? "bg-white text-black"
                    : "bg-[#181818] text-gray-500 hover:text-white"
                }`}
              >
                {status}
              </button>

            ))}

          </div>

        </div>

      </div>


      {/* Logs */}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">

        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

          <div>

            <h2 className="font-semibold">
              Activity Log
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Showing {filteredLogs.length} of {logs.length} events.
            </p>

          </div>

          <div className="hidden text-xs text-gray-600 sm:block">
            Latest events first
          </div>

        </div>


        <div>

          {filteredLogs.map((log) => (

            <div
              key={log.id}
              className="border-b border-white/5 px-6 py-5 transition hover:bg-white/[0.02]"
            >

              <div className="flex gap-4">

                {/* Timeline Icon */}

                <div className="flex flex-col items-center">

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      log.status === "Success"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : log.status === "Warning"
                        ? "bg-orange-400/10 text-orange-400"
                        : "bg-red-400/10 text-red-400"
                    }`}
                  >
                    {log.status === "Success" && "✓"}
                    {log.status === "Warning" && "!"}
                    {log.status === "Failed" && "×"}
                  </div>

                </div>


                {/* Content */}

                <div className="min-w-0 flex-1">

                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="font-semibold">
                          {log.action}
                        </h3>

                        <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500">
                          {log.type}
                        </span>

                      </div>

                      <p className="mt-2 text-sm text-gray-500">
                        {log.description}
                      </p>

                    </div>


                    {/* Time */}

                    <div className="shrink-0 text-left lg:text-right">

                      <p className="text-sm text-gray-400">
                        {log.time}
                      </p>

                      <p className="mt-1 text-xs text-gray-600">
                        {log.date}
                      </p>

                    </div>

                  </div>


                  {/* Metadata */}

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">

                    <span className="text-gray-600">
                      Log ID:
                      <span className="ml-1 font-mono text-gray-500">
                        {log.id}
                      </span>
                    </span>

                    <span className="text-gray-600">
                      Actor:
                      <span className="ml-1 text-gray-400">
                        {log.actor}
                      </span>
                    </span>

                    <span className="text-gray-600">
                      Target:
                      <span className="ml-1 font-mono text-gray-500">
                        {log.target}
                      </span>
                    </span>

                    <span
                      className={`font-semibold ${
                        log.status === "Success"
                          ? "text-yellow-400"
                          : log.status === "Warning"
                          ? "text-orange-400"
                          : "text-red-400"
                      }`}
                    >
                      {log.status}
                    </span>

                  </div>

                </div>

              </div>

            </div>

          ))}

        </div>


        {/* Empty State */}

        {filteredLogs.length === 0 && (

          <div className="px-6 py-16 text-center">

            <div className="text-4xl">
              ◌
            </div>

            <p className="mt-4 text-gray-400">
              No logs found.
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Try changing your search or filters.
            </p>

          </div>

        )}

      </div>

    </div>
  )
}

export default SystemLogs