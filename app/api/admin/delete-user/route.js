import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const { profile_id } = await req.json()

  if (!profile_id) {
    return Response.json({ error: 'profile_id required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Get the auth user_id from the profile
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', profile_id)
    .single()

  if (fetchError || !profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Delete profile row
  await supabase.from('profiles').delete().eq('id', profile_id)

  // Delete auth user — this fully removes them so they can be re-invited
  const { error: authError } = await supabase.auth.admin.deleteUser(profile.user_id)
  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
