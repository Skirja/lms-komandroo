"use client"

import { useState } from "react"
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
import { useToast } from "@/hooks/use-toast"

const TRACKS = [
  'Web Development',
  'Android Development',
  'IoT',
  'UI/UX',
  'DevOps',
  'Quality Assurance'
]

export default function CreateQuizPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: "",
    track_id: "",
    time_limit: 30,
    is_active: true,
  })

  const [questions, setQuestions] = useState([{
    question_text: "",
    options: [
      { option_text: "", is_correct: false },
      { option_text: "", is_correct: false },
    ]
  }])

  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

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

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    }
  }

  const addOption = (questionIndex) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options.push({ option_text: "", is_correct: false })
    setQuestions(newQuestions)
  }

  const removeOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions]
    if (newQuestions[questionIndex].options.length > 2) {
      newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex)
      setQuestions(newQuestions)
    }
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
    if (!formData.title || !formData.track_id || !formData.time_limit) {
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
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      // Get track ID from track name
      const { data: tracks, error: trackError } = await supabase
        .from('tracks')
        .select('id, name')
        .eq('name', formData.track_id)

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
          .insert({ name: formData.track_id })
          .select()
          .single()

        if (createTrackError) {
          throw new Error('Failed to create track. Please try again.')
        }

        trackId = newTrack.id
      }

      // Create the quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: formData.title,
          track_id: trackId,
          time_limit: parseInt(formData.time_limit) || null
        })
        .select()
        .single()

      if (quizError) {
        console.error('Quiz creation error:', quizError)
        throw new Error('Failed to create quiz. Please try again.')
      }

      // Insert questions and options
      for (const question of questions) {
        // Create question
        const { data: questionData, error: questionError } = await supabase
          .from('quiz_questions')
          .insert({
            quiz_id: quiz.id,
            question_text: question.question_text,
            question_type: 'single_choice'
          })
          .select()
          .single()

        if (questionError) {
          console.error('Question creation error:', questionError)
          throw new Error('Failed to create question. Please try again.')
        }

        // Create options for the question
        const optionsToInsert = question.options.map(opt => ({
          question_id: questionData.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct
        }))

        const { error: optionsError } = await supabase
          .from('quiz_options')
          .insert(optionsToInsert)

        if (optionsError) {
          console.error('Options creation error:', optionsError)
          throw new Error('Failed to create options. Please try again.')
        }
      }

      toast({
        title: "Success",
        description: "Quiz created successfully"
      })

      router.push('/admin/quiz')
      router.refresh()
    } catch (error) {
      console.error('Full error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create quiz",
        variant: "destructive"
      })
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Quiz</h1>

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
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter quiz title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="track">Track</Label>
              <Select
                value={formData.track_id}
                onValueChange={(value) => setFormData({ ...formData, track_id: value })}
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
                value={formData.time_limit}
                onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
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
            {isLoading ? "Creating..." : "Create Quiz"}
          </Button>
        </div>
      </form>
    </div>
  )
}
