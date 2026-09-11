import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

const formatDisplayName = (profile) => {
  const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
  return fullName || "System"
}

const normalizeActionLabel = (action = "") => {
  const cleanedAction = String(action || "").trim()

  if (!cleanedAction) {
    return "Audit event"
  }

  return cleanedAction
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ")
}

const mapTargetType = (targetType) => {
  switch (String(targetType || "").toUpperCase()) {
    case "TRANSACTION":
      return "Transaction"
    case "DEVICE":
      return "Device"
    case "NFC_CARD":
      return "NFC Card"
    case "BUSINESS":
      return "Business"
    case "USER":
      return "User"
    case "CUSTOMER":
      return "User"
    case "AUTHENTICATION":
      return "Authentication"
    case "SYSTEM":
      return "System"
    default:
      return "System"
  }
}

const pickDetail = (details, keys) => {
  for (const key of keys) {
    const value = details?.[key]
    if (value !== undefined && value !== null && value !== "") {
      return value
    }
  }

  return ""
}

const buildTargetLabel = (log, details) => {
  const targetType = String(log?.target_type || "").toUpperCase()
  const cardCode = pickDetail(details, ["card_code", "new_card_code", "old_card_code", "nfc_card_code"])
  const customerName = pickDetail(details, ["customer_name", "customer_full_name", "to_customer_name", "from_customer_name", "full_name"])
  const authTarget = pickDetail(details, ["target_name", "target_label", "portal_name", "app_name", "resource", "admin_portal", "admin_portal_name", "system_name"])

  if (targetType === "NFC_CARD" && cardCode) {
    return String(cardCode)
  }

  if (targetType === "CUSTOMER" && customerName) {
    return String(customerName)
  }

  if (targetType === "AUTHENTICATION") {
    return authTarget || "Admin Portal"
  }

  if (log?.target_id) {
    return String(log.target_id)
  }

  return targetType || "Audit record"
}

const buildDescription = (log, details, actorNameOverride) => {
  const action = String(log?.action || "").toUpperCase()
  const detailsObject = details && typeof details === "object" ? details : {}

  const cardCode = pickDetail(detailsObject, ["card_code", "new_card_code", "old_card_code", "nfc_card_code"])
  const customerName = pickDetail(detailsObject, ["customer_name", "customer_full_name", "to_customer_name", "new_customer_name", "full_name"])
  const oldStatus = pickDetail(detailsObject, ["old_status", "previous_status"])
  const newStatus = pickDetail(detailsObject, ["new_status", "updated_status"])
  const fromCustomer = pickDetail(detailsObject, ["from_customer_name", "previous_customer_name"])
  const toCustomer = pickDetail(detailsObject, ["to_customer_name", "new_customer_name", "customer_name"])
  const actorName = actorNameOverride || pickDetail(detailsObject, ["actor_name", "actor_display_name", "admin_name", "name", "email"])
  const targetLabel = buildTargetLabel(log, detailsObject)

  if (action.includes("ADMIN_LOGIN") || action.includes("ADMIN_LOGOUT")) {
    const displayName = actorName || "Admin"
    const verb = action.includes("ADMIN_LOGIN") ? "logged in to" : "logged out of"
    const location = "the BuzzTap Admin Portal"
    return `${displayName} ${verb} ${location}.`
  }

  if (action.includes("NFC_CARD_TRANSFERRED")) {
    const fromLabel = fromCustomer || "the previous customer"
    const toLabel = toCustomer || customerName || "the new customer"
    return `${cardCode || targetLabel} was transferred from ${fromLabel} to ${toLabel}.`
  }

  if (action.includes("NFC_CARD_REPLACED")) {
    return `${cardCode || targetLabel} was replaced with ${pickDetail(detailsObject, ["new_card_code", "replacement_card_code"]) || "the new card"}.`
  }

  if (action.includes("NFC_CARD_ASSIGNED")) {
    return `${cardCode || targetLabel} was assigned to ${customerName || "the customer"}.`
  }

  if (action.includes("NFC_CARD_STATUS_CHANGED")) {
    return `${cardCode || targetLabel} status changed from ${oldStatus || "UNKNOWN"} to ${newStatus || "UNKNOWN"}.`
  }

  if (action.includes("CUSTOMER_STATUS_CHANGED")) {
    return `Customer status changed from ${oldStatus || "UNKNOWN"} to ${newStatus || "UNKNOWN"}.`
  }

  if (action.includes("CUSTOMER_PROFILE_UPDATED")) {
    return "Customer profile information was updated."
  }

  if (action.includes("USER_SUSPENDED")) {
    return "User access was suspended."
  }

  if (action.includes("BUSINESS_CREATED")) {
    return "A new business was created."
  }

  if (targetLabel && action) {
    return `${targetLabel} ${normalizeActionLabel(action).toLowerCase()}.`
  }

  return "An audit event was recorded for this target."
}

