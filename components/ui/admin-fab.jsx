'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Home,
  Menu,
  X,
  FolderKanban,
  Users,
  FileText,
  LogOut
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function AdminFab() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    {
      icon: Home,
      href: '/admin',
      label: 'Dashboard',
    },
    {
      icon: Users,
      href: '/admin/users',
      label: 'Users',
    },
    {
      icon: FileText,
      href: '/admin/resources',
      label: 'Resources',
    },
    {
      icon: BookOpen,
      href: '/admin/quiz',
      label: 'Quiz',
    },
    {
      icon: FolderKanban,
      href: '/admin/projects',
      label: 'Projects',
    },
    {
      icon: LogOut,
      onClick: handleLogout,
      label: 'Logout',
      className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
    },
  ]

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden">
      <div className="relative">
        {/* Menu Items */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-2">
            {menuItems.map((item) => {
              const isActive = item.href && pathname === item.href
              
              if (item.onClick) {
                return (
                  <Button
                    key={item.label}
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
                      item.className
                    )}
                    onClick={item.onClick}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="sr-only">{item.label}</span>
                  </Button>
                )
              }

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
                    isActive 
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-white hover:bg-primary/10 dark:bg-gray-800 dark:hover:bg-gray-700"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className={cn(
                      "h-6 w-6",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )} />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </Button>
              )
            })}
          </div>
        )}

        {/* Toggle Button */}
        <Button
          variant="default"
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>
    </div>
  )
} 