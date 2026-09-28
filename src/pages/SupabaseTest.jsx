import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function SupabaseTest() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadProfiles() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, status")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Supabase error:", error)
      setError(error.message)
      setLoading(false)
      return
    }

    setProfiles(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(loadProfiles, 0)
    return () => window.clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div>
        <h1>Supabase Test</h1>
        <p>Loading profiles...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1>Supabase Test</h1>
        <p>Connection error:</p>
        <pre>{error}</pre>
      </div>
    )
  }

  return (
    <div>
      <h1>Supabase Test</h1>

      <p>
        Connected successfully. Profiles found: {profiles.length}
      </p>

      {profiles.map((profile) => (
        <div key={profile.id}>
          <strong>
            {profile.full_name || "Unnamed User"}
          </strong>

          <span>
            {" "}— {profile.role} — {profile.status}
          </span>
        </div>
      ))}
    </div>
  )
}