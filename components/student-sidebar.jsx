'use client'

import Link from 'next/link'
import { Home, Book, PenTool, FolderGit2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
} from '@/components/ui/sidebar'

const navigation = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: Home
  },
  {
    name: 'Learning Resources',
    href: '/dashboard/learning',
    icon: Book
  },
  {
    name: 'Latihan',
    href: '/dashboard/quiz',
    icon: PenTool
  },
  {
    name: 'Projects',
    href: '/dashboard/projects',
    icon: FolderGit2
  }
]

export function StudentSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar defaultOpen>
      <SidebarContent>
        <div className="flex flex-col gap-4">
          <div className="flex h-[60px] items-center px-6">
            <h2 className="text-lg font-semibold">Student Dashboard</h2>
          </div>
          <SidebarGroup>
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                    isActive ? "bg-accent" : "transparent",
                    "mx-2"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </SidebarGroup>
        </div>
      </SidebarContent>
      <SidebarFooter className="py-4">
        <p className="px-4 text-xs text-gray-500">
          2024 Komandro LMS
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
