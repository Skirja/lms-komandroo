import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getBaseUrl(githubUrl) {
  try {
    const url = new URL(githubUrl)
    if (url.hostname !== 'github.com') return null

    const [, owner, repo, , branch, ...pathParts] = url.pathname.split('/')
    const filePath = pathParts.join('/')
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'))
    
    return {
      owner,
      repo,
      branch,
      dirPath,
      rawBaseUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${dirPath}`
    }
  } catch (error) {
    return null
  }
}

export function convertImageUrls(markdown, githubUrl) {
  const baseUrlInfo = getBaseUrl(githubUrl)
  if (!baseUrlInfo) return markdown

  let processedMarkdown = markdown

  // Convert markdown image syntax
  processedMarkdown = processedMarkdown.replace(
    /!\[([^\]]*)\]\((?:\.\/)?([^)]+)\)/g,
    (match, altText, imagePath) => {
      if (imagePath.startsWith('http')) return match
      const cleanPath = imagePath.replace(/^\.\//, '')
      const absoluteUrl = `${baseUrlInfo.rawBaseUrl}/${cleanPath}`
      return `![${altText}](${absoluteUrl})`
    }
  )

  // Convert HTML img tags
  processedMarkdown = processedMarkdown.replace(
    /<img\s+[^>]*src=["'](?:\.\/)?([^"']+)["'][^>]*>/g,
    (match, imagePath) => {
      if (imagePath.startsWith('http')) return match
      const cleanPath = imagePath.replace(/^\.\//, '')
      const absoluteUrl = `${baseUrlInfo.rawBaseUrl}/${cleanPath}`
      return match.replace(imagePath, absoluteUrl)
    }
  )

  return processedMarkdown
}

export function getRawUrl(url) {
  try {
    const githubUrl = new URL(url)
    if (githubUrl.hostname === 'github.com') {
      const path = githubUrl.pathname.replace('/blob/', '/')
      return `https://raw.githubusercontent.com${path}`
    }
    return url
  } catch (error) {
    return url
  }
}

export function processMarkdownImages(markdown, githubUrl) {
  return convertImageUrls(markdown, githubUrl)
}
