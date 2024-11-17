'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Plus, Pencil, Trash2, Download, Search } from 'lucide-react'
import { format } from 'date-fns'

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
      const { data, error } = await supabase.storage
        .from('project-submissions')
        .download(filePath)

      if (error) throw error

      // Create a download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = filePath.split('/').pop() // Get filename from path
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download file'
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Projects</h1>

        <div className="flex gap-4 items-center">
          <Select
            value={selectedTrack}
            onValueChange={setSelectedTrack}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by track" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tracks</SelectLabel>
                <SelectItem value="all">All Tracks</SelectItem>
                {TRACKS.map((track) => (
                  <SelectItem key={track} value={track}>
                    {track}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? 'Edit Project' : 'Create New Project'}
                </DialogTitle>
                <DialogDescription>
                  {editingProject
                    ? 'Edit the project details below'
                    : 'Add a new project for students'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label>Title</label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label>Description</label>
                  <Textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label>Deadline</label>
                  <Input
                    required
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label>Track</label>
                  <Select
                    required
                    value={formData.track}
                    onValueChange={(value) => setFormData({ ...formData, track: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a track" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Tracks</SelectLabel>
                        {TRACKS.map((track) => (
                          <SelectItem key={track} value={track}>
                            {track}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Title</TableHead>
              <TableHead className="w-[300px]">Description</TableHead>
              <TableHead>Track</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.title}</TableCell>
                  <TableCell>{project.description}</TableCell>
                  <TableCell>{project.tracks?.name}</TableCell>
                  <TableCell>{format(new Date(project.deadline), 'PP')}</TableCell>
                  <TableCell>
                    {project.student_projects?.length > 0 ? (
                      <div className="space-y-2">
                        {project.student_projects.map((submission) => (
                          <div key={submission.id} className="flex items-center gap-2">
                            <span>{submission.students.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(submission.file_path)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      'No submissions yet'
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(project)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteProject(project)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProject} onOpenChange={() => setDeleteProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <span className="font-semibold">{deleteProject?.title}</span> and all its submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  )
}
