"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Trash2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from '@/hooks/use-toast'

const TRACKS = [
  'Web Development',
  'Android Development',
  'IoT',
  'UI/UX',
  'DevOps',
  'Quality Assurance'
]

export default function EditQuizPage({ params }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const [quizData, setQuizData] = useState({
    title: "",
    track_id: "",
    time_limit: 30,
    is_active: true,
  })

  const [questions, setQuestions] = useState([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const fetchQuizData = useCallback(async () => {
    try {
      // Fetch quiz data
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          *,
          tracks (
            id,
            name
          )
        `)
        .eq('id', params.id)
        .single()

      if (quizError) throw quizError

      // Fetch questions and options
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          quiz_options (*)
        `)
        .eq('quiz_id', params.id)

      if (questionsError) throw questionsError

      setQuizData({
        title: quiz.title,
        track_id: quiz.tracks.name,
        time_limit: quiz.time_limit || 30,
        is_active: quiz.is_active
      })

      setQuestions(questionsData.map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: q.quiz_options
      })))

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch quiz data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, supabase, toast])

  useEffect(() => {
    fetchQuizData()
  }, [fetchQuizData])

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        options: [
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false },
        ]
      }
    ])
  }

  const removeQuestion = async (index) => {
    const question = questions[index]
    if (question.id) {
      try {
        // Delete options first
        await supabase
          .from('quiz_options')
          .delete()
          .eq('question_id', question.id)

        // Then delete question
        await supabase
          .from('quiz_questions')
          .delete()
          .eq('id', question.id)

        toast({
          title: "Success",
          description: "Question deleted successfully"
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete question",
          variant: "destructive"
        })
        return
      }
    }

    setQuestions(questions.filter((_, i) => i !== index))
  }

  const addOption = (questionIndex) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options.push({ option_text: "", is_correct: false })
    setQuestions(newQuestions)
  }

  const removeOption = async (questionIndex, optionIndex) => {
    const option = questions[questionIndex].options[optionIndex]
    if (option.id) {
      try {
        await supabase
          .from('quiz_options')
          .delete()
          .eq('id', option.id)

        toast({
          title: "Success",
          description: "Option deleted successfully"
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete option",
          variant: "destructive"
        })
        return
      }
    }

    const newQuestions = [...questions]
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex)
    setQuestions(newQuestions)
  }

  const updateQuestionText = (index, text) => {
    const newQuestions = [...questions]
    newQuestions[index].question_text = text
    setQuestions(newQuestions)
  }

  const updateOptionText = (questionIndex, optionIndex, text) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options[optionIndex].option_text = text
    setQuestions(newQuestions)
  }

  const updateCorrectOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.map((opt, i) => ({
      ...opt,
      is_correct: i === optionIndex
    }))
    setQuestions(newQuestions)
  }

  const validateQuiz = () => {
    if (!quizData.title || !quizData.track_id || !quizData.time_limit) {
      setError("Please fill in all quiz details")
      return false
    }

    for (const question of questions) {
      if (!question.question_text.trim()) {
        setError("All questions must have text")
        return false
      }

      if (!question.options.some(opt => opt.is_correct)) {
        setError("Each question must have at least one correct answer")
        return false
      }

      if (question.options.some(opt => !opt.option_text.trim())) {
        setError("All options must have text")
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!validateQuiz()) {
      return
    }

    setIsLoading(true)

    try {
      // Get track ID from track name
      const { data: tracks, error: trackError } = await supabase
        .from('tracks')
        .select('id, name')
        .eq('name', quizData.track_id)

      if (trackError) {
        throw new Error('Failed to find track. Please try again.')
      }

      // Use the first matching track or create a new one
      let trackId
      if (tracks && tracks.length > 0) {
        trackId = tracks[0].id
      } else {
        // Create new track if none exists
        const { data: newTrack, error: createTrackError } = await supabase
          .from('tracks')
          .insert({ name: quizData.track_id })
          .select()
          .single()

        if (createTrackError) {
          throw new Error('Failed to create track. Please try again.')
        }

        trackId = newTrack.id
      }

      // Update quiz
      const { error: quizError } = await supabase
        .from('quizzes')
        .update({
          title: quizData.title,
          track_id: trackId,
          time_limit: parseInt(quizData.time_limit) || null,
          is_active: quizData.is_active
        })
        .eq('id', params.id)

      if (quizError) {
        throw new Error('Failed to update quiz. Please try again.')
      }

      // Update existing questions and add new ones
      for (const question of questions) {
        if (question.id) {
          // Update existing question
          const { error: questionError } = await supabase
            .from('quiz_questions')
            .update({
              question_text: question.question_text,
              question_type: 'single_choice'
            })
            .eq('id', question.id)

          if (questionError) {
            throw new Error('Failed to update question. Please try again.')
          }

          // Update options
          for (const option of question.options) {
            if (option.id) {
              // Update existing option
              const { error: optionError } = await supabase
                .from('quiz_options')
                .update({
                  option_text: option.option_text,
                  is_correct: option.is_correct
                })
                .eq('id', option.id)

              if (optionError) {
                throw new Error('Failed to update option. Please try again.')
              }
            } else {
              // Add new option
              const { error: optionError } = await supabase
                .from('quiz_options')
                .insert({
                  question_id: question.id,
                  option_text: option.option_text,
                  is_correct: option.is_correct
                })

              if (optionError) {
                throw new Error('Failed to create option. Please try again.')
              }
            }
          }
        } else {
          // Add new question
          const { data: newQuestion, error: questionError } = await supabase
            .from('quiz_questions')
            .insert({
              quiz_id: params.id,
              question_text: question.question_text,
              question_type: 'single_choice'
            })
            .select()
            .single()

          if (questionError) {
            throw new Error('Failed to create question. Please try again.')
          }

          // Add options for new question
          const optionsToInsert = question.options.map(opt => ({
            question_id: newQuestion.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct
          }))

          const { error: optionsError } = await supabase
            .from('quiz_options')
            .insert(optionsToInsert)

          if (optionsError) {
            throw new Error('Failed to create options. Please try again.')
          }
        }
      }

      toast({
        title: "Success",
        description: "Quiz updated successfully"
      })

      router.push('/admin/quiz')
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update quiz",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading quiz data...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Quiz</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Quiz Details */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Quiz Title</Label>
              <Input
                id="title"
                value={quizData.title}
                onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                placeholder="Enter quiz title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="track">Track</Label>
              <Select
                value={quizData.track_id}
                onValueChange={(value) => setQuizData({ ...quizData, track_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a track" />
                </SelectTrigger>
                <SelectContent>
                  {TRACKS.map((track) => (
                    <SelectItem key={track} value={track}>
                      {track}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time_limit">Time Limit (minutes)</Label>
              <Input
                id="time_limit"
                type="number"
                min="1"
                value={quizData.time_limit}
                onChange={(e) => setQuizData({ ...quizData, time_limit: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={quizData.is_active}
                onCheckedChange={(checked) => setQuizData({ ...quizData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Questions</h2>
            <Button type="button" onClick={addQuestion}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>

          {questions.map((question, questionIndex) => (
            <Card key={questionIndex}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle>Question {questionIndex + 1}</CardTitle>
                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(questionIndex)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Question Text</Label>
                  <Textarea
                    value={question.question_text}
                    onChange={(e) => updateQuestionText(questionIndex, e.target.value)}
                    placeholder="Enter your question"
                  />
                </div>

                <div className="space-y-4">
                  <Label>Options</Label>
                  <RadioGroup
                    value={question.options.findIndex(opt => opt.is_correct).toString()}
                    onValueChange={(value) => updateCorrectOption(questionIndex, parseInt(value))}
                  >
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={optionIndex.toString()} id={`q${questionIndex}-opt${optionIndex}`} />
                        <Input
                          value={option.option_text}
                          onChange={(e) => updateOptionText(questionIndex, optionIndex, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                          className="flex-1"
                        />
                        {question.options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(questionIndex, optionIndex)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </RadioGroup>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addOption(questionIndex)}
                  >
                    Add Option
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/quiz')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
