import { useState } from "react"

function NFCCards() {
  const [filter, setFilter] = useState("All")
  const [search, setSearch] = useState("")

  const cards = [
    {
      id: "BT-0001",
      business: "CyberHub Gaming Station",
      owner: "Juan Dela Cruz",
      balance: "₱350",
      status: "Active",
      lastUsed: "Today, 4:21 PM",
    },
    {
      id: "BT-0002",
      business: "Bean & Byte Cafe",
      owner: "Maria Santos",
      balance: "₱120",
      status: "Active",
      lastUsed: "Today, 3:48 PM",
    },
    {
      id: "BT-0003",
      business: "NextLevel Computer Shop",
      owner: "Alex Reyes",
      balance: "₱580",
      status: "Active",
      lastUsed: "Today, 2:15 PM",
    },
    {
      id: "BT-0004",
      business: "Pixel Point",
      owner: "Carlo Santos",
      balance: "₱35",
      status: "Low Balance",
      lastUsed: "Yesterday",
    },
    {
      id: "BT-0005",
      business: "CyberHub Gaming Station",
      owner: "Angela Cruz",
      balance: "₱0",
      status: "Inactive",
      lastUsed: "Aug 20, 2026",
    },
    {
      id: "BT-0006",
      business: "Bean & Byte Cafe",
      owner: "Mark Villanueva",
      balance: "₱245",
      status: "Active",
      lastUsed: "Today, 1:32 PM",
    },
  ]

  const filteredCards = cards.filter((card) => {
    const matchesFilter =
      filter === "All" || card.status === filter

    const matchesSearch =
      card.id.toLowerCase().includes(search.toLowerCase()) ||
      card.business.toLowerCase().includes(search.toLowerCase()) ||
      card.owner.toLowerCase().includes(search.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const activeCards = cards.filter(
    (card) => card.status === "Active"
  ).length

  const lowBalanceCards = cards.filter(
    (card) => card.status === "Low Balance"
  ).length

  const inactiveCards = cards.filter(
    (card) => card.status === "Inactive"
  ).length

  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">
            Card Management
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            NFC Cards
          </h1>

          <p className="mt-2 text-gray-500">
            Manage BuzzTap NFC cards across registered businesses.
          </p>
        </div>

        <button
          className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black transition-all duration-300 hover:-translate-y-1 hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-400/20"
        >
          + Register NFC Card
        </button>

      </div>


      {/* Statistics */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 transition hover:-translate-y-1">

          <p className="text-sm text-gray-500">
            Active Cards
          </p>

          <p className="mt-3 text-3xl font-bold">
            {activeCards}
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 transition hover:-translate-y-1">

          <p className="text-sm text-gray-500">
            Low Balance
          </p>

          <p className="mt-3 text-3xl font-bold text-yellow-400">
            {lowBalanceCards}
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 transition hover:-translate-y-1">

          <p className="text-sm text-gray-500">
            Inactive Cards
          </p>

          <p className="mt-3 text-3xl font-bold text-red-400">
            {inactiveCards}
          </p>

        </div>

      </div>


      {/* Search + Filters */}

      <div className="rounded-2xl border border-white/10 bg-[#111111] p-4">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <input
            type="text"
            placeholder="Search card, business, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400/50 lg:max-w-md"
          />

          <div className="flex flex-wrap gap-2">

            {["All", "Active", "Low Balance", "Inactive"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`rounded-xl px-4 py-2 text-sm transition-all ${
                    filter === status
                      ? "bg-yellow-400 font-semibold text-black"
                      : "bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {status}
                </button>
              )
            )}

          </div>

        </div>

      </div>


      {/* Cards Table */}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px]">

            <thead className="border-b border-white/10">

              <tr className="text-left text-xs uppercase tracking-wider text-gray-600">

                <th className="px-6 py-4">
                  Card ID
                </th>

                <th className="px-6 py-4">
                  Business
                </th>

                <th className="px-6 py-4">
                  Customer
                </th>

                <th className="px-6 py-4">
                  Balance
                </th>

                <th className="px-6 py-4">
                  Last Used
                </th>

                <th className="px-6 py-4">
                  Status
                </th>

                <th className="px-6 py-4 text-right">
                  Actions
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-white/5">

              {filteredCards.map((card) => (

                <tr
                  key={card.id}
                  className="transition hover:bg-white/[0.02]"
                >

                  <td className="px-6 py-5">

                    <span className="font-semibold text-yellow-400">
                      {card.id}
                    </span>

                  </td>


                  <td className="px-6 py-5">

                    <p className="font-medium">
                      {card.business}
                    </p>

                  </td>


                  <td className="px-6 py-5 text-gray-400">
                    {card.owner}
                  </td>


                  <td className="px-6 py-5">

                    <span
                      className={
                        card.status === "Low Balance"
                          ? "font-semibold text-yellow-400"
                          : card.status === "Inactive"
                          ? "font-semibold text-red-400"
                          : "font-semibold"
                      }
                    >
                      {card.balance}
                    </span>

                  </td>


                  <td className="px-6 py-5 text-sm text-gray-500">
                    {card.lastUsed}
                  </td>


                  <td className="px-6 py-5">

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        card.status === "Active"
                          ? "bg-yellow-400/10 text-yellow-400"
                          : card.status === "Low Balance"
                          ? "bg-orange-400/10 text-orange-400"
                          : "bg-red-400/10 text-red-400"
                      }`}
                    >
                      {card.status}
                    </span>

                  </td>


                  <td className="px-6 py-5 text-right">

                    <button className="text-gray-500 transition hover:text-yellow-400">
                      ⋮
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>


        {/* Empty State */}

        {filteredCards.length === 0 && (

          <div className="px-6 py-16 text-center">

            <p className="text-gray-500">
              No NFC cards found.
            </p>

          </div>

        )}

      </div>

    </div>
  )
}

export default NFCCards
