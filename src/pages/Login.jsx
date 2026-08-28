import { useState } from "react"
import { useNavigate } from "react-router-dom"

function Login() {
  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()

    setError("")

    if (!username || !password) {
      setError("Please enter your username and password.")
      return
    }

    setLoading(true)

    // Phase 1 temporary admin credentials
    setTimeout(() => {
      if (username === "admin" && password === "buzztap123") {

        sessionStorage.setItem(
          "buzzTapAdminLoggedIn",
          "true"
        )

        navigate("/")

      } else {

        setError("Invalid username or password.")
        setLoading(false)

      }
    }, 700)
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

            {/* Username */}
            <div>

              <label className="
                block
                text-sm
                text-gray-400
                mb-2
              ">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError("")
                }}
                placeholder="Enter your username"
                autoComplete="username"
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