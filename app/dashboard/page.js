'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Upload, Check } from 'lucide-react'

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
      {/* Welcome Banner Skeleton */}
      <Card className="bg-gradient-to-r from-green-600 to-green-700">
        <CardHeader>
          <Skeleton className="h-8 w-64 bg-green-400" />
          <Skeleton className="h-4 w-32 bg-green-400" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-96 bg-green-400" />
        </CardContent>
      </Card>

      {/* Progress Overview Skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full mb-2" />
              <Skeleton className="h-4 w-16" />
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
            {Array(2).fill(0).map((_, i) => (
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
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [projects, setProjects] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({
    learning: 0,
    quiz: 0,
    projects: 0
  })
  const [quizHistory, setQuizHistory] = useState([])
  const { toast } = useToast()
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
            // Load dashboard data
            const { data: learningResources } = await supabase
              .from('learning_resources')
              .select('id')
              .eq('track_id', student.track_id)

            const { data: completedResources } = await supabase
              .from('student_progress')
              .select('*')
              .eq('student_id', session.user.id)
              .eq('completed', true)

            let learningProgress = 0
            if (learningResources) {
              const totalResources = learningResources.length
              const completedCount = completedResources?.length || 0
              learningProgress = totalResources > 0
                ? Math.round((completedCount / totalResources) * 100)
                : 0
            }

            // Get projects and submissions
            const { data: projects } = await supabase
              .from('projects')
              .select('*')
              .eq('track_id', student.track_id)
              .order('deadline', { ascending: true })

            const { data: submissions } = await supabase
              .from('student_projects')
              .select('*')
              .eq('student_id', student.id)

            setProjects(projects || [])
            setSubmissions(submissions || [])

            // Calculate project progress
            const projectProgress = projects?.length > 0
              ? Math.round((submissions?.length || 0) / projects.length * 100)
              : 0

            // Get quiz progress
            const { data: allQuizzes } = await supabase
              .from('quizzes')
              .select('*')
              .eq('track_id', student.track_id)
              .eq('is_active', true)

            const { data: quizResults } = await supabase
              .from('quiz_results')
              .select(`
                id,
                quiz_id,
                score,
                end_time,
                quizzes (
                  title
                )
              `)
              .eq('student_id', student.id)
              .not('end_time', 'is', null)
              .order('end_time', { ascending: false })

            // Calculate quiz progress
            const quizProgress = allQuizzes?.length > 0
              ? Math.round((quizResults?.length || 0) / allQuizzes.length * 100)
              : 0

            setProgress({
              learning: learningProgress,
              projects: projectProgress,
              quiz: quizProgress
            })

            // Set actual quiz history
            setQuizHistory(
              quizResults?.map(result => ({
                title: result.quizzes.title,
                score: result.score,
                date: format(new Date(result.end_time), 'yyyy-MM-dd')
              })) || []
            )
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
    return <LoadingState count={1} />
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
          <p className="text-gray-100">
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

      {/* Projects Section */}
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            Submit your projects before the deadline. You can only submit once per project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const isSubmitted = submissions.some(s => s.project_id === project.id)
              const isExpired = new Date(project.deadline) < new Date()

              return (
                <Card key={project.id} className="relative">
                  <CardHeader>
                    <CardTitle>{project.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Deadline: {format(new Date(project.deadline), 'PPP')}
                    </p>
                  </CardContent>
                  <CardFooter>
                    {isSubmitted ? (
                      <Button className="w-full" variant="outline" disabled>
                        <Check className="w-4 h-4 mr-2" />
                        Submitted
                      </Button>
                    ) : isExpired ? (
                      <Button className="w-full" variant="destructive" disabled>
                        Expired
                      </Button>
                    ) : (
                      <div className="w-full">
                        <Input
                          type="file"
                          accept=".zip,.rar"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(project.id, e.target.files[0])
                            }
                          }}
                          disabled={uploading}
                          className="hidden"
                          id={`file-${project.id}`}
                        />
                        <Button
                          className="w-full"
                          onClick={() => document.getElementById(`file-${project.id}`).click()}
                          disabled={uploading}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Upload Project'}
                        </Button>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

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
