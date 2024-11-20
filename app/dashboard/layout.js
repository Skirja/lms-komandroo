'use client'

import { SidebarProvider } from '@/components/ui/sidebar'
import { StudentSidebar } from '@/components/student-sidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'

function DashboardContent({ children }) {
  const { toggleSidebar } = useSidebar()

  return (
    <div className="flex h-screen w-full">
      <StudentSidebar />
      <main className="flex-1 w-full">
        <div className="p-6 w-full">
          {children}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 rounded-full shadow-lg md:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  )
}
