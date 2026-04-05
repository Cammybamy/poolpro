import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const { name, email, company, phone, pools } = await req.json()

  if (!name || !email) {
    return Response.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await supabase.from('leads').insert([{
    name,
    email,
    company: company || null,
    phone: phone || null,
    pools_count: pools || null,
    created_at: new Date().toISOString()
  }])

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ success: true })
}
