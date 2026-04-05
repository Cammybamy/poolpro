import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const { company_name, owner_email, owner_name } = await req.json()

  if (!company_name || !owner_email || !owner_name) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Create the company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert([{ name: company_name }])
    .select()
    .single()

  if (companyError) {
    return Response.json({ error: companyError.message }, { status: 400 })
  }

  // Invite the owner
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(owner_email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    data: { full_name: owner_name, role: 'owner', company_id: company.id }
  })

  if (inviteError) {
    // Roll back company creation
    await supabase.from('companies').delete().eq('id', company.id)
    return Response.json({ error: inviteError.message }, { status: 400 })
  }

  // Create owner profile
  const { error: profileError } = await supabase.from('profiles').insert([{
    user_id: inviteData.user.id,
    company_id: company.id,
    role: 'owner',
    full_name: owner_name,
    email: owner_email
  }])

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 400 })
  }

  return Response.json({ success: true, company })
}
