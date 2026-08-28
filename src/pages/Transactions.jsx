import { useState } from "react"
import Modal from "../components/Modal"
import Toast from "../components/Toast"
import DropdownMenu from "../components/DropdownMenu"
import ConfirmModal from "../components/ConfirmModal"

const transactions = [
  {
    id: "TXN-001284",
    business: "CyberHub Gaming Station",
    customer: "Juan Dela Cruz",
    card: "BT-001",
    amount: 350,
    date: "Aug 23, 2026",
    time: "4:21 PM",
    method: "NFC",
    status: "Completed",
  },
  {
    id: "TXN-001283",
    business: "Bean & Byte Cafe",
    customer: "Maria Santos",
    card: "BT-002",
    amount: 185,
    date: "Aug 23, 2026",
    time: "4:05 PM",
    method: "NFC",
    status: "Completed",
  },
  {
    id: "TXN-001282",
    business: "NextLevel Computer Shop",
    customer: "Alex Reyes",
    card: "BT-003",
    amount: 580,
    date: "Aug 23, 2026",
    time: "3:48 PM",
    method: "NFC",
    status: "Completed",
  },
  {
    id: "TXN-001281",
    business: "Pixel Point",
    customer: "Carlo Santos",
    card: "BT-004",
    amount: 120,
    date: "Aug 23, 2026",
    time: "3:21 PM",
    method: "NFC",
    status: "Pending",
  },
  {
    id: "TXN-001280",
    business: "CyberHub Gaming Station",
    customer: "Angela Cruz",
    card: "BT-005",
    amount: 250,
    date: "Aug 23, 2026",
    time: "2:55 PM",
    method: "NFC",
    status: "Completed",
  },
  {
    id: "TXN-001279",
    business: "Bean & Byte Cafe",
    customer: "Mark Villanueva",
    card: "BT-006",
    amount: 95,
    date: "Aug 23, 2026",
    time: "2:31 PM",
    method: "NFC",
    status: "Failed",
  },
  {
    id: "TXN-001278",
    business: "Pixel Point",
    customer: "Lee Tejones",
    card: "BT-000",
    amount: 500,
    date: "Aug 23, 2026",
    time: "1:45 PM",
    method: "NFC",
    status: "Completed",
  },
]

