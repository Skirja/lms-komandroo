import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // If user is not signed in and trying to access protected routes
  if (!session && (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/dashboard'))) {
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is signed in but trying to access login page
  if (session && req.nextUrl.pathname === '/login') {
    // Get user data to determine where to redirect
    const { data: userData } = await supabase
      .from('users')
      .select('role, student_id')
      .eq('email', session.user.email)
      .single()

    if (userData?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    } else if (userData?.student_id) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // If user is signed in, check their role for specific routes
  if (session) {
    const { data: userData } = await supabase
      .from('users')
      .select('role, student_id')
      .eq('email', session.user.email)
      .single()

    // If trying to access admin routes but not an admin
    if (req.nextUrl.pathname.startsWith('/admin')) {
      if (!userData || userData.role !== 'admin') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // If trying to access student routes but not a student
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      if (!userData || !userData.student_id) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login']
}
