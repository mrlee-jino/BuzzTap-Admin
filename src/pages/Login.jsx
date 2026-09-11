import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()

    setError("")

    if (!email || !password) {
      setError("Please enter your email and password.")
      return
    }

    setLoading(true)

    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (authError) {
        throw new Error("Invalid email or password.")
      }

      const user = authData.user

      if (!user) {
        throw new Error("Unable to retrieve your account.")
      }

      // 2. Get the user's BuzzTap profile
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, first_name, last_name, role, status")
          .eq("id", user.id)
          .single()

      if (profileError) {
        await supabase.auth.signOut()
        throw new Error(
          "Your account profile could not be found."
        )
      }

      // 3. Make sure this account is an administrator
      if (profile.role !== "ADMIN") {
        await supabase.auth.signOut()
        throw new Error(
          "Access denied. This account is not a BuzzTap administrator."
        )
      }

      // 4. Check account status
      if (profile.status !== "ACTIVE") {
        await supabase.auth.signOut()
        throw new Error(
          `Your account is currently ${profile.status.toLowerCase()}.`
        )
      }

      // 5. Log successful admin login event via secure RPC
      try {
        const { error: auditError } = await supabase.rpc("admin_log_auth_event", {
          p_action: "ADMIN_LOGIN",
          p_reason: null,
        })

        if (auditError) {
          console.error("Admin login audit logging failed:", auditError)
        }
      } catch (auditError) {
        console.error("Admin login audit logging failed:", auditError)
      }

      // 6. Store a simple session flag for the existing app
      sessionStorage.setItem(
        "buzzTapAdminLoggedIn",
        "true"
      )

      // 7. Go to dashboard
      navigate("/")
    } catch (error) {
      console.error("Login error:", error)
      setError(error.message || "Unable to sign in.")
      setLoading(false)
    }
  }

  return (
    <div className="
      min-h-screen
      bg-[#080808]
      text-white
      flex
      items-center
      justify-center
      px-6
      relative
      overflow-hidden
    ">

      {/* Background glow */}
      <div className="
        absolute
        top-[-180px]
        left-1/2
        -translate-x-1/2
        w-[500px]
        h-[500px]
        bg-[#FFD400]/10
        rounded-full
        blur-[120px]
        pointer-events-none
      " />

      <div className="
        absolute
        bottom-[-250px]
        right-[-150px]
        w-[450px]
        h-[450px]
        bg-[#FFD400]/5
        rounded-full
        blur-[120px]
        pointer-events-none
      " />

      {/* Login container */}
      <div className="
        relative
        z-10
        w-full
        max-w-md
      ">

        {/* Logo */}
        <div className="flex justify-center mb-7">
          <div className="
            w-16
            h-16
            rounded-2xl
            bg-[#FFD400]
            text-black
            flex
            items-center
            justify-center
            font-black
            text-2xl
            shadow-[0_0_35px_rgba(255,212,0,0.18)]
          ">
            B
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="
            text-3xl
            font-bold
            tracking-tight
          ">
            Buzz<span className="text-[#FFD400]">Tap</span>
          </h1>

          <p className="
            text-gray-500
            text-sm
            mt-2
          ">
            Admin Portal
          </p>
        </div>

        {/* Login card */}
        <div className="
          bg-[#101010]/95
          backdrop-blur-xl
          border
          border-white/10
          rounded-2xl
          p-8
          shadow-[0_25px_80px_rgba(0,0,0,0.5)]
        ">

          <div className="mb-6">
            <h2 className="
              text-xl
              font-semibold
            ">
              Welcome back
            </h2>

            <p className="
              text-sm
              text-gray-500
              mt-1
            ">
              Sign in to manage the BuzzTap platform.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Email */}
            <div>
              <label className="
                block
                text-sm
                text-gray-400
                mb-2
              ">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
                placeholder="Enter your email"
                autoComplete="email"
                className="
                  w-full
                  bg-[#080808]
                  border
                  border-white/10
                  rounded-xl
                  px-4
                  py-3
                  text-white
                  placeholder:text-gray-600
                  outline-none
                  focus:border-[#FFD400]/60
                  focus:ring-2
                  focus:ring-[#FFD400]/10
                  transition-all
                "
              />
            </div>

            {/* Password */}
            <div>
              <label className="
                block
                text-sm
                text-gray-400
                mb-2
              ">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError("")
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="
                    w-full
                    bg-[#080808]
                    border
                    border-white/10
                    rounded-xl
                    px-4
                    py-3
                    pr-12
                    text-white
                    placeholder:text-gray-600
                    outline-none
                    focus:border-[#FFD400]/60
                    focus:ring-2
                    focus:ring-[#FFD400]/10
                    transition-all
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-gray-500
                    hover:text-[#FFD400]
                    transition-colors
                  "
                >
                  {showPassword ? "◉" : "○"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="
                border
                border-red-500/20
                bg-red-500/10
                text-red-400
                rounded-xl
                px-4
                py-3
                text-sm
              ">
                {error}
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                bg-[#FFD400]
                text-black
                rounded-xl
                py-3
                font-semibold
                hover:brightness-110
                hover:scale-[1.01]
                active:scale-[0.99]
                disabled:opacity-60
                disabled:cursor-not-allowed
                transition-all
                duration-200
                shadow-[0_0_25px_rgba(255,212,0,0.12)]
              "
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p className="
          text-center
          text-xs
          text-gray-600
          mt-6
        ">
          BuzzTap Admin Portal
        </p>

      </div>
    </div>
  )
}

export default Login