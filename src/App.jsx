import { useState } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom"
import Login from "./pages/Login"
import Sidebar from "./components/Sidebar"

import Dashboard from "./pages/Dashboard"
import Businesses from "./pages/Businesses"
import NFCCards from "./pages/NFCCards"
import Transactions from "./pages/Transactions"
import Users from "./pages/Users"
import Devices from "./pages/Devices"
import Reports from "./pages/Reports"
import SystemLogs from "./pages/SystemLogs"
import Settings from "./pages/Settings"

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#080808] text-white">

        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main
          className={`
            min-h-screen
            transition-all
            duration-300
            ease-in-out
            ${sidebarOpen ? "ml-[240px]" : "ml-[68px]"}
          `}
        >
          <div className="p-8">
            <Routes>

              <Route
                path="/login"
                element={<Login />}
              />

              <Route path="/" element={<Dashboard />} />

              <Route
                path="/businesses"
                element={<Businesses />}
              />

              <Route
                path="/nfc-cards"
                element={<NFCCards />}
              />

              <Route
                path="/transactions"
                element={<Transactions />}
              />

              <Route
                path="/users"
                element={<Users />}
              />

              <Route
                path="/devices"
                element={<Devices />}
              />

              <Route
                path="/reports"
                element={<Reports />}
              />

              <Route
                path="/system-logs"
                element={<SystemLogs />}
              />

              <Route
                path="/settings"
                element={<Settings />}
              />

            </Routes>
          </div>
        </main>

      </div>
    </BrowserRouter>
  )
}

export default App