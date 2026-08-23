function Dashboard() {
  const stats = [
    {
      title: "Registered Businesses",
      value: "24",
      description: "+3 this month",
    },
    {
      title: "Active NFC Cards",
      value: "1,248",
      description: "+86 this month",
    },
    {
      title: "Total Transactions",
      value: "18,492",
      description: "+12.5% this month",
    },
    {
      title: "Connected Workstations",
      value: "186",
      description: "172 currently online",
    },
  ]

  const recentBusinesses = [
    {
      name: "Juan's Computer Shop",
      type: "Computer Shop",
      status: "Active",
      date: "Aug 23, 2026",
    },
    {
      name: "Bean & Byte Cafe",
      type: "Cafe",
      status: "Active",
      date: "Aug 22, 2026",
    },
    {
      name: "WorkHub Cabadbaran",
      type: "Working Station",
      status: "Pending",
      date: "Aug 21, 2026",
    },
    {
      name: "NextGen PC Arena",
      type: "Computer Shop",
      status: "Active",
      date: "Aug 20, 2026",
    },
  ]

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-yellow-400">
          ADMINISTRATION
        </p>

        <h1 className="mt-1 text-4xl font-bold">
          Dashboard
        </h1>

        <p className="mt-2 text-gray-500">
          Monitor and manage the BuzzTap platform.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-white/10 bg-[#111111] p-6 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/30 hover:shadow-[0_0_25px_rgba(255,193,7,0.08)]"
          >
            <p className="text-sm text-gray-500">
              {stat.title}
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              {stat.value}
            </h2>

            <p className="mt-2 text-xs text-yellow-400">
              {stat.description}
            </p>
          </div>
        ))}

      </div>

      {/* Main Content */}
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Recent Businesses */}
        <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#111111]">

          <div className="flex items-center justify-between border-b border-white/10 p-6">

            <div>
              <h2 className="text-lg font-semibold">
                Recent Businesses
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Recently registered businesses on BuzzTap.
              </p>
            </div>

            <button className="rounded-lg border border-yellow-400/30 px-4 py-2 text-sm text-yellow-400 transition hover:bg-yellow-400 hover:text-black">
              View All
            </button>

          </div>

          <div className="divide-y divide-white/5">

            {recentBusinesses.map((business) => (

              <div
                key={business.name}
                className="flex items-center justify-between p-5 transition hover:bg-white/[0.02]"
              >

                <div>
                  <p className="font-medium">
                    {business.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {business.type}
                  </p>
                </div>

                <div className="text-right">

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      business.status === "Active"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : "bg-orange-400/10 text-orange-400"
                    }`}
                  >
                    {business.status}
                  </span>

                  <p className="mt-2 text-xs text-gray-600">
                    {business.date}
                  </p>

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* System Status */}
        <div className="rounded-2xl border border-white/10 bg-[#111111]">

          <div className="border-b border-white/10 p-6">

            <h2 className="text-lg font-semibold">
              System Status
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current BuzzTap services.
            </p>

          </div>

          <div className="space-y-5 p-6">

            <div className="flex items-center justify-between">
              <span className="text-gray-400">
                Platform
              </span>

              <span className="flex items-center gap-2 text-sm text-yellow-400">
                <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                Operational
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">
                NFC Services
              </span>

              <span className="flex items-center gap-2 text-sm text-yellow-400">
                <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                Operational
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">
                Payment System
              </span>

              <span className="flex items-center gap-2 text-sm text-yellow-400">
                <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                Operational
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">
                API
              </span>

              <span className="flex items-center gap-2 text-sm text-yellow-400">
                <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                Operational
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* Bottom Activity */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#111111] p-6">

        <div className="flex items-center justify-between">

          <div>
            <h2 className="text-lg font-semibold">
              Platform Overview
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              BuzzTap platform activity for today.
            </p>
          </div>

          <span className="rounded-full border border-yellow-400/20 bg-yellow-400/5 px-3 py-1 text-xs text-yellow-400">
            LIVE
          </span>

        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-xl bg-black/40 p-5">
            <p className="text-sm text-gray-500">
              Today's Transactions
            </p>

            <p className="mt-2 text-2xl font-bold">
              842
            </p>
          </div>

          <div className="rounded-xl bg-black/40 p-5">
            <p className="text-sm text-gray-500">
              Today's Revenue
            </p>

            <p className="mt-2 text-2xl font-bold">
              ₱48,620
            </p>
          </div>

          <div className="rounded-xl bg-black/40 p-5">
            <p className="text-sm text-gray-500">
              Online Workstations
            </p>

            <p className="mt-2 text-2xl font-bold">
              172 / 186
            </p>
          </div>

        </div>

      </div>

    </div>
  )
}

export default Dashboard