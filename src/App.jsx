import { useState } from "react"
import {
  BrowserRouter,
  Navigate,
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
import BuzzPointTreasury from "./pages/BuzzPointTreasury"
import Customers from "./pages/Customers"
import ContentManagement from "./pages/ContentManagement"
import { AdminDataProvider } from "./context/AdminDataContext"

function ProtectedRoute({ children }) {
  const isLoggedIn = sessionStorage.getItem("buzzTapAdminLoggedIn") === "true"

  return isLoggedIn ? children : <Navigate to="/login" replace />
}


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
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />

            {/* ================= BUSINESSES ================= */}
            <Route
              path="/businesses"
              element={<ProtectedRoute><Businesses /></ProtectedRoute>}
            />

            {/* ================= NFC CARDS ================= */}
            <Route
              path="/nfc-cards"
              element={<ProtectedRoute><NFCCards /></ProtectedRoute>}
            />

            {/* ================= TRANSACTIONS ================= */}
            <Route
              path="/transactions"
              element={<ProtectedRoute><Transactions /></ProtectedRoute>}
            />

            {/* ================= USERS ================= */}
            <Route
              path="/users"
              element={<ProtectedRoute><Users /></ProtectedRoute>}
            />

            {/* ================= DEVICES ================= */}
            <Route
              path="/devices"
              element={<ProtectedRoute><Devices /></ProtectedRoute>}
            />

            {/* ================= REPORTS ================= */}
            <Route
              path="/reports"
              element={<ProtectedRoute><Reports /></ProtectedRoute>}
            />

            {/* ================= SYSTEM LOGS ================= */}
            <Route
              path="/system-logs"
              element={<ProtectedRoute><SystemLogs /></ProtectedRoute>}
            />

            {/* ================= SETTINGS ================= */}
            <Route
              path="/settings"
              element={<ProtectedRoute><Settings /></ProtectedRoute>}
            />

            <Route path="/treasury" element={<ProtectedRoute><BuzzPointTreasury /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/content" element={<ProtectedRoute><ContentManagement /></ProtectedRoute>} />

          </Routes>

        </div>

      </main>

    </div>
  )
}


function App() {
  return (
    <AdminDataProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AdminDataProvider>
  )
}


export default App