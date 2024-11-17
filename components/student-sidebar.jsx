'use client'

import Link from 'next/link'
import { Home, Book, PenTool, FolderGit2, LogOut } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
} from '@/components/ui/sidebar'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}
