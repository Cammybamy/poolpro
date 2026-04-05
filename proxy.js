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

  const isApi = req.nextUrl.pathname.startsWith('/api/')
  const isLogin = req.nextUrl.pathname === '/login'
  const isWelcome = req.nextUrl.pathname === '/welcome'
  const isAdmin = req.nextUrl.pathname.startsWith('/admin')

  if (!session && !isLogin && !isApi && !isWelcome) {
    return NextResponse.redirect(new URL('/login', req.url))
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
