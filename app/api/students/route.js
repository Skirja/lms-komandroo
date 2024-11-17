import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { name, email, password, track } = await request.json()

    console.log('Creating student with data:', { name, email, track })

    // Create auth user using service role client
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw authError
    }

    console.log('Auth user created:', authUser)

    // Get track id
    const { data: trackData, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('name', track)
      .single()

    if (trackError) {
      console.error('Track error:', trackError)
      throw trackError
    }

    if (!trackData) {
      console.error('Track not found:', track)
      throw new Error('Track not found')
    }

    console.log('Track found:', trackData)

    // Create student record first
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({
        name,
        email,
        password, // Note: In production, you should hash this password
        track_id: trackData.id
      })
      .select()
      .single()

    if (studentError) {
      console.error('Student error:', studentError)
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      throw studentError
    }

    console.log('Student record created')

    // Create user record linking to student
    const { error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password, // Note: In production, you should hash this password
        role: 'student',
        student_id: studentData.id
      })

    if (userError) {
      console.error('User error:', userError)
      // Clean up previous records
      await supabase.from('students').delete().eq('id', studentData.id)
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      throw userError
    }

    console.log('User record created')

    return NextResponse.json({
      message: 'Student created successfully',
      student: {
        id: studentData.id,
        name,
        email,
        track
      }
    })
  } catch (error) {
    console.error('Final error:', error)
    return NextResponse.json({
      error: error.message,
      details: error
    }, { status: 500 })
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
        id,
        name,
        email,
        tracks (
          name
        )
      `)

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
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
      .order('id')

    if (error) throw error

    // Format the response
    const students = data.map(student => ({
      id: student.id,
      name: student.name,
      email: student.email,
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

export async function PUT(request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { id, name, email, password, track } = await request.json()

    // Get current student data
    const { data: currentStudent } = await supabase
      .from('students')
      .select('email')
      .eq('id', id)
      .single()

    if (!currentStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get track id if track is provided
    let track_id = undefined
    if (track) {
      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .select('id')
        .eq('name', track)
        .single()

      if (trackError || !trackData) {
        throw new Error('Track not found')
      }
      track_id = trackData.id
    }

    // Update student record
    const { error: studentError } = await supabase
      .from('students')
      .update({
        name,
        email,
        ...(password && { password }), // Only include if password provided
        ...(track_id && { track_id }) // Only include if track provided
      })
      .eq('id', id)

    if (studentError) throw studentError

    // Update user record
    const { error: userError } = await supabase
      .from('users')
      .update({
        email,
        ...(password && { password })
      })
      .eq('student_id', id)

    if (userError) throw userError

    // Get auth user by email and update if needed
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
    const authUser = authData.users.find(user => user.email === currentStudent.email)

    if (authUser) {
      const updates = {
        ...(email && { email }),
        ...(password && { password }),
        ...(name && { 
          user_metadata: {
            ...authUser.user_metadata,
            full_name: name
          }
        })
      }

      if (Object.keys(updates).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id,
          updates
        )
        if (authError) throw authError
      }
    }

    return NextResponse.json({ message: 'Student updated successfully' })
  } catch (error) {
    console.error('Update error:', error)
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
    // First get the student's email to find their auth user
    const { data: studentData } = await supabase
      .from('students')
      .select('email')
      .eq('id', id)
      .single()

    if (!studentData) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get the auth user by email
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
    const authUser = authData.users.find(user => user.email === studentData.email)

    // Delete user record first (foreign key constraint)
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('student_id', id)

    if (userError) throw userError

    // Delete student record
    const { error: studentError } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (studentError) throw studentError

    // Delete auth user if found
    if (authUser) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      if (authError) throw authError
    }

    return NextResponse.json({ message: 'Student deleted successfully' })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
