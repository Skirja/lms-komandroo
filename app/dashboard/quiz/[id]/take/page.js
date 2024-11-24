"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, FileText, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function QuizInstructionsPage({ params }) {
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [existingAttempt, setExistingAttempt] = useState(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadQuiz() {
      try {
        // Get current user's student ID
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return router.push("/login")

        const { data: userData } = await supabase
          .from("users")
          .select("student_id")
          .eq("id", session.user.id)
          .single()

        if (!userData) return

        // Check for existing attempt
        const { data: attempts } = await supabase
          .from("quiz_results")
          .select("*")
          .eq("quiz_id", params.id)
          .eq("student_id", userData.student_id)
          .order("start_time", { ascending: false })
          .limit(1)

        if (attempts?.length > 0) {
          setExistingAttempt(attempts[0])
        }

        // Get quiz details
        const { data: quiz } = await supabase
          .from("quizzes")
          .select(`
            *,
            tracks (name),
            quiz_questions (id)
          `)
          .eq("id", params.id)
          .single()

        if (quiz) {
          setQuiz({
            ...quiz,
            questionCount: quiz.quiz_questions?.length || 0
          })
        }
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()
  }, [supabase, params.id, router])

  async function handleStartQuiz() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push("/login")

      const { data: userData } = await supabase
        .from("users")
        .select("student_id")
        .eq("id", session.user.id)
        .single()

      if (!userData) return

      // Create new quiz attempt
      const { data: attempt, error } = await supabase
        .from("quiz_results")
        .insert({
          quiz_id: params.id,
          student_id: userData.student_id,
          start_time: new Date().toISOString(),
          score: 0
        })
        .select()
        .single()

      if (error) throw error

      // Redirect to quiz
      router.push(`/dashboard/quiz/${params.id}/attempt/${attempt.id}`)
    } catch (error) {
      console.error("Error starting quiz:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!quiz) {
    return <div className="p-6">Quiz not found</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/quiz">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{quiz.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{quiz.tracks?.name}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{quiz.time_limit} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{quiz.questionCount} questions</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Instructions</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You have {quiz.time_limit} minutes to complete this quiz.</li>
              <li>All questions must be answered before submitting.</li>
              <li>The quiz will automatically submit when time runs out.</li>
              <li>You can navigate between questions using the sidebar or navigation buttons.</li>
              <li>Your progress is saved automatically when you select an answer.</li>
            </ul>
          </div>

          {existingAttempt?.end_time ? (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                You have already completed this quiz. Your score: {existingAttempt.score}%
              </p>
            </div>
          ) : (
            <Button className="w-full" size="lg" onClick={() => setShowStartDialog(true)}>
              Start Quiz
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Quiz?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Are you ready to start the quiz? The timer will begin immediately.</p>
                {existingAttempt && !existingAttempt.end_time && (
                  <div className="mt-4 flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <p>You have an unfinished attempt. Starting a new attempt will override it.</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartQuiz}>Start Quiz</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
