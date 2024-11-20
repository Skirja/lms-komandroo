'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import { getRawUrl, processMarkdownImages } from '@/lib/utils'

export default function LearningResourcePage({ params }) {
  const [resource, setResource] = useState(null)
  const [progress, setProgress] = useState(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadData() {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Get resource data
        const { data: resource } = await supabase
          .from('learning_resources')
          .select('*, tracks(name)')
          .eq('id', params.id)
          .single()

        if (resource) {
          setResource(resource)

          // Get progress data
          const { data: progress } = await supabase
            .from('student_progress')
            .select('*')
            .eq('student_id', session.user.id)
            .eq('resource_id', resource.id)
            .single()

          setProgress(progress)

          // Fetch and process markdown content
          const rawUrl = getRawUrl(resource.content)
          const response = await fetch(rawUrl)
          if (!response.ok) {
            throw new Error('Failed to fetch markdown content')
          }
          
          const markdown = await response.text()
          const processedMarkdown = processMarkdownImages(markdown, resource.content)

          const result = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkRehype, { 
              allowDangerousHtml: true,
            })
            .use(rehypeSlug)
            .use(rehypeStringify, { allowDangerousHtml: true })
            .process(processedMarkdown)

          setContent(result.toString())
        }
      } catch (error) {
        console.error('Error loading resource:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase, params.id])

  // Handle smooth scrolling for anchor links
  useEffect(() => {
    const handleHashClick = (e) => {
      const target = e.target.closest('a')
      if (!target) return
      
      const href = target.getAttribute('href')
      if (!href?.startsWith('#')) return

      e.preventDefault()
      const id = href.slice(1)
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }

    document.addEventListener('click', handleHashClick)
    return () => document.removeEventListener('click', handleHashClick)
  }, [])

  const handleMarkComplete = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      if (progress) {
        // Update existing progress
        const { error } = await supabase
          .from('student_progress')
          .update({
            completed: !progress.completed,
            completed_at: !progress.completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('student_id', session.user.id)
          .eq('resource_id', params.id)

        if (error) {
          console.error('Error updating progress:', error)
          return
        }

        setProgress(prev => ({
          ...prev,
          completed: !prev.completed,
          completed_at: !prev.completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }))
      } else {
        // Create new progress entry
        const { data, error } = await supabase
          .from('student_progress')
          .upsert({
            student_id: session.user.id,
            resource_id: parseInt(params.id),
            completed: true,
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating progress:', error)
          return
        }

        setProgress(data)
      }
    } catch (error) {
      console.error('Error handling progress:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!resource) {
    return (
      <Card>
        <div className="p-6">
          <p className="text-center text-muted-foreground">
            Resource not found
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{resource.title}</h1>
          <p className="text-muted-foreground">Track: {resource.tracks?.name}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Badge 
            variant={progress?.completed ? "success" : "secondary"}
            className="text-sm"
          >
            {progress?.completed ? "Completed" : "Not Started"}
          </Badge>
          <Button onClick={handleMarkComplete}>
            {progress?.completed ? "Mark as Incomplete" : "Mark as Complete"}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="prose dark:prose-invert max-w-none p-4 md:p-6">
          {content ? (
            <div 
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: content }} 
            />
          ) : (
            <p className="text-center text-muted-foreground">No content available</p>
          )}
        </div>
      </Card>
    </div>
  )
}
