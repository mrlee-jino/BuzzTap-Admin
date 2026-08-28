import { useState } from "react"
import Toast from "../components/Toast"
import { useAdminData } from "../context/AdminDataContext"

function Reports() {
  const { treasury, metrics } = useAdminData()
  const [period, setPeriod] = useState("7 Days")
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState("")
  const multiplier = period === "30 Days" ? 4 : period === "90 Days" ? 12 : period === "This Year" ? 52 : 1
  const downloadReport = () => {
    const headers = ["Period", "Day", "Revenue", "BP Issued", "BP In Circulation"]
    const rows = revenueData.map((item) => [period, item.day, item.amount * multiplier, treasury.issued, metrics.circulation])
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    link.download = "buzztap-report.csv"
    link.click()
    setToast("Report downloaded successfully.")
  }
  const generateReport = () => { setGenerating(true); window.setTimeout(() => { setGenerating(false); setToast("Report generated successfully.") }, 1000) }

  const revenueData = [
    { day: "Mon", amount: 18500 },
    { day: "Tue", amount: 22100 },
    { day: "Wed", amount: 19800 },
    { day: "Thu", amount: 26700 },
    { day: "Fri", amount: 31200 },
    { day: "Sat", amount: 35800 },
    { day: "Sun", amount: 29400 },
  ]

  const businesses = [
    {
      name: "CyberHub Gaming Station",
      transactions: 428,
      revenue: 68450,
      growth: "+12.4%",
    },
    {
      name: "Bean & Byte Cafe",
      transactions: 315,
      revenue: 42800,
      growth: "+8.7%",
    },
    {
      name: "NextLevel Computer Shop",
      transactions: 276,
      revenue: 38950,
      growth: "+6.2%",
    },
    {
      name: "Pixel Point",
      transactions: 198,
      revenue: 27400,
      growth: "+4.8%",
    },
  ]

  const maxRevenue = Math.max(
    ...revenueData.map((item) => item.amount)
  )

  const totalRevenue = revenueData.reduce(
    (total, item) => total + item.amount,
    0
  )

  const totalTransactions = businesses.reduce(
    (total, business) => total + business.transactions,
    0
  )

  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>
        <div className="rounded-2xl border border-yellow-400/20 bg-[#111111] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-yellow-400">MOCK TREASURY SNAPSHOT</p>
              <p className="mt-2 text-sm text-gray-500">Non-financial prototype metrics included in report exports.</p>
            </div>
            <div className="grid grid-cols-3 gap-5 text-right text-sm"><span><b className="block text-lg text-white">{treasury.issued.toLocaleString()}</b><small className="text-gray-500">Issued</small></span><span><b className="block text-lg text-white">{metrics.circulation.toLocaleString()}</b><small className="text-gray-500">Circulation</small></span><span><b className="block text-lg text-white">{metrics.available.toLocaleString()}</b><small className="text-gray-500">Available</small></span></div>
          </div>
        </div>

          <p className="text-sm font-bold tracking-[0.25em] text-yellow-400">
            PLATFORM ANALYTICS
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Reports
          </h1>

          <p className="mt-2 text-gray-500">
            Monitor BuzzTap platform performance and activity.
          </p>

        </div>

        <div className="flex gap-3">

          <button onClick={downloadReport} className="rounded-xl border border-white/10 bg-[#111111] px-5 py-3 text-sm text-gray-400 transition hover:border-yellow-400/30 hover:text-white">
            Download Report
          </button>

          <button onClick={generateReport} disabled={generating} className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(250,204,21,0.25)]">
            {generating ? "Generating..." : "Generate Report"}
          </button>

        </div>

      </div>


      {/* Period Selector */}

      <div className="flex flex-wrap gap-2">

        {["7 Days", "30 Days", "90 Days", "This Year"].map((item) => (

          <button
            key={item}
            onClick={() => setPeriod(item)}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              period === item
                ? "bg-yellow-400 font-semibold text-black"
                : "bg-[#111111] text-gray-500 hover:bg-[#181818] hover:text-white"
            }`}
          >
            {item}
          </button>

        ))}

      </div>


      {/* Overview Cards */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Total Revenue
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            ₱{(totalRevenue * multiplier).toLocaleString()}
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            ↑ 10.8% from previous period
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Transactions
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {totalTransactions.toLocaleString()}
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            ↑ 7.4% from previous period
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Active Businesses
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            21
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            2 pending registration
          </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <p className="text-sm text-gray-500">
            Active Devices
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            27
          </h2>

          <p className="mt-2 text-xs text-yellow-400">
            84.4% of all devices
          </p>

        </div>

      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}


      {/* Revenue Chart */}

      <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="font-semibold">
              Revenue Overview
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Revenue generated during the selected period.
            </p>

          </div>

          <span className="text-sm text-yellow-400">
            {period}
          </span>

        </div>


        {/* Chart */}

        <div className="mt-8 flex h-64 items-end gap-3 sm:gap-5">

          {revenueData.map((item) => {

            const height =
              (item.amount / maxRevenue) * 100

            return (

              <div
                key={item.day}
                className="flex h-full flex-1 flex-col justify-end"
              >

                <div className="group relative flex h-full items-end">

                  <div
                    className="w-full rounded-t-lg bg-yellow-400/80 transition-all duration-300 hover:bg-yellow-300"
                    style={{
                      height: `${height}%`,
                    }}
                  />

                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-white/10 bg-[#080808] px-3 py-2 text-xs opacity-0 shadow-xl transition group-hover:opacity-100">

                    ₱{item.amount.toLocaleString()}

                  </div>

                </div>

                <p className="mt-3 text-center text-xs text-gray-600">
                  {item.day}
                </p>

              </div>

            )
          })}

        </div>

      </div>


      {/* Business Performance */}

      <div className="rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">

          <h2 className="font-semibold">
            Business Performance
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Revenue and transaction activity by business.
          </p>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[800px]">

            <thead>

              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-600">

                <th className="px-6 py-4">
                  Business
                </th>

                <th className="px-6 py-4">
                  Transactions
                </th>

                <th className="px-6 py-4">
                  Revenue
                </th>

                <th className="px-6 py-4">
                  Growth
                </th>

              </tr>

            </thead>


            <tbody>

              {businesses.map((business) => (

                <tr
                  key={business.name}
                  className="border-b border-white/5 transition hover:bg-white/[0.02]"
                >

                  <td className="px-6 py-5">

                    <p className="font-medium">
                      {business.name}
                    </p>

                  </td>

                  <td className="px-6 py-5 text-gray-400">

                    {business.transactions.toLocaleString()}

                  </td>

                  <td className="px-6 py-5 font-semibold">

                    ₱{business.revenue.toLocaleString()}

                  </td>

                  <td className="px-6 py-5">

                    <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                      {business.growth}
                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>


      {/* Platform Health */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <h2 className="font-semibold">
            Platform Health
          </h2>

          <div className="mt-6 space-y-5">

            <div>

              <div className="mb-2 flex justify-between text-sm">

                <span className="text-gray-400">
                  Devices Online
                </span>

                <span className="text-yellow-400">
                  84.4%
                </span>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/5">

                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{ width: "84.4%" }}
                />

              </div>

            </div>


            <div>

              <div className="mb-2 flex justify-between text-sm">

                <span className="text-gray-400">
                  Transaction Success
                </span>

                <span className="text-yellow-400">
                  96.8%
                </span>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/5">

                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{ width: "96.8%" }}
                />

              </div>

            </div>


            <div>

              <div className="mb-2 flex justify-between text-sm">

                <span className="text-gray-400">
                  Active NFC Cards
                </span>

                <span className="text-yellow-400">
                  91.2%
                </span>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/5">

                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{ width: "91.2%" }}
                />

              </div>

            </div>

          </div>

        </div>


        {/* Quick Summary */}

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">

          <h2 className="font-semibold">
            Report Summary
          </h2>

          <div className="mt-6 space-y-4">

            <div className="flex items-center justify-between border-b border-white/5 pb-4">

              <span className="text-sm text-gray-500">
                Best performing business
              </span>

              <span className="text-sm font-medium">
                CyberHub Gaming
              </span>

            </div>


            <div className="flex items-center justify-between border-b border-white/5 pb-4">

              <span className="text-sm text-gray-500">
                Peak transaction day
              </span>

              <span className="text-sm font-medium">
                Saturday
              </span>

            </div>


            <div className="flex items-center justify-between border-b border-white/5 pb-4">

              <span className="text-sm text-gray-500">
                Total NFC activity
              </span>

              <span className="text-sm font-medium">
                1,284 taps
              </span>

            </div>


            <div className="flex items-center justify-between">

              <span className="text-sm text-gray-500">
                Platform status
              </span>

              <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                ● Operational
              </span>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default Reports
