"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Edit, Plus, Trash2, Users } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { AdminFab } from '@/components/ui/admin-fab'

const TRACKS = [
  'Web Development',
  'Android Development',
  'IoT',
  'UI/UX',
  'DevOps',
  'Quality Assurance'
]

export default function QuizPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const [quizzes, setQuizzes] = useState([])
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [selectedTrack, setSelectedTrack] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  const fetchQuizzes = useCallback(async () => {
    try {
      let query = supabase
        .from('quizzes')
        .select(`
          id,
          title,
          track_id,
          created_at,
          is_active,
          time_limit,
          tracks (
            id,
            name
          ),
          quiz_questions (
            id
          )
        `)
        .order('created_at', { ascending: false })

      if (selectedTrack !== "all") {
        query = query.eq('tracks.name', selectedTrack)
      }

      const { data, error } = await query

      if (error) throw error

      const quizzesWithCounts = data.map(quiz => ({
        ...quiz,
        questionCount: quiz.quiz_questions?.length || 0,
        track: quiz.tracks?.name
      }))

      setQuizzes(quizzesWithCounts)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch quizzes",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedTrack, supabase, toast])

  useEffect(() => {
    fetchQuizzes()
  }, [fetchQuizzes])

  const handleDelete = (quiz) => {
    setSelectedQuiz(quiz)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    try {
      // Delete quiz options first
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('id')
        .eq('quiz_id', selectedQuiz.id)

      if (questions) {
        const questionIds = questions.map(q => q.id)
        await supabase
          .from('quiz_options')
          .delete()
          .in('question_id', questionIds)
      }

      // Delete quiz questions
      await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', selectedQuiz.id)

      // Finally delete the quiz
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', selectedQuiz.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Quiz deleted successfully"
      })

      setIsDeleteOpen(false)
      fetchQuizzes()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete quiz",
        variant: "destructive"
      })
    }
  }

  return (
    <>
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Manage Quiz</h1>
            <p className="text-muted-foreground">Create and manage quizzes for students</p>
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
            <Select value={selectedTrack} onValueChange={setSelectedTrack}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tracks</SelectItem>
                {TRACKS.map((track) => (
                  <SelectItem key={track} value={track}>
                    {track}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/admin/quiz/create" className="w-full sm:w-auto" passHref>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <p>Loading quizzes...</p>
          ) : quizzes.length === 0 ? (
            <p>No quizzes found.</p>
          ) : (
            quizzes.map((quiz) => (
              <Card key={quiz.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-lg truncate">{quiz.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{quiz.track}</p>
                    </div>
                    <Badge variant={quiz.is_active ? "default" : "secondary"} className="shrink-0">
                      {quiz.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{quiz.time_limit || "No"} minutes</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{quiz.questionCount} questions</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto pt-6">
                  <div className="flex flex-col w-full gap-2">
                    <Button
                      variant="outline"
                      className="w-full h-10 text-sm"
                      asChild
                    >
                      <Link href={`/admin/quiz/${quiz.id}/results`}>
                        <Users className="mr-2 h-4 w-4" />
                        Results
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-10 text-sm"
                      asChild
                    >
                      <Link href={`/admin/quiz/${quiz.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-10 text-sm"
                      onClick={() => handleDelete(quiz)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quiz</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedQuiz?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AdminFab />
    </>
  )
}
