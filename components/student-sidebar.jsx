'use client'

import { Home, BookOpen, GraduationCap, FolderKanban, LogOut } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from '@/components/ui/sidebar'

export function StudentSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

  const navigation = [
    {
      name: 'Home',
      href: '/dashboard',
      icon: Home,
    },
    {
      name: 'Learning Resources',
      href: '/dashboard/learning',
      icon: BookOpen,
    },
    {
      name: 'Quiz',
      href: '/dashboard/quiz',
      icon: GraduationCap,
    },
    {
      name: 'Projects',
      href: '/dashboard/projects',
      icon: FolderKanban,
    },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Sidebar defaultOpen aria-label="Main Navigation" className="bg-white dark:bg-gray-950 border-r">
      <SidebarHeader className="border-b p-4 bg-white dark:bg-gray-950">
        <h1 className="text-lg font-semibold">Student Dashboard</h1>
      </SidebarHeader>
      <SidebarContent className="p-4 bg-white dark:bg-gray-950">
        <div className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Button
                key={item.href}
                variant={isActive ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => router.push(item.href)}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Button>
            )
          })}
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t p-4 bg-white dark:bg-gray-950">
        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="w-full justify-start gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
