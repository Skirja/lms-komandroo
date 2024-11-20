'use client'

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

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

      {/* Resources Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array(count).fill(0).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-24 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
            <CardFooter className="mt-auto">
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function LearningResourcesPage() {
  const [resources, setResources] = useState([])
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resourceCount, setResourceCount] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadData() {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Data mulai diambil, set isInitialLoad false
        setIsInitialLoad(false)

        // Get student data
        const { data: userData } = await supabase
          .from('users')
          .select('student_id')
          .eq('id', session.user.id)
          .single()

        if (userData) {
          // Get student and track info
          const { data: student } = await supabase
            .from('students')
            .select('*, tracks(name)')
            .eq('id', userData.student_id)
            .single()

          setStudent(student)

          if (student) {
            // First get all resources for the track
            const { data: resources } = await supabase
              .from('learning_resources')
              .select('*, tracks(name)')
              .eq('track_id', student.track_id)

            // Update resource count for skeleton
            setResourceCount(resources?.length || 0)

            // Then get student progress separately
            const { data: progress } = await supabase
              .from('student_progress')
              .select('*')
              .eq('student_id', session.user.id)

            // Combine resources with progress
            const resourcesWithProgress = resources.map(resource => ({
              ...resource,
              progress: progress?.find(p => p.resource_id === resource.id) || { completed: false }
            }))

            setResources(resourcesWithProgress)
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
    // Jika masih initial load, tampilkan halaman kosong
    if (isInitialLoad) {
      return null
    }
    // Setelah data mulai diambil, tampilkan loading state (spinner atau skeleton)
    return <LoadingState count={resourceCount} />
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
        <h1 className="text-3xl font-bold">Learning Resources</h1>
      </div>

      {resources.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No learning resources available yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{resource.title}</CardTitle>
                <Badge 
                  variant={resource.progress.completed ? "success" : "secondary"} 
                  className="w-fit"
                >
                  {resource.progress.completed ? "Completed" : "Not Started"}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Track: {resource.tracks?.name}
                </p>
              </CardContent>
              <CardFooter className="mt-auto">
                <Link href={`/dashboard/learning/${resource.id}`} className="w-full">
                  <Button className="w-full">
                    {resource.progress.completed ? "Review Content" : "Start Learning"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
