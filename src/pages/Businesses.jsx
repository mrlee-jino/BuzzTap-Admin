function Businesses() {
  const businesses = [
    {
      name: "CyberHub Gaming Station",
      location: "Cabadbaran City",
      type: "Working Station",
      stations: 24,
      status: "Active",
      joined: "Aug 23, 2026",
    },
    {
      name: "Bean & Byte Cafe",
      location: "Butuan City",
      type: "Cafe",
      stations: 12,
      status: "Active",
      joined: "Aug 22, 2026",
    },
    {
      name: "NextLevel Computer Shop",
      location: "Surigao City",
      type: "Computer Shop",
      stations: 18,
      status: "Pending",
      joined: "Aug 21, 2026",
    },
    {
      name: "Pixel Point",
      location: "Cagayan de Oro",
      type: "Computer Shop",
      stations: 30,
      status: "Active",
      joined: "Aug 20, 2026",
    },
    {
      name: "ByteZone Work Hub",
      location: "Butuan City",
      type: "Working Station",
      stations: 20,
      status: "Active",
      joined: "Aug 18, 2026",
    },
    {
      name: "Cafe Connect",
      location: "Cabadbaran City",
      type: "Cafe",
      stations: 8,
      status: "Suspended",
      joined: "Aug 15, 2026",
    },
  ]

  const stats = [
    {
      title: "Total Businesses",
      value: "24",
    },
    {
      title: "Active",
      value: "21",
    },
    {
      title: "Pending",
      value: "2",
    },
    {
      title: "Suspended",
      value: "1",
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

        <button className="rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_0_25px_rgba(250,204,21,0.2)]">
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
            className="w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 transition focus:border-yellow-400/50 lg:max-w-md"
          />

          <div className="flex gap-2 overflow-x-auto">

            <button className="whitespace-nowrap rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-black">
              All
            </button>

            <button className="whitespace-nowrap rounded-lg bg-[#181818] px-4 py-2 text-sm text-gray-400 transition hover:bg-[#222222] hover:text-white">
              Active
            </button>

            <button className="whitespace-nowrap rounded-lg bg-[#181818] px-4 py-2 text-sm text-gray-400 transition hover:bg-[#222222] hover:text-white">
              Pending
            </button>

            <button className="whitespace-nowrap rounded-lg bg-[#181818] px-4 py-2 text-sm text-gray-400 transition hover:bg-[#222222] hover:text-white">
              Suspended
            </button>

          </div>

        </div>

      </div>


      {/* Business Table */}
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

          {businesses.map((business) => (

            <div
              key={business.name}
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

                <button className="rounded-lg px-3 py-2 text-gray-500 transition hover:bg-white/5 hover:text-yellow-400">
                  ⋮
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  )
}

export default Businesses