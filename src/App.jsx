import { useState } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
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


function AppLayout() {
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Check if the current page is the login page
  const isLoginPage = location.pathname === "/login"

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* ================= SIDEBAR ================= */}
      {!isLoginPage && (
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      )}

      {/* ================= MAIN CONTENT ================= */}
      <main
        className={`
          min-h-screen
          transition-all
          duration-300
          ease-in-out

          ${
            isLoginPage
              ? "ml-0"
              : sidebarOpen
                ? "ml-[240px]"
                : "ml-[68px]"
          }
        `}
      >

        {/* Remove padding from login page */}
        <div
          className={
            isLoginPage
              ? ""
              : "p-8"
          }
        >

          <Routes>

            {/* ================= LOGIN ================= */}
            <Route
              path="/login"
              element={<Login />}
            />

            {/* ================= DASHBOARD ================= */}
            <Route
              path="/"
              element={<Dashboard />}
            />

            {/* ================= BUSINESSES ================= */}
            <Route
              path="/businesses"
              element={<Businesses />}
            />

            {/* ================= NFC CARDS ================= */}
            <Route
              path="/nfc-cards"
              element={<NFCCards />}
            />

            {/* ================= TRANSACTIONS ================= */}
            <Route
              path="/transactions"
              element={<Transactions />}
            />

            {/* ================= USERS ================= */}
            <Route
              path="/users"
              element={<Users />}
            />

            {/* ================= DEVICES ================= */}
            <Route
              path="/devices"
              element={<Devices />}
            />

            {/* ================= REPORTS ================= */}
            <Route
              path="/reports"
              element={<Reports />}
            />

            {/* ================= SYSTEM LOGS ================= */}
            <Route
              path="/system-logs"
              element={<SystemLogs />}
            />

            {/* ================= SETTINGS ================= */}
            <Route
              path="/settings"
              element={<Settings />}
            />

          </Routes>

        </div>

      </main>

    </div>
  )
}


function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}


export default App