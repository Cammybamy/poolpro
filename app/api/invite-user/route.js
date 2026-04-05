import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const { email, full_name, role, company_id } = await req.json()

  if (!email || !full_name || !role || !company_id) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Send invite email — user sets their own password via the link
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    data: { full_name, role, company_id }
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  // Create profile row immediately so the user is visible in the team list
  const { error: profileError } = await supabase.from('profiles').insert([{
    user_id: data.user.id,
    company_id,
    role,
    full_name,
    email
  }])

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
