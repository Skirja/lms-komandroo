"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { differenceInSeconds } from "date-fns"
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
import { cn } from "@/lib/utils"

function QuestionSidebar({ questions, currentQuestion, answers, onQuestionClick }) {
  return (
    <div className="h-full space-y-4">
      <h3 className="font-semibold text-lg">Questions</h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {questions.map((question, index) => {
          const isAnswered = answers[question.id] !== undefined
          const isCurrent = question.id === currentQuestion.id

          return (
            <button
              key={question.id}
              onClick={() => onQuestionClick(question)}
              className={cn(
                "flex items-center justify-center w-10 h-10 text-sm font-medium rounded-lg transition-colors",
                {
                  "bg-primary text-primary-foreground": isCurrent,
                  "bg-muted": !isCurrent && isAnswered,
                  "hover:bg-muted": !isCurrent,
                }
              )}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Timer({ startTime, timeLimit, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60)

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsPassed = differenceInSeconds(new Date(), new Date(startTime))
      const remaining = (timeLimit * 60) - secondsPassed

      if (remaining <= 0) {
        clearInterval(interval)
        onTimeUp()
      } else {
        setTimeLeft(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, timeLimit, onTimeUp])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="text-lg font-mono">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  )
}

export default function QuizAttemptPage({ params }) {
  const [quiz, setQuiz] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadQuiz() {
      try {
        // Get quiz attempt
        const { data: attempt } = await supabase
          .from("quiz_results")
          .select("*")
          .eq("id", params.attemptId)
          .single()

        if (!attempt) throw new Error("Attempt not found")
        setAttempt(attempt)

        // Get quiz details and questions
        const { data: quiz } = await supabase
          .from("quizzes")
          .select(`
            *,
            quiz_questions (
              id,
              question_text,
              quiz_options (
                id,
                option_text,
                is_correct
              )
            )
          `)
          .eq("id", params.id)
          .single()

        if (!quiz) throw new Error("Quiz not found")

        setQuiz(quiz)
        setQuestions(quiz.quiz_questions)
        setCurrentQuestion(quiz.quiz_questions[0])

        // Load existing answers if any
        const { data: existingAnswers } = await supabase
          .from("quiz_answers")
          .select("*")
          .eq("quiz_result_id", params.attemptId)

        if (existingAnswers) {
          const answersMap = {}
          existingAnswers.forEach(answer => {
            answersMap[answer.question_id] = answer.selected_option_id
          })
          setAnswers(answersMap)
        }
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()
  }, [supabase, params.id, params.attemptId])

  async function handleAnswer(optionId) {
    try {
      const newAnswers = { ...answers, [currentQuestion.id]: optionId }
      setAnswers(newAnswers)

      // Save answer to database
      const { error } = await supabase
        .from("quiz_answers")
        .upsert({
          quiz_result_id: params.attemptId,
          question_id: currentQuestion.id,
          selected_option_id: optionId
        })

      if (error) throw error
    } catch (error) {
      console.error("Error saving answer:", error)
    }
  }

  async function handleSubmit(timeUp = false) {
    try {
      // Calculate score
      const totalQuestions = questions.length
      let correctAnswers = 0

      Object.entries(answers).forEach(([questionId, selectedOptionId]) => {
        const question = questions.find(q => q.id.toString() === questionId)
        const correctOption = question?.quiz_options.find(opt => opt.is_correct)
        if (correctOption && correctOption.id === selectedOptionId) {
          correctAnswers++
        }
      })

      const score = Math.round((correctAnswers / totalQuestions) * 100)

      // Update quiz result
      await supabase
        .from("quiz_results")
        .update({
          end_time: new Date().toISOString(),
          score: score
        })
        .eq("id", params.attemptId)

      // Redirect to results
      router.push(`/dashboard/quiz/${params.id}/results/${params.attemptId}`)
    } catch (error) {
      console.error("Error submitting quiz:", error)
    }
  }

  function handleNext() {
    const currentIndex = questions.findIndex(q => q.id === currentQuestion.id)
    if (currentIndex < questions.length - 1) {
      setCurrentQuestion(questions[currentIndex + 1])
    }
  }

  function handlePrevious() {
    const currentIndex = questions.findIndex(q => q.id === currentQuestion.id)
    if (currentIndex > 0) {
      setCurrentQuestion(questions[currentIndex - 1])
    }
  }

  if (loading) {
    return <div className="p-6">Loading quiz...</div>
  }

  if (!quiz || !attempt || !currentQuestion) {
    return <div className="p-6">Quiz not found</div>
  }

  const allQuestionsAnswered = questions.every(q => answers[q.id] !== undefined)
  const currentIndex = questions.findIndex(q => q.id === currentQuestion.id)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Timer */}
      <div className="bg-background border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <Timer startTime={attempt.start_time} timeLimit={quiz.time_limit} onTimeUp={handleSubmit} />
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowSubmitDialog(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          Submit Quiz
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Question Sidebar - Shows at top on mobile, left side on desktop */}
        <div className="w-full md:w-[280px] p-4 border-b md:border-b-0 md:border-r bg-muted/50">
          <QuestionSidebar
            questions={questions}
            currentQuestion={currentQuestion}
            answers={answers}
            onQuestionClick={setCurrentQuestion}
          />
        </div>

        {/* Question Content */}
        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Question */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">
                  Question {questions.findIndex(q => q.id === currentQuestion.id) + 1}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {Object.keys(answers).length} of {questions.length} answered
                </span>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-lg mb-6">{currentQuestion.question_text}</p>

                  <RadioGroup
                    value={answers[currentQuestion.id]}
                    onValueChange={handleAnswer}
                  >
                    {currentQuestion.quiz_options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id}>{option.option_text}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={questions.findIndex(q => q.id === currentQuestion.id) === 0}
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={questions.findIndex(q => q.id === currentQuestion.id) === questions.length - 1}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your quiz? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(false)}>
              Submit Quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