function Transactions() {
  const [records, setRecords] = useState(transactions)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [methodFilter, setMethodFilter] = useState("All")
  const [menuId, setMenuId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState("")
  const [refund, setRefund] = useState(null)
  const downloadCsv = () => {
    const headers = ["ID", "Date", "Time", "Business", "Customer", "NFC Card", "Type/Method", "Amount", "Status"]
    const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`
    const csv = [headers, ...records.map((item) => [item.id, item.date, item.time, item.business, item.customer, item.card, item.method, item.amount, item.status])].map((row) => row.map(escapeCsv).join(",")).join("\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    link.download = "buzztap-transactions.csv"
    link.click()
    setToast("Transactions exported")
  }
  const downloadReceipt = (transaction) => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([`BuzzTap receipt\n${transaction.id}\nAmount: ₱${transaction.amount}`], { type: "text/plain" })); link.download = `${transaction.id}-receipt.txt`; link.click(); setToast("Receipt downloaded") }

  const filteredTransactions = records.filter((transaction) => {
    const matchesSearch =
      transaction.id.toLowerCase().includes(search.toLowerCase()) ||
      transaction.business.toLowerCase().includes(search.toLowerCase()) ||
      transaction.customer.toLowerCase().includes(search.toLowerCase()) ||
      transaction.card.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === "All" || transaction.status === statusFilter
    const matchesMethod = methodFilter === "All" || transaction.method === methodFilter

    return matchesSearch && matchesStatus && matchesMethod
  })

  const completedTransactions = records.filter(
    (transaction) => transaction.status === "Completed"
  )

  const totalRevenue = completedTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0
  )

  const completedCount = completedTransactions.length

  const pendingCount = records.filter(
    (transaction) => transaction.status === "Pending"
  ).length

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.25em] text-yellow-400">
            PLATFORM FINANCE
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Transactions
          </h1>

          <p className="mt-2 text-gray-500">
            Monitor transactions across all BuzzTap businesses.
          </p>
        </div>

        <button onClick={downloadCsv} className="rounded-xl bg-yellow-400 px-6 py-3 font-semibold text-black transition hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(250,204,21,0.25)]">
          Export Transactions
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <p className="text-sm text-gray-500">
            Today's Revenue
          </p>

          <div className="mt-3 flex items-end justify-between">
            <h2 className="text-3xl font-bold">
              ₱{totalRevenue.toLocaleString()}
            </h2>

            <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-400">
              +8.4%
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <p className="text-sm text-gray-500">
            Completed Transactions
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {completedCount}
          </h2>

          <p className="mt-2 text-xs text-gray-600">
            Successful payments today
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <p className="text-sm text-gray-500">
            Pending Transactions
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {pendingCount}
          </h2>

          <p className="mt-2 text-xs text-gray-600">
            Awaiting confirmation
          </p>
        </div>

      </div>

      {/* Search + Filters */}
      <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="relative w-full lg:w-[420px]">
            <input
              type="text"
              placeholder="Search transaction, business, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400"
            />
          </div>

          <div className="flex flex-wrap gap-2">

            {["All", "Completed", "Pending", "Failed"].map((status) => (
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
            {["All", "NFC", "Cash"].map((method) => <button key={method} onClick={() => setMethodFilter(method)} className={`rounded-xl px-4 py-2 text-sm ${methodFilter === method ? "bg-yellow-400 font-semibold text-black" : "bg-[#181818] text-gray-400"}`}>{method}</button>)}

          </div>

        </div>

      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-semibold">
            Recent Transactions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Latest payment activity across the BuzzTap platform.
          </p>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1000px]">

            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-600">

                <th className="px-6 py-4">
                  Transaction
                </th>

                <th className="px-6 py-4">
                  Business
                </th>

                <th className="px-6 py-4">
                  Customer
                </th>

                <th className="px-6 py-4">
                  Amount
                </th>

                <th className="px-6 py-4">
                  Method
                </th>

                <th className="px-6 py-4">
                  Date
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

              {filteredTransactions.map((transaction) => (

                <tr
                  key={transaction.id}
                  className="border-b border-white/5 transition hover:bg-white/[0.02]"
                >

                  <td className="px-6 py-5">

                    <p className="font-semibold text-white">
                      {transaction.id}
                    </p>

                    <p className="mt-1 text-xs text-gray-600">
                      {transaction.card}
                    </p>

                  </td>

                  <td className="px-6 py-5">

                    <p className="text-sm text-gray-300">
                      {transaction.business}
                    </p>

                  </td>

                  <td className="px-6 py-5">

                    <p className="text-sm text-gray-300">
                      {transaction.customer}
                    </p>

                  </td>

                  <td className="px-6 py-5">

                    <p className="font-semibold text-white">
                      ₱{transaction.amount.toLocaleString()}
                    </p>

                  </td>

                  <td className="px-6 py-5">

                    <span className="rounded-lg bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                      {transaction.method}
                    </span>

                  </td>

                  <td className="px-6 py-5">

                    <p className="text-sm text-gray-400">
                      {transaction.date}
                    </p>

                    <p className="mt-1 text-xs text-gray-600">
                      {transaction.time}
                    </p>

                  </td>

                  <td className="px-6 py-5">

                    {transaction.status === "Completed" && (
                      <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                        ● Completed
                      </span>
                    )}

                    {transaction.status === "Pending" && (
                      <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-400">
                        ● Pending
                      </span>
                    )}

                    {transaction.status === "Failed" && (
                      <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-400">
                        ● Failed
                      </span>
                    )}

                  </td>

                  <td className="px-6 py-5">

                    <button onClick={() => setMenuId(menuId === transaction.id ? null : transaction.id)} className="text-gray-500 transition hover:text-yellow-400" aria-label={`Actions for ${transaction.id}`}>
                      ⋮
                    </button>
                    {menuId === transaction.id && <DropdownMenu options={[{ label: "View Details", onClick: () => setSelected(transaction) }, { label: "Download Receipt", onClick: () => downloadReceipt(transaction) }, transaction.status === "Completed" ? { label: "Refund", onClick: () => setRefund(transaction), destructive: true } : null]} onSelect={(option) => { option.onClick(); setMenuId(null) }} />}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        {filteredTransactions.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No transactions found.
          </div>
        )}

      </div>

      {selected && <Modal title="Transaction Details" onClose={() => setSelected(null)}><div className="space-y-2 text-sm"><p><span className="text-gray-500">ID:</span> {selected.id}</p><p><span className="text-gray-500">Date:</span> {selected.date}</p><p><span className="text-gray-500">Time:</span> {selected.time}</p><p><span className="text-gray-500">Business:</span> {selected.business}</p><p><span className="text-gray-500">Customer:</span> {selected.customer}</p><p><span className="text-gray-500">NFC Card:</span> {selected.card}</p><p><span className="text-gray-500">Type/Method:</span> {selected.method}</p><p><span className="text-gray-500">Amount:</span> ₱{selected.amount.toLocaleString()}</p><p><span className="text-gray-500">Status:</span> {selected.status}</p></div></Modal>}
      {refund && <ConfirmModal title="Refund transaction?" description={`Refund ₱${refund.amount.toLocaleString()} for ${refund.id}?`} confirmLabel="Refund" destructive onConfirm={() => { setRecords((current) => current.map((item) => item.id === refund.id ? { ...item, status: "Refunded" } : item)); setToast("Transaction refunded successfully."); setRefund(null) }} onClose={() => setRefund(null)} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

    </div>
  )
}

export default Transactions
