import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function SupabaseTest() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role, status")
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
            {profile.first_name} {profile.last_name}
          </strong>

          <span>
            {" "}— {profile.role} — {profile.status}
          </span>
        </div>
      ))}
    </div>
  )
}