function SystemLogs() {
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState("")

  useEffect(() => {
    const fetchSystemLogs = async () => {
      setLoading(true)
      setFetchError("")

      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select(`
            id,
            actor_user_id,
            action,
            target_type,
            target_id,
            details,
            created_at
          `)
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        const actorIds = [...new Set((data || []).map((log) => log.actor_user_id).filter(Boolean))]
        let profileMap = new Map()

        if (actorIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", actorIds)

          if (profileError) {
            throw profileError
          }

          profiles.forEach((profile) => {
            profileMap.set(profile.id, formatDisplayName(profile))
          })
        }

        const normalizedLogs = (data || []).map((log) => {
          const details = log.details && typeof log.details === "object" ? log.details : {}
          const createdAt = log.created_at ? new Date(log.created_at) : new Date()
          const actor = log.actor_user_id
            ? profileMap.get(log.actor_user_id) || "Unknown Admin"
            : "System"

          const logDetails = {
            ...details,
            actor_name: actor,
            actor_display_name: actor,
          }

          return {
            id: log.id || "AUDIT",
            time: new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }).format(createdAt),
            date: new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(createdAt),
            type: mapTargetType(log.target_type),
            action: normalizeActionLabel(log.action),
            description: buildDescription(log, logDetails, actor),
            actor,
            target: buildTargetLabel(log, logDetails),
            status: "Success",
          }
        })

        setLogs(normalizedLogs)
      } catch (error) {
        setLogs([])
        setFetchError(error.message || "Unable to load system logs from Supabase.")
      } finally {
        setLoading(false)
      }
    }

    fetchSystemLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    const searchValue = [log.id, log.action, log.description, log.actor, log.target]
      .map((value) => String(value ?? ""))
      .join(" ")
      .toLowerCase()

    const matchesSearch = searchValue.includes(search.toLowerCase())
    const matchesType = typeFilter === "All" || log.type === typeFilter
    const matchesStatus = statusFilter === "All" || log.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const successfulLogs = logs.filter((log) => log.status === "Success").length
  const warningLogs = logs.filter((log) => log.status === "Warning").length
  const failedLogs = logs.filter((log) => log.status === "Failed").length

  return (
    <div className="space-y-8">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <p className="text-sm text-gray-500">Successful Events</p>
          <h2 className="mt-3 text-3xl font-bold">{successfulLogs}</h2>
          <p className="mt-2 text-xs text-yellow-400">Normal platform activity</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <p className="text-sm text-gray-500">Warnings</p>
          <h2 className="mt-3 text-3xl font-bold">{warningLogs}</h2>
          <p className="mt-2 text-xs text-orange-400">Requires attention</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <p className="text-sm text-gray-500">Failed Events</p>
          <h2 className="mt-3 text-3xl font-bold">{failedLogs}</h2>
          <p className="mt-2 text-xs text-red-400">Potential issues</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Search logs, users, devices, transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400"
          />

          <div className="flex flex-wrap gap-2">
            {["All", "Transaction", "Device", "NFC Card", "Business", "User", "Authentication", "System"].map((type) => (
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

          <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
            {["All", "Success", "Warning", "Failed"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  statusFilter === status ? "bg-white text-black" : "bg-[#181818] text-gray-500 hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="font-semibold">Activity Log</h2>
            <p className="mt-1 text-sm text-gray-500">
              Showing {filteredLogs.length} of {logs.length} events.
            </p>
          </div>

          <div className="hidden text-xs text-gray-600 sm:block">Latest events first</div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-dashed border-yellow-400/30 bg-[#111111] px-6 py-5 text-center text-sm text-yellow-400">
            Loading system logs from Supabase...
          </div>
        )}

        {!loading && fetchError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-4 text-sm text-red-300">
            {fetchError}
          </div>
        )}

        {!loading && !fetchError && logs.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl">◌</div>
            <p className="mt-4 text-gray-400">No logs found.</p>
            <p className="mt-1 text-sm text-gray-600">No audit events have been recorded yet.</p>
          </div>
        )}

        {!loading && !fetchError && logs.length > 0 && filteredLogs.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="text-4xl">◌</div>
            <p className="mt-4 text-gray-400">No logs found.</p>
            <p className="mt-1 text-sm text-gray-600">Try changing your search or filters.</p>
          </div>
        )}

        {!loading && !fetchError && logs.length > 0 && filteredLogs.length > 0 && (
          <div>
            {filteredLogs.map((log) => (
              <div key={log.id} className="border-b border-white/5 px-6 py-5 transition hover:bg-white/[0.02]">
                <div className="flex gap-4">
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

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{log.action}</h3>
                          <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500">
                            {log.type}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-500">{log.description}</p>
                      </div>

                      <div className="shrink-0 text-left lg:text-right">
                        <p className="text-sm text-gray-400">{log.time}</p>
                        <p className="mt-1 text-xs text-gray-600">{log.date}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                      <span className="text-gray-600">
                        Log ID:
                        <span className="ml-1 font-mono text-gray-500">{log.id}</span>
                      </span>

                      <span className="text-gray-600">
                        Actor:
                        <span className="ml-1 text-gray-400">{log.actor}</span>
                      </span>

                      <span className="text-gray-600">
                        Target:
                        <span className="ml-1 font-mono text-gray-500">{log.target}</span>
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
        )}
      </div>
    </div>
  )
}

export default SystemLogs