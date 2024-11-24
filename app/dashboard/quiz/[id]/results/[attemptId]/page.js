"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, Target, Calendar } from "lucide-react"
import Link from "next/link"
import { format, formatDistanceStrict } from "date-fns"
import { Progress } from "@/components/ui/progress"

export default function QuizResultsPage({ params }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadResult() {
      try {
        // Get quiz result with quiz details
        const { data: result } = await supabase
          .from("quiz_results")
          .select(`
            id,
            quiz_id,
            student_id,
            start_time,
            end_time,
            score,
            quizzes:quiz_id (
              title,
              time_limit,
              quiz_questions:quiz_questions (id)
            )
          `)
          .eq("id", params.attemptId)
          .single()

        if (result) {
          setResult({
            ...result,
            questionCount: result.quizzes.quiz_questions.length
          })
        }
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }

    loadResult()
  }, [supabase, params.attemptId])

  if (loading) {
    return <div className="p-6">Loading results...</div>
  }

  if (!result) {
    return <div className="p-6">Result not found</div>
  }

  const duration = formatDistanceStrict(
    new Date(result.end_time),
    new Date(result.start_time)
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Back Button */}
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/quiz">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Link>
        </Button>

        {/* Results Card */}
        <Card className="border-2">
          <CardHeader className="text-center border-b bg-muted/50 pb-8">
            <CardTitle className="text-3xl font-bold">{result.quizzes.title}</CardTitle>
            <p className="text-muted-foreground mt-2">Quiz Results</p>
          </CardHeader>
          <CardContent className="pt-8">
            {/* Score Display */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-primary mb-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">{result.score}%</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <Progress value={result.score} className="h-3" />
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-muted rounded-lg p-4 text-center">
                <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-lg font-semibold">
                  {Math.round(result.score * result.questionCount / 100)}/{result.questionCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  Correct Answers
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-lg font-semibold">
                  {duration}
                </div>
                <div className="text-sm text-muted-foreground">
                  Time Taken
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-lg font-semibold">
                  {format(new Date(result.end_time), "MMM d, yyyy")}
                </div>
                <div className="text-sm text-muted-foreground">
                  Completion Date
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Button */}
        <div className="text-center">
          <Button asChild>
            <Link href="/dashboard/quiz">
              Return to Quiz Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
