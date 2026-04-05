import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const { profile_id, email } = await req.json()

  if (!profile_id && !email) {
    return Response.json({ error: 'profile_id or email required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let authUserId = null

  if (profile_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', profile_id)
      .single()

    if (profile) {
      authUserId = profile.user_id
      await supabase.from('profiles').delete().eq('id', profile_id)
    }
  }

  // If no profile found but email provided, look up auth user directly via SQL
  if (!authUserId && email) {
    // Also clean up any orphaned profile row by email
    await supabase.from('profiles').delete().eq('email', email)

    // Use raw SQL to find the user — handles pending/invited states that listUsers misses
    const { data: authData } = await supabase
      .rpc('get_user_id_by_email', { user_email: email.toLowerCase() })
      .single()

    if (authData) {
      authUserId = authData
    } else {
      // Fallback: paginated list search
      let page = 1
      let found = false
      while (!found) {
        const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
        const match = (data?.users || []).find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (match) { authUserId = match.id; found = true }
        if (!data?.users?.length || data.users.length < 1000) break
        page++
      }
    }
  }

  if (!authUserId) {
    return Response.json({ error: 'User not found in auth system' }, { status: 404 })
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(authUserId)
  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
