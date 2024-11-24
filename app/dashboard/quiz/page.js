"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Clock, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from 'next/link'

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
  const [statusFilter, setStatusFilter] = useState("all")
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
            // Get quizzes and their results for this student
            const { data: quizzes } = await supabase
              .from('quizzes')
              .select(`
                *,
                tracks (name),
                quiz_results (
                  id,
                  start_time,
                  end_time,
                  score
                )
              `)
              .eq('track_id', student.track_id)
              .eq('is_active', true)

            // Process quizzes to include completion status
            const processedQuizzes = quizzes?.map(quiz => {
              const results = quiz.quiz_results || []
              const latestAttempt = results.length > 0
                ? results.reduce((latest, current) =>
                  new Date(current.start_time) > new Date(latest.start_time) ? current : latest
                )
                : null

              return {
                ...quiz,
                status: latestAttempt?.end_time ? 'completed' : latestAttempt ? 'in_progress' : 'not_started',
                latestAttempt
              }
            }) || []

            setQuizCount(processedQuizzes.length)
            setQuizzes(processedQuizzes)
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

  const filteredQuizzes = quizzes.filter(quiz => {
    if (statusFilter === "all") return true
    if (statusFilter === "not_started") return quiz.status === "not_started"
    if (statusFilter === "completed") return quiz.status === "completed"
    return true
  })

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quizzes</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredQuizzes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No quizzes available yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <Card key={quiz.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{quiz.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {quiz.tracks?.name}
                    </p>
                  </div>
                  <Badge variant={
                    quiz.status === 'completed' ? 'default' :
                      quiz.status === 'in_progress' ? 'secondary' : 'outline'
                  }>
                    {quiz.status === 'completed' ? 'Completed' :
                      quiz.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    {quiz.time_limit} minutes
                  </div>
                  {quiz.latestAttempt && quiz.latestAttempt.score !== null && (
                    <div className="text-sm">
                      Latest Score: <span className="font-medium">{quiz.latestAttempt.score}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
              {quiz.status !== 'completed' && (
                <CardContent className="pt-0">
                  <Button className="w-full" asChild>
                    <Link href={`/dashboard/quiz/${quiz.id}/take`}>
                      <Play className="mr-2 h-4 w-4" />
                      {quiz.status === 'in_progress' ? 'Continue Quiz' : 'Start Quiz'}
                    </Link>
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
