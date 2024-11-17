'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner Skeleton */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700">
        <CardHeader>
          <Skeleton className="h-8 w-64 bg-blue-400" />
          <Skeleton className="h-4 w-32 bg-blue-400" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-96 bg-blue-400" />
        </CardContent>
      </Card>

      {/* Progress Overview Skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quiz History Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({
    learning: 0,
    quiz: 0,
    projects: 0
  })
  const [quizHistory, setQuizHistory] = useState([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadStudentData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setLoading(false)
          return
        }

        // Get student data using the auth user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (userError) {
          setLoading(false)
          return
        }

        if (!userData || !userData.student_id) {
          setLoading(false)
          return
        }

        // Fetch student details with track information
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select(`
            *,
            tracks (
              name
            )
          `)
          .eq('id', userData.student_id)
          .single()

        if (studentError) {
          setLoading(false)
          return
        }

        setStudent(student)

        // TODO: Load actual progress data
        setProgress({
          learning: 60,
          quiz: 40,
          projects: 20
        })

        // TODO: Load actual quiz history
        setQuizHistory([
          { title: 'Quiz 1', score: 85, date: '2024-01-15' },
          { title: 'Quiz 2', score: 90, date: '2024-01-16' },
        ])
      } catch (error) {
        console.error('Error loading student data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStudentData()
  }, [supabase])

  if (loading) {
    return <LoadingState />
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <p className="text-center text-gray-600">
              Please log in as a student to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-green-600 to-green-700">
        <CardHeader>
          <CardTitle className="text-2xl text-white">
            Welcome back, {student.name}!
          </CardTitle>
          <p className="text-blue-100">
            Track: {student.tracks?.name}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-white">
            Keep up the great work! Stay focused and consistent in your learning journey.
          </p>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Learning Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress.learning} className="w-full" />
            <p className="mt-2 text-sm text-gray-600">
              {progress.learning}% completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Quiz Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress.quiz} className="w-full" />
            <p className="mt-2 text-sm text-gray-600">
              {progress.quiz}% completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Project Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress.projects} className="w-full" />
            <p className="mt-2 text-sm text-gray-600">
              {progress.projects}% completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quiz History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Quiz Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quizHistory.map((quiz, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{quiz.title}</h4>
                  <p className="text-sm text-gray-600">{quiz.date}</p>
                </div>
                <div className="text-lg font-semibold">
                  {quiz.score}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
