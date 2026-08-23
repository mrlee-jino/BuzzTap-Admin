function Settings() {
  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">
          System Configuration
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Settings
        </h1>

        <p className="mt-2 text-gray-500">
          Manage BuzzTap platform settings and administrator preferences.
        </p>
      </div>


      {/* General Settings */}
      <div className="rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-semibold">
            General Settings
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Basic information about the BuzzTap platform.
          </p>
        </div>


        <div className="space-y-6 p-6">

          <div>
            <label className="text-sm text-gray-400">
              Platform Name
            </label>

            <input
              type="text"
              defaultValue="BuzzTap"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400/50"
            />
          </div>


          <div>
            <label className="text-sm text-gray-400">
              Platform Description
            </label>

            <textarea
              defaultValue="Smart technology solutions for modern businesses."
              rows="3"
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400/50"
            />
          </div>


          <button className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-400/10">
            Save Changes
          </button>

        </div>

      </div>


      {/* Platform Configuration */}
      <div className="rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="font-semibold">
            Platform Configuration
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Configure important BuzzTap platform services.
          </p>
        </div>


        <div className="divide-y divide-white/5">

          {/* NFC Service */}
          <div className="flex items-center justify-between gap-6 px-6 py-5">

            <div>
              <p className="font-medium">
                NFC Card Service
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Allow BuzzTap businesses to use NFC card services.
              </p>
            </div>

            <button className="relative h-6 w-11 rounded-full bg-yellow-400">
              <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-black" />
            </button>

          </div>


          {/* Payment Service */}
          <div className="flex items-center justify-between gap-6 px-6 py-5">

            <div>
              <p className="font-medium">
                Payment Service
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Enable payment processing across the platform.
              </p>
            </div>

            <button className="relative h-6 w-11 rounded-full bg-yellow-400">
              <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-black" />
            </button>

          </div>


          {/* Automatic Updates */}
          <div className="flex items-center justify-between gap-6 px-6 py-5">

            <div>
              <p className="font-medium">
                Automatic System Updates
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Automatically apply available platform updates.
              </p>
            </div>

            <button className="relative h-6 w-11 rounded-full bg-yellow-400">
              <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-black" />
            </button>

          </div>

        </div>

      </div>


      {/* Security */}
      <div className="rounded-2xl border border-white/10 bg-[#111111]">

        <div className="border-b border-white/10 px-6 py-5">

          <h2 className="font-semibold">
            Security
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Manage administrator security settings.
          </p>

        </div>


        <div className="space-y-6 p-6">

          <div className="flex items-center justify-between gap-6">

            <div>
              <p className="font-medium">
                Two-Factor Authentication
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Add an additional layer of security to administrator accounts.
              </p>
            </div>

            <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-medium text-orange-400">
              Not Enabled
            </span>

          </div>


          <button className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-gray-300 transition hover:border-yellow-400/30 hover:text-yellow-400">
            Configure Security
          </button>

        </div>

      </div>


      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-400/10 bg-[#111111]">

        <div className="border-b border-red-400/10 px-6 py-5">

          <h2 className="font-semibold text-red-400">
            Danger Zone
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Actions in this section can affect the entire BuzzTap platform.
          </p>

        </div>


        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="font-medium">
              Maintenance Mode
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Temporarily disable access to the BuzzTap platform.
            </p>
          </div>

          <button className="rounded-xl border border-red-400/20 px-5 py-3 text-sm font-medium text-red-400 transition hover:bg-red-400/10">
            Enable Maintenance
          </button>

        </div>

      </div>

    </div>
  )
}

export default Settings