import { createClient } from '@supabase/supabase-js'

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pass = ''
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)]
  return pass + '1!'
}

export async function POST(req) {
  const { email, full_name, role, company_id } = await req.json()

  if (!email || !full_name || !role || !company_id) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const tempPassword = generateTempPassword()

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  const { error: profileError } = await supabase.from('profiles').insert([{
    user_id: data.user.id,
    company_id,
    role,
    full_name,
    email,
    needs_password_change: true
  }])

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 400 })
  }

  return Response.json({ success: true, tempPassword })
}
