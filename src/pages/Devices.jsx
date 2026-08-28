import { useState } from "react"
import Modal from "../components/Modal"
import Toast from "../components/Toast"
import DropdownMenu from "../components/DropdownMenu"
import ConfirmModal from "../components/ConfirmModal"

const devices = [
  {
    id: "DEV-001",
    name: "NFC Reader #001",
    business: "CyberHub Gaming Station",
    type: "NFC Reader",
    location: "Station Area",
    firmware: "v1.2.4",
    heartbeat: "Just now",
    status: "Online",
  },
  {
    id: "DEV-002",
    name: "Station Controller #001",
    business: "CyberHub Gaming Station",
    type: "Power Controller",
    location: "Station Area",
    firmware: "v2.0.1",
    heartbeat: "1 minute ago",
    status: "Online",
  },
  {
    id: "DEV-003",
    name: "Receipt Printer #001",
    business: "Bean & Byte Cafe",
    type: "Receipt Printer",
    location: "Counter",
    firmware: "v1.0.8",
    heartbeat: "2 minutes ago",
    status: "Online",
  },
  {
    id: "DEV-004",
    name: "NFC Reader #002",
    business: "NextLevel Computer Shop",
    type: "NFC Reader",
    location: "Counter",
    firmware: "v1.2.4",
    heartbeat: "5 minutes ago",
    status: "Online",
  },
  {
    id: "DEV-005",
    name: "Station Controller #002",
    business: "NextLevel Computer Shop",
    type: "Power Controller",
    location: "Station Area",
    firmware: "v2.0.1",
    heartbeat: "18 minutes ago",
    status: "Offline",
  },
  {
    id: "DEV-006",
    name: "Receipt Printer #002",
    business: "Pixel Point",
    type: "Receipt Printer",
    location: "Counter",
    firmware: "v1.0.8",
    heartbeat: "32 minutes ago",
    status: "Maintenance",
  },
  {
    id: "DEV-007",
    name: "NFC Reader #003",
    business: "Pixel Point",
    type: "NFC Reader",
    location: "Station Area",
    firmware: "v1.2.3",
    heartbeat: "1 hour ago",
    status: "Offline",
  },
  {
    id: "DEV-008",
    name: "Station Controller #003",
    business: "Bean & Byte Cafe",
    type: "Power Controller",
    location: "Counter",
    firmware: "v2.0.1",
    heartbeat: "Just now",
    status: "Online",
  },
]

