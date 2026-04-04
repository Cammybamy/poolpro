import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const { email, password, full_name, role, company_id } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
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
    email
  }])

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
