import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(req) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname
  const isApi = path.startsWith('/api/')
  const isPublic = path === '/login' || path === '/landing' || path === '/welcome' || path.startsWith('/auth/')
  const isAdmin = path.startsWith('/admin')

  if (!session && !isPublic && !isApi) {
    return NextResponse.redirect(new URL('/landing', req.url))
  }

  // Protect /admin — only super_admins
  if (isAdmin && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('super_admin')
      .eq('user_id', session.user.id)
      .single()

    if (!profile?.super_admin) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