function Devices() {
  const [records, setRecords] = useState(devices)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState("")
  const [confirm, setConfirm] = useState(null)
  const [restartingId, setRestartingId] = useState(null)
  const [form, setForm] = useState({ name: "", id: "", business: "", type: "NFC Reader", location: "", firmware: "", status: "Online" })

  const filteredDevices = records.filter((device) => {
    const matchesSearch =
      device.id.toLowerCase().includes(search.toLowerCase()) ||
      device.name.toLowerCase().includes(search.toLowerCase()) ||
      device.business.toLowerCase().includes(search.toLowerCase()) ||
      device.type.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === "All" || device.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const onlineDevices = records.filter(
    (device) => device.status === "Online"
  ).length

  const offlineDevices = records.filter(
    (device) => device.status === "Offline"
  ).length

  const maintenanceDevices = records.filter(
    (device) => device.status === "Maintenance"
  ).length

  const restartDevice = (device) => {
    setRestartingId(device.id)
    window.setTimeout(() => {
      setRecords((current) => current.map((item) => item.id === device.id ? { ...item, status: "Online", heartbeat: "Just now" } : item))
      setRestartingId(null)
      setToast("Device restarted successfully.")
    }, 700)
  }

  const registerDevice = (event) => {
    event.preventDefault()
    setRecords((current) => [{ ...form, heartbeat: "Just now" }, ...current])
    setModal(null)
    setToast("Device registered successfully.")
  }

  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <p className="text-sm font-bold tracking-[0.25em] text-yellow-400">
            HARDWARE MANAGEMENT
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Devices
          </h1>

          <p className="mt-2 text-gray-500">
            Monitor BuzzTap hardware deployed across businesses.
          </p>

        </div>

        <button onClick={() => setModal("register")} className="rounded-xl bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(250,204,21,0.25)]">
          + Register Device
        </button>

      </div>


      {/* Statistics */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 transition hover:-translate-y-1">

          <p className="text-sm text-gray-500">
            Online Devices
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {onlineDevices}
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            Operating normally
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 transition hover:-translate-y-1">

          <p className="text-sm text-gray-500">
            Offline Devices
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {offlineDevices}
          </h2>

          <p className="mt-2 text-xs text-red-400">
            Connection required
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 transition hover:-translate-y-1">

          <p className="text-sm text-gray-500">
            Maintenance
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {maintenanceDevices}
          </h2>

          <p className="mt-2 text-xs text-orange-400">
            Requires attention
          </p>

        </div>

      </div>


      {/* Search and Filters */}

      <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <input
            type="text"
            placeholder="Search device, business, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400 lg:w-[420px]"
          />

          <div className="flex flex-wrap gap-2">

            {["All", "Online", "Offline", "Maintenance"].map((status) => (

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


      {/* Device Table */}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">

          <h2 className="font-semibold">
            Registered Devices
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Hardware currently registered on the BuzzTap platform.
          </p>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[1100px]">

            <thead>

              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-600">

                <th className="px-6 py-4">
                  Device
                </th>

                <th className="px-6 py-4">
                  Business
                </th>

                <th className="px-6 py-4">
                  Type
                </th>

                <th className="px-6 py-4">
                  Location
                </th>

                <th className="px-6 py-4">
                  Firmware
                </th>

                <th className="px-6 py-4">
                  Last Heartbeat
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

              {filteredDevices.map((device) => (

                <tr
                  key={device.id}
                  className="border-b border-white/5 transition hover:bg-white/[0.02]"
                >

                  {/* Device */}

                  <td className="px-6 py-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10 text-lg text-yellow-400">
                        ◉
                      </div>

                      <div>

                        <p className="font-semibold text-white">
                          {device.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-600">
                          {device.id}
                        </p>

                      </div>

                    </div>

                  </td>


                  {/* Business */}

                  <td className="px-6 py-5">

                    <p className="text-sm text-gray-300">
                      {device.business}
                    </p>

                  </td>


                  {/* Type */}

                  <td className="px-6 py-5">

                    <span className="rounded-lg bg-white/5 px-3 py-1 text-xs text-gray-400">
                      {device.type}
                    </span>

                  </td>


                  {/* Location */}

                  <td className="px-6 py-5">

                    <p className="text-sm text-gray-400">
                      {device.location}
                    </p>

                  </td>


                  {/* Firmware */}

                  <td className="px-6 py-5">

                    <span className="font-mono text-xs text-gray-500">
                      {device.firmware}
                    </span>

                  </td>


                  {/* Heartbeat */}

                  <td className="px-6 py-5">

                    <p className="text-sm text-gray-400">
                      {device.heartbeat}
                    </p>

                  </td>


                  {/* Status */}

                  <td className="px-6 py-5">

                    {device.status === "Online" && (

                      <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                        ● Online
                      </span>

                    )}

                    {device.status === "Offline" && (

                      <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-400">
                        ● Offline
                      </span>

                    )}

                    {device.status === "Maintenance" && (

                      <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-400">
                        ● Maintenance
                      </span>

                    )}

                  </td>


                  {/* Action */}

                  <td className="px-6 py-5">

                    <button onClick={() => setModal({ type: "menu", device })} className="text-xl text-gray-500 transition hover:text-yellow-400" aria-label={`Actions for ${device.name}`}>
                      ⋮
                    </button>
                    {modal?.type === "menu" && modal.device.id === device.id && <DropdownMenu options={[{ label: "View Details", onClick: () => setModal({ type: "details", device }) }, { label: "Edit", onClick: () => setToast("Device edit opened") }, { label: restartingId === device.id ? "Restarting..." : "Restart", onClick: () => restartDevice(device) }, { label: "Maintenance", onClick: () => setConfirm({ device, status: "Maintenance" }) }, { label: "Remove", onClick: () => setConfirm({ device, status: "Removed" }), destructive: true }]} onSelect={(option) => { option.onClick(); if (option.label !== "View Details") setModal(null) }} />}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>


        {/* Empty State */}

        {filteredDevices.length === 0 && (

          <div className="px-6 py-12 text-center">

            <p className="text-gray-500">
              No devices found.
            </p>

          </div>

        )}

      </div>

      {modal === "register" && <Modal title="Register Device" onClose={() => setModal(null)}><form onSubmit={registerDevice} className="space-y-4"><input required placeholder="Device Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field" /><input required placeholder="Device ID" value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} className="field" /><input required placeholder="Business" value={form.business} onChange={(event) => setForm({ ...form, business: event.target.value })} className="field" /><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="field"><option>NFC Reader</option><option>Power Controller</option><option>Receipt Printer</option></select><input required placeholder="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="field" /><input required placeholder="Firmware Version" value={form.firmware} onChange={(event) => setForm({ ...form, firmware: event.target.value })} className="field" /><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="field"><option>Online</option><option>Offline</option><option>Maintenance</option></select><div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-gray-300">Cancel</button><button className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black">Register Device</button></div></form></Modal>}
      {modal?.type === "details" && <Modal title="Device Details" onClose={() => setModal(null)}><p className="text-lg font-semibold">{modal.device.name}</p><p className="mt-2 text-gray-400">{modal.device.business} · {modal.device.status}</p></Modal>}
      {confirm && <ConfirmModal title={`${confirm.status === "Removed" ? "Remove" : "Schedule maintenance for"} device?`} description={`${confirm.device.name} will be marked ${confirm.status}.`} confirmLabel={confirm.status} destructive={confirm.status === "Removed"} onConfirm={() => { setRecords((current) => confirm.status === "Removed" ? current.filter((item) => item.id !== confirm.device.id) : current.map((item) => item.id === confirm.device.id ? { ...item, status: confirm.status } : item)); setConfirm(null); setToast(`Device ${confirm.status.toLowerCase()}`) }} onClose={() => setConfirm(null)} />}{toast && <Toast message={toast} onClose={() => setToast("")} />}

    </div>
  )
}

export default Devices