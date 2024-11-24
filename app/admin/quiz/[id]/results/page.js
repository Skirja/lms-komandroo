"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

export default function QuizResultsPage({ params }) {
  const [results, setResults] = useState([])
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchResults() {
      try {
        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*, tracks(name)')
          .eq('id', params.id)
          .single()

        if (quizError) throw quizError
        setQuiz(quizData)

        // Fetch quiz results with student details
        const { data: resultsData, error: resultsError } = await supabase
          .from('quiz_results')
          .select(`
            *,
            students (
              name,
              email
            )
          `)
          .eq('quiz_id', params.id)
          .order('created_at', { ascending: false })

        if (resultsError) throw resultsError
        setResults(resultsData)

      } catch (error) {
        console.error('Error fetching results:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [supabase, params.id])

  if (loading) {
    return <div className="p-6">Loading results...</div>
  }

  if (!quiz) {
    return <div className="p-6">Quiz not found</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/quiz">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quiz Results: {quiz.title}</CardTitle>
          <p className="text-sm text-muted-foreground">Track: {quiz.tracks?.name}</p>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No results found for this quiz yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => {
                  const duration = result.end_time
                    ? Math.round((new Date(result.end_time) - new Date(result.start_time)) / 1000 / 60)
                    : null

                  return (
                    <TableRow key={result.id}>
                      <TableCell>{result.students?.name}</TableCell>
                      <TableCell>{result.students?.email}</TableCell>
                      <TableCell>
                        {format(new Date(result.start_time), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {result.end_time
                          ? format(new Date(result.end_time), 'dd MMM yyyy HH:mm')
                          : 'In Progress'}
                      </TableCell>
                      <TableCell>
                        {duration ? `${duration} minutes` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {result.score !== null ? `${result.score}%` : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
