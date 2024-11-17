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

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
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
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'submitted', 'expired'
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }

        // Get student data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('student_id')
          .eq('id', session.user.id)
          .single()

        if (userError || !userData?.student_id) {
          setLoading(false)
          return
        }

        // Get student details with track
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*, tracks(name)')
          .eq('id', userData.student_id)
          .single()

        if (studentError) {
          setLoading(false)
          return
        }

        setStudent(student)

        // Load projects for student's track
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('track_id', student.track_id)
          .order('deadline', { ascending: true })

        if (projectsError) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load projects'
          })
          return
        }

        // Load student's submissions
        const { data: submissions, error: submissionsError } = await supabase
          .from('student_projects')
          .select('*')
          .eq('student_id', student.id)

        if (submissionsError) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load submissions'
          })
          return
        }

        setProjects(projects || [])
        setSubmissions(submissions || [])
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
    return <LoadingState />
  }

  if (!student) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-600">
            Please log in as a student to view this page.
          </p>
        </CardContent>
      </Card>
    )
  }

  const filteredProjects = projects.filter(project => {
    const isSubmitted = submissions.some(s => s.project_id === project.id)
    const isExpired = new Date(project.deadline) < new Date()

    switch (filter) {
      case 'submitted':
        return isSubmitted
      case 'pending':
        return !isSubmitted && !isExpired
      case 'expired':
        return !isSubmitted && isExpired
      default:
        return true
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-gray-600">Track: {student.tracks?.name}</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Status</SelectLabel>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-600">
              No projects found for the selected filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const isSubmitted = submissions.some(s => s.project_id === project.id)
            const isExpired = new Date(project.deadline) < new Date()
            const daysLeft = Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24))

            return (
              <Card key={project.id} className={`relative ${isExpired ? 'opacity-75' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{project.title}</CardTitle>
                    {isSubmitted ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                        Submitted
                      </span>
                    ) : isExpired ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                        Expired
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full">
                        {daysLeft} days left
                      </span>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-1" />
                    Deadline: {format(new Date(project.deadline), 'PPP')}
                  </div>
                </CardContent>
                <CardFooter>
                  {isSubmitted ? (
                    <Button className="w-full" variant="outline" disabled>
                      <Check className="w-4 h-4 mr-2" />
                      Submitted
                    </Button>
                  ) : isExpired ? (
                    <Button className="w-full" variant="destructive" disabled>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Expired
                    </Button>
                  ) : (
                    <div className="w-full">
                      <Input
                        type="file"
                        accept=".zip,.rar"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(project.id, e.target.files[0])
                          }
                        }}
                        disabled={uploading}
                        className="hidden"
                        id={`file-${project.id}`}
                      />
                      <Button
                        className="w-full"
                        onClick={() => document.getElementById(`file-${project.id}`).click()}
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Project'}
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
