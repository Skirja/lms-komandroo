'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState([])
  const [student, setStudent] = useState(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get student data
      const { data: userData } = await supabase
        .from('users')
        .select('student_id')
        .eq('id', session.user.id)
        .single()

      if (userData) {
        const { data: student } = await supabase
          .from('students')
          .select('*, tracks(name)')
          .eq('id', userData.student_id)
          .single()

        setStudent(student)

        // TODO: Load quizzes for student's track
        setQuizzes([])
      }
    }

    loadData()
  }, [supabase])

  if (!student) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Latihan</h1>
        <p className="text-gray-600">Track: {student.tracks?.name}</p>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-600">
              No quizzes available yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Quizzes will be mapped here */}
        </div>
      )}
    </div>
  )
}
