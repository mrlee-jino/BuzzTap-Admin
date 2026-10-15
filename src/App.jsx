import { lazy, Suspense, useEffect, useState } from "react"
import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom"

import Sidebar from "./components/Sidebar"
import NotificationBell from "./components/NotificationBell"

const Login = lazy(() => import("./pages/Login"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const Businesses = lazy(() => import("./pages/Businesses"))
const NFCCards = lazy(() => import("./pages/NFCCards"))
const Transactions = lazy(() => import("./pages/Transactions"))
const PaymentOversight = lazy(() => import("./pages/PaymentOversight"))
const Users = lazy(() => import("./pages/Users"))
const Reports = lazy(() => import("./pages/Reports"))
const SystemLogs = lazy(() => import("./pages/SystemLogs"))
const Settings = lazy(() => import("./pages/Settings"))
const BuzzPointTreasury = lazy(() => import("./pages/BuzzPointTreasury"))
const Customers = lazy(() => import("./pages/Customers"))
const ContentManagement = lazy(() => import("./pages/ContentManagement"))
import { supabase } from "./lib/supabaseClient"

function ProtectedRoute({ children }) {
  const [checkingAuthorization, setCheckingAuthorization] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    let mounted = true
    let validationId = 0

    const verifyAdmin = async (session) => {
      const currentValidationId = ++validationId

      if (!session?.user?.id) {
        if (mounted) {
          setIsAuthorized(false)
          setCheckingAuthorization(false)
        }
        return
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", session.user.id)
          .single()

        if (!mounted || currentValidationId !== validationId) return

        setIsAuthorized(!error && profile?.role === "ADMIN" && profile?.status === "ACTIVE")
      } catch {
        if (!mounted || currentValidationId !== validationId) return
        setIsAuthorized(false)
      } finally {
        if (mounted && currentValidationId === validationId) {
          setCheckingAuthorization(false)
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) verifyAdmin(data.session)
    }).catch(() => {
      if (mounted) {
        setIsAuthorized(false)
        setCheckingAuthorization(false)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setCheckingAuthorization(true)
        window.setTimeout(() => verifyAdmin(nextSession), 0)
      }
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  if (checkingAuthorization) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-400">Checking session...</div>
  }

  return isAuthorized ? children : <Navigate to="/login" replace />
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

          {!isLoginPage && <div className="mb-5 flex justify-end"><ProtectedRoute><NotificationBell /></ProtectedRoute></div>}
          <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-400">Loading page...</div>}>
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
            <Route path="/payments" element={<ProtectedRoute><PaymentOversight key={location.search} /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/content" element={<ProtectedRoute><ContentManagement /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
          </Suspense>

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
