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

function QuestionSidebar({ questions, currentQuestion, answers, onQuestionClick }) {
  return (
    <div className="w-64 p-4 border-r">
      <h3 className="font-semibold mb-4">Questions</h3>
      <div className="grid grid-cols-4 gap-2">
        {questions.map((question, index) => {
          const isAnswered = answers[question.id] !== undefined
          const isCurrent = question.id === currentQuestion.id

          return (
            <Button
              key={question.id}
              variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
              className="w-10 h-10"
              onClick={() => onQuestionClick(question)}
            >
              {index + 1}
            </Button>
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
            questions (
              id,
              question_text,
              options (
                id,
                option_text
              )
            )
          `)
          .eq("id", params.id)
          .single()

        if (!quiz) throw new Error("Quiz not found")

        setQuiz(quiz)
        setQuestions(quiz.questions)
        setCurrentQuestion(quiz.questions[0])

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

      // Get correct answers
      const { data: correctOptions } = await supabase
        .from("questions")
        .select("id, correct_option_id")
        .in("id", Object.keys(answers))

      correctOptions?.forEach(question => {
        if (answers[question.id] === question.correct_option_id) {
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">{quiz.title}</h1>
        <Timer
          startTime={attempt.start_time}
          timeLimit={quiz.time_limit}
          onTimeUp={() => handleSubmit(true)}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <QuestionSidebar
          questions={questions}
          currentQuestion={currentQuestion}
          answers={answers}
          onQuestionClick={setCurrentQuestion}
        />

        {/* Main content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <span className="text-sm text-muted-foreground">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <p className="text-lg mt-2">{currentQuestion.question_text}</p>
                </div>

                <RadioGroup
                  value={answers[currentQuestion.id]}
                  onValueChange={handleAnswer}
                >
                  {currentQuestion.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id}>{option.option_text}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {currentIndex < questions.length - 1 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              disabled={!allQuestionsAnswered}
            >
              Submit Quiz
            </Button>
          )}
        </div>
      </div>

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
