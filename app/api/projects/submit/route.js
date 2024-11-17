import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const formData = await request.formData()
    const file = formData.get('file')
    const projectId = formData.get('projectId')

    // Verify auth session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('student_id')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData?.student_id) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Check if project exists and belongs to student's track
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('track_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if student belongs to the project's track
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('track_id')
      .eq('id', userData.student_id)
      .single()

    if (studentError || student.track_id !== project.track_id) {
      return NextResponse.json(
        { error: 'Project not available for your track' },
        { status: 403 }
      )
    }

    // Check if project is already submitted
    const { data: existingSubmission } = await supabase
      .from('student_projects')
      .select('id')
      .eq('student_id', userData.student_id)
      .eq('project_id', projectId)
      .single()

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'Project already submitted' },
        { status: 400 }
      )
    }

    // Upload file to Supabase Storage
    const fileName = `${userData.student_id}_${projectId}_${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-submissions')
      .upload(fileName, file)

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Create submission record
    const { error: submissionError } = await supabase
      .from('student_projects')
      .insert({
        student_id: userData.student_id,
        project_id: projectId,
        file_path: fileName
      })

    if (submissionError) {
      // Cleanup uploaded file if record creation fails
      await supabase.storage
        .from('project-submissions')
        .remove([fileName])

      return NextResponse.json(
        { error: 'Failed to create submission record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Project submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
