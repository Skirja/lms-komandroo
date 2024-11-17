import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { name, email, password, track } = await request.json()

    console.log('Creating student with data:', { name, email, track }) // Log input data

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth error:', authError) // Log auth error
      throw authError
    }

    console.log('Auth user created:', authUser) // Log successful auth user creation

    // Get track id
    const { data: trackData, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('name', track)
      .single()

    if (trackError) {
      console.error('Track error:', trackError) // Log track error
      throw trackError
    }

    if (!trackData) {
      console.error('Track not found:', track) // Log track not found
      throw new Error('Track not found')
    }

    console.log('Track found:', trackData) // Log track data

    // Create user record
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        name,
        email,
        role: 'student'
      })

    if (userError) {
      console.error('User error:', userError) // Log user error

      // Clean up auth user if user record creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw userError
    }

    console.log('User record created') // Log successful user creation

    // Create student record
    const { error: studentError } = await supabase
      .from('students')
      .insert({
        user_id: authUser.user.id,
        track_id: trackData.id
      })

    if (studentError) {
      console.error('Student error:', studentError) // Log student error

      // Clean up previous records if student record creation fails
      await supabase.from('users').delete().eq('id', authUser.user.id)
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw studentError
    }

    console.log('Student record created') // Log successful student creation

    return NextResponse.json({
      message: 'Student created successfully',
      student: {
        id: authUser.user.id,
        name,
        email,
        track
      }
    })
  } catch (error) {
    console.error('Final error:', error) // Log the final error
    return NextResponse.json({
      error: error.message,
      details: error
    }, { status: 500 })
  }
}

export async function PUT(request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { id, name, email, password, track } = await request.json()

    // Update user info
    const { error: userError } = await supabase
      .from('users')
      .update({ name, email })
      .eq('id', id)

    if (userError) throw userError

    // Update password if provided
    if (password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        id,
        { password }
      )
      if (passwordError) throw passwordError
    }

    // Update track if provided
    if (track) {
      const { data: trackData } = await supabase
        .from('tracks')
        .select('id')
        .eq('name', track)
        .single()

      if (!trackData) throw new Error('Track not found')

      const { error: trackError } = await supabase
        .from('students')
        .update({ track_id: trackData.id })
        .eq('user_id', id)

      if (trackError) throw trackError
    }

    return NextResponse.json({ message: 'Student updated successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies })
  const searchParams = new URL(request.url).searchParams

  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 10
  const search = searchParams.get('search') || ''
  const track = searchParams.get('track') || ''

  try {
    let query = supabase
      .from('students')
      .select(`
        user_id,
        tracks (
          name
        ),
        users (
          name,
          email
        )
      `)

    // Apply search filter
    if (search) {
      query = query.or(`users.name.ilike.%${search}%,users.email.ilike.%${search}%`)
    }

    // Apply track filter
    if (track) {
      query = query.eq('tracks.name', track)
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error } = await query
      .range(from, to)
      .order('user_id')

    if (error) throw error

    // Format the response
    const students = data.map(student => ({
      id: student.user_id,
      name: student.users.name,
      email: student.users.email,
      track: student.tracks.name
    }))

    return NextResponse.json({
      students,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
  }

  try {
    // Delete student record
    const { error: studentError } = await supabase
      .from('students')
      .delete()
      .eq('user_id', id)

    if (studentError) throw studentError

    // Delete user record
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (userError) throw userError

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) throw authError

    return NextResponse.json({ message: 'Student deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
