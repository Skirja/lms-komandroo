'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

function LoadingState({ count = 0 }) {
  if (count === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Quiz Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array(count).fill(0).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState([])
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizCount, setQuizCount] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        setIsInitialLoad(false)

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

          if (student) {
            const { data: quizzes } = await supabase
              .from('quizzes')
              .select('*')
              .eq('track_id', student.track_id)
              .eq('is_active', true)

            setQuizCount(quizzes?.length || 0)
            setQuizzes(quizzes || [])
          }
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase])

  if (loading) {
    if (isInitialLoad) {
      return null
    }
    return <LoadingState count={quizCount} />
  }

  if (!student) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Student information not found.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Quiz</h1>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No quizzes available yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{quiz.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {quiz.description}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Duration: {quiz.time_limit} minutes
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
