import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const { email, full_name } = await req.json()

  if (!email || !full_name) {
    return Response.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/welcome`,
    data: { full_name, role: 'super_admin' }
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  const { error: profileError } = await supabase.from('profiles').insert([{
    user_id: data.user.id,
    full_name,
    email,
    super_admin: true,
    role: 'owner',
    company_id: null
  }])

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
