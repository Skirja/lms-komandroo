'use client'

import { Users, BookOpen, FileQuestion, FolderGit2, Home, LogOut } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const menuItems = [
    {
      title: 'Home',
      icon: Home,
      path: '/admin'
    },
    {
      title: 'Manage Users',
      icon: Users,
      path: '/admin/users'
    },
    {
      title: 'Learning Resources',
      icon: BookOpen,
      path: '/admin/resources'
    },
    {
      title: 'Manage Quiz',
      icon: FileQuestion,
      path: '/admin/quiz'
    },
    {
      title: 'Manage Projects',
      icon: FolderGit2,
      path: '/admin/projects'
    }
  ]

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <h2 className="text-lg font-semibold">Admin Dashboard</h2>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              variant={pathname === item.path ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => router.push(item.path)}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Button>
          ))}
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <Button
          variant="destructive"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
