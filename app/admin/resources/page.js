'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, MoreVertical, Pencil, Trash2 } from 'lucide-react'

const tracks = [
  'Web Development',
  'Android Development',
  'IoT',
  'UI/UX',
  'DevOps',
  'Quality Assurance',
]

function getRawUrl(githubUrl) {
  try {
    const url = new URL(githubUrl)
    if (url.hostname !== 'github.com' || !githubUrl.endsWith('.md')) {
      throw new Error('Invalid GitHub URL. Must be a GitHub URL ending with .md')
    }

    const path = url.pathname
    const [, owner, repo, ...rest] = path.split('/')
    const branch = rest[1] || 'main'
    const filePath = rest.slice(2).join('/')
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`
  } catch (error) {
    throw new Error('Invalid GitHub URL format')
  }
}

export default function ResourcesPage() {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [resources, setResources] = useState([])
  const [selectedResource, setSelectedResource] = useState(null)
  const [selectedTrack, setSelectedTrack] = useState('all')
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const form = useForm({
    defaultValues: {
      title: '',
      content: '',
      track: '',
    },
  })

  const editForm = useForm({
    defaultValues: {
      title: '',
      content: '',
      track: '',
    },
  })

  const fetchResources = useCallback(async () => {
    let query = supabase
      .from('learning_resources')
      .select(`
        *,
        tracks (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (selectedTrack && selectedTrack !== 'all') {
      const { data: trackData } = await supabase
        .from('tracks')
        .select('id')
        .eq('name', selectedTrack)
        .single()

      if (trackData) {
        query = query.eq('track_id', trackData.id)
      }
    }

    const { data, error } = await query

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch resources',
        variant: 'destructive',
      })
      return
    }

    const resourcesWithRawUrls = data.map(resource => ({
      ...resource,
      raw_url: getRawUrl(resource.content)
    }))

    setResources(resourcesWithRawUrls)
  }, [supabase, toast, selectedTrack])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  const showToast = useCallback((title, description, variant = 'default') => {
    setTimeout(() => {
      toast({
        title,
        description,
        variant,
      })
    }, 100)
  }, [toast])

  const onSubmit = async (data) => {
    try {
      getRawUrl(data.content)

      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .select('id')
        .eq('name', data.track)
        .single()

      if (trackError) throw trackError

      const { error } = await supabase.from('learning_resources').insert({
        title: data.title,
        content: data.content,
        track_id: trackData.id,
      })

      if (error) throw error

      setOpen(false)
      form.reset()
      await fetchResources()
      showToast('Success', 'Learning resource has been created')
    } catch (error) {
      showToast('Error', error.message || 'Something went wrong. Please try again.', 'destructive')
    }
  }

  const onEdit = async (data) => {
    try {
      getRawUrl(data.content)

      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .select('id')
        .eq('name', data.track)
        .single()

      if (trackError) throw trackError

      const { error } = await supabase
        .from('learning_resources')
        .update({
          title: data.title,
          content: data.content,
          track_id: trackData.id,
        })
        .eq('id', selectedResource.id)

      if (error) throw error

      setEditOpen(false)
      editForm.reset()
      setSelectedResource(null)
      await fetchResources()
      showToast('Success', 'Learning resource has been updated')
    } catch (error) {
      showToast('Error', error.message || 'Something went wrong. Please try again.', 'destructive')
    }
  }

  const handleDelete = async (resourceId) => {
    try {
      const { error } = await supabase
        .from('learning_resources')
        .delete()
        .eq('id', resourceId)

      if (error) throw error

      await fetchResources()
      showToast('Success', 'Learning resource has been deleted')
    } catch (error) {
      showToast('Error', 'Failed to delete resource', 'destructive')
    }
  }

  const handleEditClick = (resource) => {
    setSelectedResource(resource)
    editForm.reset({
      title: resource.title,
      content: resource.content,
      track: resource.tracks.name,
    })
    setEditOpen(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Learning Resources</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Learning Resource</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Learning Resource</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter resource title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Github URL (.md file)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Github URL for .md file" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="track"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Track</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a track" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tracks.map((track) => (
                            <SelectItem key={track} value={track}>
                              {track}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Create Learning Resource
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <p className="text-muted-foreground">Filter by Track:</p>
        <Select
          value={selectedTrack}
          onValueChange={setSelectedTrack}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Tracks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tracks</SelectItem>
            {tracks.map((track) => (
              <SelectItem key={track} value={track}>
                {track}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-muted-foreground mb-6">
        Manage learning materials and resources.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <Card key={resource.id}>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">{resource.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {resource.content}
              </p>
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {resource.tracks.name}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(`/resources/${resource.id}`, '_blank')
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Content
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEditClick(resource)}
                        className="cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(resource.id)}
                        className="cursor-pointer text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
