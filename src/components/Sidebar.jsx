import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const navigation = [
    { name: "Dashboard", path: "/" },
    { name: "Businesses", path: "/businesses" },
    { name: "NFC Cards", path: "/nfc-cards" },
    { name: "Transactions", path: "/transactions" },
    { name: "Users", path: "/users" },
    { name: "Devices", path: "/devices" },
    { name: "Reports", path: "/reports" },
    { name: "System Logs", path: "/system-logs" },
    { name: "Settings", path: "/settings" },
  ]

  const handleLogout = () => {
    localStorage.removeItem("buzzTapAdminLoggedIn")

    setShowLogoutConfirm(false)
    setSidebarOpen(false)

    navigate("/login")
  }

  return (
    <>
      {/* ================= HOVER ZONE ================= */}
      <div
        onMouseEnter={() => setSidebarOpen(true)}
        className="
          fixed
          left-0
          top-0
          z-40
          h-screen
          w-6
        "
      />

      {/* ================= SIDEBAR ================= */}
      <aside
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        className={`
          fixed
          left-0
          top-0
          z-50
          h-screen
          bg-[#080808]
          border-r
          border-white/10
          shadow-[10px_0_40px_rgba(0,0,0,0.25)]
          transition-all
          duration-300
          ease-in-out
          overflow-hidden
          ${sidebarOpen ? "w-[240px]" : "w-[68px]"}
        `}
      >

        {/* ================= HEADER ================= */}
        <div
          className="
            relative
            h-[86px]
            flex
            items-center
            border-b
            border-white/10
            px-4
          "
        >

          {/* Logo */}
          <div className="flex items-center min-w-max">

            <div
              className="
                w-10
                h-10
                rounded-xl
                bg-[#FFD400]
                text-black
                flex
                items-center
                justify-center
                font-black
                text-lg
                shadow-[0_0_20px_rgba(255,212,0,0.18)]
                shrink-0
              "
            >
              B
            </div>

            {/* Brand */}
            <div
              className={`
                ml-3
                overflow-hidden
                transition-all
                duration-300

                ${
                  sidebarOpen
                    ? "opacity-100 translate-x-0 w-auto"
                    : "opacity-0 -translate-x-3 w-0 pointer-events-none"
                }
              `}
            >
              <h1 className="font-bold text-white whitespace-nowrap">
                Buzz<span className="text-[#FFD400]">Tap</span>
              </h1>

              <p className="text-[11px] text-gray-500 whitespace-nowrap">
                Admin Portal
              </p>
            </div>

          </div>

          {/* Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSidebarOpen(!sidebarOpen)
            }}
            className="
              absolute
              -right-3
              top-7
              w-7
              h-7
              rounded-full
              bg-[#FFD400]
              text-black
              flex
              items-center
              justify-center
              font-bold
              shadow-[0_0_15px_rgba(255,212,0,0.25)]
              hover:scale-110
              transition-transform
              duration-200
            "
          >
            <span
              className={`
                transition-transform
                duration-300
                ${sidebarOpen ? "rotate-180" : ""}
              `}
            >
              ›
            </span>
          </button>

        </div>

        {/* ================= NAVIGATION ================= */}
        <nav className="p-3 mt-3 space-y-1">

          {navigation.map((item) => {

            const active = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group
                  relative
                  flex
                  items-center
                  h-12
                  rounded-xl
                  px-3
                  transition-all
                  duration-200

                  ${
                    active
                      ? `
                        bg-[#FFD400]
                        text-black
                        shadow-[0_0_25px_rgba(255,212,0,0.15)]
                      `
                      : `
                        text-gray-400
                        hover:text-white
                        hover:bg-white/[0.06]
                      `
                  }
                `}
              >

                {/* Icon */}
                <div
                  className={`
                    w-9
                    h-9
                    rounded-lg
                    flex
                    items-center
                    justify-center
                    shrink-0
                    transition-all
                    duration-200

                    ${
                      active
                        ? "bg-black/10 text-black"
                        : "bg-white/[0.03] text-gray-500 group-hover:text-[#FFD400]"
                    }
                  `}
                >
                  {item.name === "Dashboard" && "▦"}
                  {item.name === "Businesses" && "▣"}
                  {item.name === "NFC Cards" && "▤"}
                  {item.name === "Transactions" && "▥"}
                  {item.name === "Users" && "♙"}
                  {item.name === "Devices" && "◇"}
                  {item.name === "Reports" && "◫"}
                  {item.name === "System Logs" && "≡"}
                  {item.name === "Settings" && "⚙"}
                </div>

                {/* Navigation Text */}
                <span
                  className={`
                    ml-3
                    whitespace-nowrap
                    text-sm
                    font-medium
                    overflow-hidden
                    transition-all
                    duration-300

                    ${
                      sidebarOpen
                        ? "opacity-100 translate-x-0 w-auto"
                        : "opacity-0 -translate-x-3 w-0 pointer-events-none"
                    }
                  `}
                >
                  {item.name}
                </span>

              </Link>
            )
          })}

        </nav>

        {/* ================= BOTTOM SECTION ================= */}
        <div
          className={`
            absolute
            bottom-4
            left-3
            right-3
            transition-all
            duration-300

            ${
              sidebarOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3 pointer-events-none"
            }
          `}
        >

          {/* Platform Status */}
          <div
            className="
              border
              border-white/10
              rounded-xl
              px-3
              py-3
              mb-2
            "
          >

            <div
              className="
                flex
                items-center
                gap-2
                text-xs
                text-gray-500
              "
            >

              <span
                className="
                  w-2
                  h-2
                  rounded-full
                  bg-[#FFD400]
                  animate-pulse
                "
              />

              <span>
                Platform Online
              </span>

            </div>

          </div>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="
              w-full
              flex
              items-center
              gap-3
              px-3
              py-3
              rounded-xl
              text-gray-400
              hover:text-red-400
              hover:bg-red-500/10
              transition-all
              duration-200
            "
          >

            {/* Logout Icon */}
            <div
              className="
                w-9
                h-9
                rounded-lg
                flex
                items-center
                justify-center
                bg-white/[0.03]
                shrink-0
              "
            >
              ↪
            </div>

            {/* Logout Text */}
            <span
              className="
                text-sm
                font-medium
                whitespace-nowrap
              "
            >
              Logout
            </span>

          </button>

        </div>

      </aside>

      {/* ================= LOGOUT CONFIRMATION MODAL ================= */}
      {showLogoutConfirm && (

        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/60
            backdrop-blur-sm
            px-6
          "
          onClick={() => setShowLogoutConfirm(false)}
        >

          {/* Modal */}
          <div
            className="
              w-full
              max-w-sm
              bg-[#101010]
              border
              border-white/10
              rounded-2xl
              p-6
              shadow-[0_25px_80px_rgba(0,0,0,0.6)]
            "
            onClick={(e) => e.stopPropagation()}
          >

            {/* Icon */}
            <div
              className="
                w-12
                h-12
                rounded-xl
                bg-red-500/10
                border
                border-red-500/20
                flex
                items-center
                justify-center
                text-red-400
                text-xl
                mb-4
              "
            >
              ↪
            </div>

            {/* Title */}
            <h2
              className="
                text-lg
                font-semibold
                text-white
              "
            >
              Logout from BuzzTap Admin?
            </h2>

            {/* Description */}
            <p
              className="
                text-sm
                text-gray-500
                mt-2
                leading-relaxed
              "
            >
              Are you sure you want to log out of the
              BuzzTap Admin Portal?
            </p>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">

              {/* Cancel */}
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="
                  flex-1
                  py-3
                  rounded-xl
                  border
                  border-white/10
                  text-gray-400
                  hover:text-white
                  hover:bg-white/[0.05]
                  transition-all
                  duration-200
                "
              >
                Cancel
              </button>

              {/* Confirm Logout */}
              <button
                onClick={handleLogout}
                className="
                  flex-1
                  py-3
                  rounded-xl
                  bg-red-500
                  text-white
                  font-semibold
                  hover:bg-red-400
                  hover:scale-[1.02]
                  active:scale-[0.98]
                  transition-all
                  duration-200
                "
              >
                Logout
              </button>

            </div>

          </div>

        </div>

      )}

    </>
  )
}

export default Sidebar