'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Upload, Check, Clock, AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

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
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array(count).fill(0).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [projectCount, setProjectCount] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [submissions, setSubmissions] = useState([])
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'submitted', 'expired'
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
            // Get projects for student's track
            const { data: projects } = await supabase
              .from('projects')
              .select('*')
              .eq('track_id', student.track_id)
              .order('deadline', { ascending: true })

            // Get submissions for this student
            const { data: submissions } = await supabase
              .from('student_projects')
              .select('*')
              .eq('student_id', student.id)

            if (!projects || !submissions) {
              toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load projects or submissions'
              })
              return
            }

            setProjects(projects || [])
            setSubmissions(submissions || [])
            setProjectCount(projects.length)
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load data'
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase, toast])

  const handleFileUpload = async (projectId, file) => {
    try {
      setUploading(true)

      // Check file type
      if (!file.name.toLowerCase().endsWith('.zip') && !file.name.toLowerCase().endsWith('.rar')) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload a ZIP or RAR file'
        })
        return
      }

      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Maximum file size is 50MB'
        })
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)

      const response = await fetch('/api/projects/submit', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      // Update submissions list
      setSubmissions(prev => [...prev, { project_id: projectId }])

      toast({
        title: 'Success',
        description: 'Project submitted successfully'
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to submit project'
      })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    if (isInitialLoad) {
      return null
    }
    return <LoadingState count={projectCount} />
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

  const filteredProjects = projects.filter(project => {
    const submission = submissions.find(s => s.project_id === project.id)
    const isSubmitted = !!submission
    const isExpired = new Date(project.deadline) < new Date()

    switch (filter) {
      case 'pending':
        return !isSubmitted && !isExpired
      case 'submitted':
        return isSubmitted
      case 'expired':
        return !isSubmitted && isExpired
      default:
        return true
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projects</h1>
        <div className="flex items-center gap-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Filter</SelectLabel>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No projects available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const submission = submissions.find(s => s.project_id === project.id)
            const isSubmitted = !!submission
            const isExpired = new Date(project.deadline) < new Date()
            let status = 'pending'
            if (isSubmitted) status = 'submitted'
            else if (isExpired) status = 'expired'

            return (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">{project.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {status === 'submitted' && (
                      <Badge variant="success" className="w-fit">
                        <Check className="w-4 h-4 mr-1" />
                        Submitted
                      </Badge>
                    )}
                    {status === 'expired' && (
                      <Badge variant="destructive" className="w-fit">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Expired
                      </Badge>
                    )}
                    {status === 'pending' && (
                      <Badge variant="secondary" className="w-fit">
                        <Clock className="w-4 h-4 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {project.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Deadline: {format(new Date(project.deadline), 'PPP')}
                  </p>
                </CardContent>
                <CardFooter className="mt-auto">
                  {!isSubmitted && !isExpired && (
                    <div className="w-full">
                      <Input
                        type="file"
                        accept=".zip,.rar"
                        onChange={(e) => handleFileUpload(project.id, e.target.files[0])}
                        disabled={uploading}
                        className="mb-2"
                      />
                      <Button
                        className="w-full"
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <Upload className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Project
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
