import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(request.url)
  const track = searchParams.get('track')

  try {
    let query = supabase
      .from('projects')
      .select(`
        *,
        tracks (
          name
        ),
        student_projects (
          id,
          file_path,
          submitted_at,
          students (
            name,
            email
          )
        )
      `)
      .order('deadline', { ascending: true })

    if (track) {
      const { data: trackData } = await supabase
        .from('tracks')
        .select('id')
        .eq('name', track)
        .single()

      if (trackData) {
        query = query.eq('track_id', trackData.id)
      }
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { title, description, deadline, track } = await request.json()

    // Get track id
    const { data: trackData, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('name', track)
      .single()

    if (trackError) throw trackError

    const { error } = await supabase
      .from('projects')
      .insert({
        title,
        description,
        deadline: new Date(deadline).toISOString(),
        track_id: trackData.id
      })

    if (error) throw error

    return NextResponse.json({ message: 'Project created successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { id, title, description, deadline, track } = await request.json()

    // Get track id
    const { data: trackData, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('name', track)
      .single()

    if (trackError) throw trackError

    const { error } = await supabase
      .from('projects')
      .update({
        title,
        description,
        deadline: new Date(deadline).toISOString(),
        track_id: trackData.id
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Project updated successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  try {
    // First, delete all student submissions for this project
    const { error: submissionError } = await supabase
      .from('student_projects')
      .delete()
      .eq('project_id', id)

    if (submissionError) throw submissionError

    // Then delete the project
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
