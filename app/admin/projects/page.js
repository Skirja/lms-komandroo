'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Plus, Pencil, Trash2, Download, Search, Calendar, Users } from 'lucide-react'
import { format } from 'date-fns'
import { AdminFab } from '@/components/ui/admin-fab'

const TRACKS = [
  'Web Development',
  'Android Development',
  'IoT',
  'UI/UX',
  'DevOps',
  'Quality Assurance'
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deleteProject, setDeleteProject] = useState(null)
  const [selectedTrack, setSelectedTrack] = useState('all')
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    track: ''
  })

  const fetchProjects = useCallback(async () => {
    try {
      const query = supabase
        .from('projects')
        .select(`
          *,
          tracks (
            name
          ),
          student_projects (
            id,
            file_path,
            submitted_at,
            students (
              name,
              email
            )
          )
        `)
        .order('deadline', { ascending: true })

      if (selectedTrack && selectedTrack !== 'all') {
        const { data: trackData } = await supabase
          .from('tracks')
          .select('id')
          .eq('name', selectedTrack)
          .single()

        if (trackData) {
          query.eq('track_id', trackData.id)
        }
      }

      const { data, error } = await query

      if (error) throw error

      setProjects(data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch projects'
      })
    }
  }, [selectedTrack, supabase, toast])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Get track id
      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .select('id')
        .eq('name', formData.track)
        .single()

      if (trackError) throw trackError

      const projectData = {
        title: formData.title,
        description: formData.description,
        deadline: new Date(formData.deadline).toISOString(),
        track_id: trackData.id
      }

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Project updated successfully'
        })
      } else {
        const { error } = await supabase
          .from('projects')
          .insert(projectData)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Project created successfully'
        })
      }

      setIsOpen(false)
      setEditingProject(null)
      resetForm()
      fetchProjects()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (project) => {
    setEditingProject(project)
    setFormData({
      title: project.title,
      description: project.description,
      deadline: format(new Date(project.deadline), 'yyyy-MM-dd'),
      track: project.tracks.name
    })
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteProject) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deleteProject.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Project deleted successfully'
      })

      setDeleteProject(null)
      fetchProjects()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      })
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      deadline: '',
      track: ''
    })
  }

  const handleDownload = async (filePath) => {
    try {
      const actualPath = filePath.includes('projekUpload/')
        ? filePath.split('projekUpload/')[1]
        : filePath

      const { data, error } = await supabase.storage
        .from('projekUpload')
        .download(actualPath)

      if (error) throw error

      // Create a download link
      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = actualPath.split('/').pop() // Get the file name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download file'
      })
    }
  }

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Manage Projects</h1>
            <p className="text-muted-foreground">Create and manage projects for students</p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedTrack} onValueChange={setSelectedTrack}>
              <SelectTrigger className="w-[180px]">
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
            <Button onClick={() => { setIsOpen(true); setEditingProject(null); resetForm(); }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <p>Loading projects...</p>
          ) : projects.length === 0 ? (
            <p>No projects found.</p>
          ) : (
            projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{project.tracks?.name}</p>
                    </div>
                    <Badge variant={new Date(project.deadline) > new Date() ? "default" : "destructive"}>
                      {new Date(project.deadline) > new Date() ? "Active" : "Expired"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Due: {format(new Date(project.deadline), 'PPP')}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-2 h-4 w-4" />
                      {project.student_projects?.length || 0} submissions
                    </div>
                    {project.student_projects?.length > 0 && (
                      <div className="mt-4 space-y-2 border-t pt-2">
                        <p className="text-sm font-medium">Submissions:</p>
                        <div className="max-h-[120px] overflow-y-auto pr-2 space-y-2">
                          {project.student_projects.map((submission) => (
                            <div key={submission.id} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{submission.students.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(submission.file_path)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(project)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteProject(project)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter project title"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter project description"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Track</label>
                  <Select
                    value={formData.track}
                    onValueChange={(value) => setFormData({ ...formData, track: value })}
                    required
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
                <div>
                  <label className="text-sm font-medium">Deadline</label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteProject} onOpenChange={(open) => !open && setDeleteProject(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteProject?.title}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <AdminFab />
      <Toaster />
    </>
  )
}
