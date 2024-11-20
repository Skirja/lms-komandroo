'use client'

import { useEffect, useState } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { getRawUrl, processMarkdownImages } from '@/lib/utils'

export default function ResourcePage({ params }) {
  const [content, setContent] = useState('')
  const [resource, setResource] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchResource() {
      try {
        const { data, error } = await supabase
          .from('learning_resources')
          .select(`
            *,
            tracks (
              name
            )
          `)
          .eq('id', params.id)
          .single()

        if (error) throw error
        setResource(data)
        
        const rawUrl = getRawUrl(data.content)
        const response = await fetch(rawUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch markdown content')
        }
        
        const markdown = await response.text()
        const processedMarkdown = processMarkdownImages(markdown, data.content)

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
        setLoading(false)
      } catch (error) {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchResource()
    }
  }, [params.id, supabase])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Card>
        <CardContent className="prose dark:prose-invert max-w-none p-6">
          {content ? (
            <div 
              dangerouslySetInnerHTML={{ __html: content }} 
              className="
                [&_img]:rounded-lg 
                [&_img]:shadow-lg 
                [&_img]:mx-auto 
                [&_img]:max-w-full 
                [&_img]:h-auto 
                [&_img]:my-4
                [&_a]:cursor-pointer 
                [&_a]:text-primary 
                hover:[&_a]:text-primary/80
              "
            />
          ) : (
            <p className="text-muted-foreground">No content available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
